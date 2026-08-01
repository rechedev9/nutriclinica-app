// Command nutriclinica arranca el servidor: resuelve el directorio de datos,
// abre y migra la base de datos, sirve el SPA embebido y abre el navegador.
package main

import (
	"context"
	"flag"
	"fmt"
	"io/fs"
	"log"
	"net"
	"net/http"
	"os"
	"os/exec"
	"os/signal"
	"path/filepath"
	"runtime"
	"strings"
	"syscall"
	"time"

	"nutriclinica/internal/auth"
	"nutriclinica/internal/backup"
	"nutriclinica/internal/config"
	"nutriclinica/internal/server"
	"nutriclinica/internal/store"
	"nutriclinica/web"
)

func main() {
	dataDir := flag.String("data-dir", "", "Directorio de datos (bbdd/secret.key y fotos/). Por defecto: junto al ejecutable.")
	host := flag.String("host", "127.0.0.1", "Dirección de escucha. Usa 0.0.0.0 para exponerlo en red (despliegue en servidor/contenedor).")
	port := flag.Int("port", 5001, "Puerto de escucha")
	noBrowser := flag.Bool("no-browser", false, "No abrir el navegador al arrancar")
	https := flag.Bool("https", false, "La app se sirve detrás de HTTPS (proxy inverso o TLS directo): activa la cookie de sesión Secure.")
	flag.Parse()

	paths, err := config.Resolve(*dataDir)
	if err != nil {
		log.Fatalf("resolviendo rutas de datos: %v", err)
	}
	log.Printf("Directorio de datos: %s", paths.DataDir)

	pgCfg, err := config.PostgresFromEnv()
	if err != nil {
		log.Fatalf("configuración de PostgreSQL: %v", err)
	}
	log.Printf("BBDD: PostgreSQL en %s:%d/%s", pgCfg.Host, pgCfg.Port, pgCfg.DBName)

	sessions, err := auth.NewManager(paths.SecretKey, *https)
	if err != nil {
		log.Fatalf("inicializando sesiones: %v", err)
	}

	var spa fs.FS
	if sub, err := web.DistFS(); err == nil && web.HasRealBuild() {
		spa = sub
	} else {
		log.Printf("AVISO: SPA no embebido (placeholder). Usa el dev server de Vite o ejecuta el build.")
	}

	// abrir conecta con Postgres y aplica las migraciones pendientes.
	abrir := func() (*store.Store, error) {
		st, err := store.Open(pgCfg)
		if err != nil {
			return nil, err
		}
		if err := st.Migrate(); err != nil {
			st.Close()
			return nil, fmt.Errorf("migrando esquema: %w", err)
		}
		if pendientes, err := st.UsuariosConPasswordPorDefecto(); err != nil {
			log.Printf("AVISO: no se pudo comprobar las contraseñas por defecto: %v", err)
		} else if len(pendientes) > 0 {
			log.Printf("AVISO DE SEGURIDAD: los usuarios %v conservan su contraseña por defecto. "+
				"Cámbiala en la app (sección Usuarios) antes de usar datos reales.", pendientes)
		}
		return st, nil
	}

	srv, err := server.New(server.Config{
		Sessions: sessions,
		FotosDir: paths.FotosDir,
		SPA:      spa,
		Abrir:    abrir,
	})
	if err != nil {
		log.Fatalf("abriendo base de datos: %v", err)
	}
	defer srv.Close()

	// Ctx de vida de la app: se cancela al recibir Ctrl+C / SIGTERM. Se crea
	// aquí (antes de arrancar el servidor HTTP) para que también gobierne
	// tareas de fondo como el backup a S3.
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	if cfg, ok := backup.DesdeEntorno(); ok {
		cfg.EstadoPath = filepath.Join(paths.DataDir, "bbdd", ".s3backup-estado.json")
		log.Printf("Backup automático a S3 activado: s3://%s/%s cada %s (solo sube lo que cambie)", cfg.Bucket, cfg.Prefijo, cfg.Intervalo)
		backup.Iniciar(ctx, cfg, paths.FotosDir)
	}

	ln, addr := listen(*host, *port)
	url := "http://" + addr
	fmt.Printf("\n  NutriClínica corriendo en %s\n\n", url)

	if !*noBrowser {
		// Si escucha en todas las interfaces (0.0.0.0), abrir el navegador
		// local contra 127.0.0.1, no contra 0.0.0.0.
		browserURL := url
		if *host == "0.0.0.0" {
			browserURL = fmt.Sprintf("http://127.0.0.1:%s", addr[strings.LastIndex(addr, ":")+1:])
		}
		go func() {
			time.Sleep(600 * time.Millisecond)
			openBrowser(browserURL)
		}()
	}

	httpSrv := &http.Server{Handler: srv.Handler()}
	go func() {
		if err := httpSrv.Serve(ln); err != nil && err != http.ErrServerClosed {
			log.Fatalf("servidor: %v", err)
		}
	}()

	// Esperar Ctrl+C / SIGTERM y cerrar de forma ordenada: primero el servidor
	// HTTP (deja de aceptar conexiones), luego la BD.
	<-ctx.Done()
	log.Println("Cerrando NutriClínica...")
	shutdownCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := httpSrv.Shutdown(shutdownCtx); err != nil {
		log.Printf("cierre del servidor: %v", err)
	}
}

// listen intenta el puerto dado en host; si está ocupado, usa uno libre en
// ese mismo host.
func listen(host string, port int) (net.Listener, string) {
	addr := fmt.Sprintf("%s:%d", host, port)
	ln, err := net.Listen("tcp", addr)
	if err != nil {
		log.Printf("Puerto %d ocupado, usando uno libre...", port)
		ln, err = net.Listen("tcp", fmt.Sprintf("%s:0", host))
		if err != nil {
			log.Fatalf("no se pudo abrir ningún puerto: %v", err)
		}
	}
	return ln, ln.Addr().String()
}

// openBrowser abre la URL en el navegador por defecto (multiplataforma).
func openBrowser(url string) {
	var cmd *exec.Cmd
	switch runtime.GOOS {
	case "windows":
		cmd = exec.Command("cmd", "/c", "start", "", url)
	case "darwin":
		cmd = exec.Command("open", url)
	default:
		cmd = exec.Command("xdg-open", url)
	}
	if err := cmd.Start(); err != nil {
		log.Printf("no se pudo abrir el navegador: %v", err)
	}
}
