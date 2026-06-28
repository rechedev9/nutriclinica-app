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
	"runtime"
	"syscall"
	"time"

	"nutriclinica/internal/auth"
	"nutriclinica/internal/config"
	"nutriclinica/internal/server"
	"nutriclinica/internal/store"
	"nutriclinica/web"
)

func main() {
	dataDir := flag.String("data-dir", "", "Directorio de datos (bbdd/ y fotos/). Por defecto: junto al ejecutable.")
	port := flag.Int("port", 5001, "Puerto de escucha")
	noBrowser := flag.Bool("no-browser", false, "No abrir el navegador al arrancar")
	fixOrphans := flag.Bool("fix-orphans", false, "Limpiar filas huérfanas (hace backup antes)")
	flag.Parse()

	paths, err := config.Resolve(*dataDir)
	if err != nil {
		log.Fatalf("resolviendo rutas de datos: %v", err)
	}
	log.Printf("Directorio de datos: %s", paths.DataDir)

	st, err := store.Open(paths.DBPath)
	if err != nil {
		log.Fatalf("abriendo base de datos: %v", err)
	}
	defer st.Close()

	if err := st.VerifyPragmas(); err != nil {
		log.Fatalf("pragmas SQLite: %v", err)
	}
	if err := st.IntegrityCheck(); err != nil {
		log.Fatalf("integridad de la base de datos: %v", err)
	}
	if err := handleOrphans(st, paths.DBPath, *fixOrphans); err != nil {
		log.Fatalf("comprobación de claves foráneas: %v", err)
	}
	if err := st.Migrate(); err != nil {
		log.Fatalf("migrando esquema: %v", err)
	}
	if pendientes, err := st.UsuariosConPasswordPorDefecto(); err != nil {
		log.Printf("AVISO: no se pudo comprobar las contraseñas por defecto: %v", err)
	} else if len(pendientes) > 0 {
		log.Printf("AVISO DE SEGURIDAD: los usuarios %v conservan su contraseña por defecto. "+
			"Cámbiala en la app (sección Usuarios) antes de usar datos reales.", pendientes)
	}

	sessions, err := auth.NewManager(paths.SecretKey)
	if err != nil {
		log.Fatalf("inicializando sesiones: %v", err)
	}

	var spa fs.FS
	if sub, err := web.DistFS(); err == nil && web.HasRealBuild() {
		spa = sub
	} else {
		log.Printf("AVISO: SPA no embebido (placeholder). Usa el dev server de Vite o ejecuta el build.")
	}

	srv := server.New(st, sessions, paths.FotosDir, spa)

	ln, addr := listen(*port)
	url := "http://" + addr
	fmt.Printf("\n  NutriClínica corriendo en %s\n\n", url)

	if !*noBrowser {
		go func() {
			time.Sleep(600 * time.Millisecond)
			openBrowser(url)
		}()
	}

	httpSrv := &http.Server{Handler: srv.Handler()}
	go func() {
		if err := httpSrv.Serve(ln); err != nil && err != http.ErrServerClosed {
			log.Fatalf("servidor: %v", err)
		}
	}()

	// Esperar Ctrl+C / SIGTERM y cerrar de forma ordenada: primero el servidor
	// HTTP (deja de aceptar conexiones), luego la BD (vacía el WAL).
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()
	<-ctx.Done()
	log.Println("Cerrando NutriClínica...")
	shutdownCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := httpSrv.Shutdown(shutdownCtx); err != nil {
		log.Printf("cierre del servidor: %v", err)
	}
}

// handleOrphans informa de filas huérfanas; con fix=true hace backup y limpia.
func handleOrphans(st *store.Store, dbPath string, fix bool) error {
	orphans, err := st.ForeignKeyCheck()
	if err != nil {
		return err
	}
	if len(orphans) == 0 {
		return nil
	}
	log.Printf("AVISO: %d filas violan claves foráneas (datos heredados con FK OFF):", len(orphans))
	for _, o := range orphans {
		log.Printf("  - %s rowid=%d -> %s (fkid=%d)", o.Table, o.RowID, o.Parent, o.FKID)
	}
	if fix {
		return st.FixOrphans(dbPath)
	}
	log.Printf("Ejecuta con --fix-orphans para limpiarlas (se hará backup antes).")
	return nil
}

// listen intenta el puerto dado en 127.0.0.1; si está ocupado, usa uno libre.
func listen(port int) (net.Listener, string) {
	addr := fmt.Sprintf("127.0.0.1:%d", port)
	ln, err := net.Listen("tcp", addr)
	if err != nil {
		log.Printf("Puerto %d ocupado, usando uno libre...", port)
		ln, err = net.Listen("tcp", "127.0.0.1:0")
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
