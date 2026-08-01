// Package backup sube periódicamente una copia de seguridad de la base de
// datos (y de las fotos) a un bucket S3, para que quede una copia fuera del
// equipo del cliente. Es opcional y está apagado por defecto: solo se activa
// si la variable de entorno NUTRICLINICA_S3_BUCKET está definida.
//
// Las credenciales de AWS NO se gestionan aquí: se toman de la cadena
// estándar del SDK (variables AWS_ACCESS_KEY_ID/AWS_SECRET_ACCESS_KEY, un
// perfil en ~/.aws/credentials, etc.). Usa un usuario IAM restringido a
// s3:PutObject sobre el bucket/prefijo de destino: si esas credenciales se
// extraen del equipo del cliente, el daño posible queda limitado a poder
// subir archivos ahí, nunca leer, listar ni borrar nada.
package backup

import (
	"archive/zip"
	"bytes"
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"os"
	"os/exec"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	awsconfig "github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/s3"

	"nutriclinica/internal/store"
)

// Config agrupa los parámetros de la subida periódica a S3.
type Config struct {
	Bucket     string        // bucket S3 destino
	Region     string        // región AWS
	Prefijo    string        // prefijo/carpeta dentro del bucket (opcional)
	Intervalo  time.Duration // cada cuánto se comprueba si hay que subir
	EstadoPath string        // fichero local donde se recuerda el hash de la última subida
}

// DesdeEntorno lee la configuración de variables de entorno. El segundo valor
// es false si la subida a S3 no está activada (no hay bucket configurado).
// EstadoPath no se resuelve aquí (depende del directorio de datos, que
// decide main): lo debe rellenar la persona que llama antes de usar Iniciar.
//
//   - NUTRICLINICA_S3_BUCKET (obligatoria para activar la función)
//   - NUTRICLINICA_S3_REGION
//   - NUTRICLINICA_S3_PREFIJO (opcional, p.ej. el nombre del cliente)
//   - NUTRICLINICA_S3_INTERVALO_MIN (minutos entre comprobaciones, por defecto 30)
func DesdeEntorno() (Config, bool) {
	bucket := os.Getenv("NUTRICLINICA_S3_BUCKET")
	if bucket == "" {
		return Config{}, false
	}
	intervalo := 30 * time.Minute
	if v := os.Getenv("NUTRICLINICA_S3_INTERVALO_MIN"); v != "" {
		if n, err := strconv.Atoi(v); err == nil && n > 0 {
			intervalo = time.Duration(n) * time.Minute
		}
	}
	return Config{
		Bucket:    bucket,
		Region:    os.Getenv("NUTRICLINICA_S3_REGION"),
		Prefijo:   strings.Trim(os.Getenv("NUTRICLINICA_S3_PREFIJO"), "/"),
		Intervalo: intervalo,
	}, true
}

// Iniciar arranca en segundo plano la comprobación periódica y vuelve
// inmediatamente. pg son los parámetros de conexión a la BBDD PostgreSQL
// (para invocar pg_dump); fotosDir es la carpeta de fotos. Se detiene cuando
// ctx se cancela.
//
// En cada tick solo se sube a S3 lo que haya cambiado de verdad desde la
// última subida (se compara por hash con EstadoPath): si el cliente no ha
// tocado la app, el tick no genera ninguna llamada a AWS ni gasto asociado.
func Iniciar(ctx context.Context, cfg Config, pg store.Config, fotosDir string) {
	go func() {
		t := time.NewTimer(1 * time.Minute)
		defer t.Stop()
		for {
			select {
			case <-ctx.Done():
				return
			case <-t.C:
				if err := subirUnaVez(ctx, cfg, pg, fotosDir); err != nil {
					log.Printf("AVISO: backup a S3 falló: %v", err)
				}
				t.Reset(cfg.Intervalo)
			}
		}
	}()
}

// estado recuerda el hash de lo último subido a S3, para no repetir una
// subida cuando no ha cambiado nada (ahorra peticiones y tráfico).
type estado struct {
	DBSha256    string `json:"db_sha256"`
	FotosSha256 string `json:"fotos_sha256"`
}

// subirUnaVez genera un volcado consistente de la BBDD (pg_dump) y un zip de
// las fotos; solo sube a S3 los que hayan cambiado desde la última vez
// (comparando por hash), sobrescribiendo el objeto anterior.
func subirUnaVez(ctx context.Context, cfg Config, pg store.Config, fotosDir string) error {
	snapshotPath, err := snapshotDB(ctx, pg)
	if err != nil {
		return fmt.Errorf("generando volcado de la BBDD (pg_dump): %w", err)
	}
	defer os.Remove(snapshotPath)

	fotosZipPath, err := zipFotos(fotosDir)
	if err != nil {
		return fmt.Errorf("comprimiendo fotos: %w", err)
	}
	defer os.Remove(fotosZipPath)

	dbHash, err := sha256Fichero(snapshotPath)
	if err != nil {
		return fmt.Errorf("calculando hash de la BBDD: %w", err)
	}
	fotosHash, err := sha256Fichero(fotosZipPath)
	if err != nil {
		return fmt.Errorf("calculando hash de las fotos: %w", err)
	}

	previo := leerEstado(cfg.EstadoPath)
	if dbHash == previo.DBSha256 && fotosHash == previo.FotosSha256 {
		log.Printf("Backup S3: sin cambios desde la última subida, no se sube nada.")
		return nil
	}

	awsCfg, err := awsconfig.LoadDefaultConfig(ctx, awsconfig.WithRegion(cfg.Region))
	if err != nil {
		return fmt.Errorf("cargando credenciales de AWS: %w", err)
	}
	cliente := s3.NewFromConfig(awsCfg)

	if dbHash != previo.DBSha256 {
		if err := subirFichero(ctx, cliente, cfg.Bucket, clave(cfg.Prefijo, "pacientes.dump"), snapshotPath); err != nil {
			return fmt.Errorf("subiendo BBDD: %w", err)
		}
		log.Printf("BBDD subida a s3://%s/%s", cfg.Bucket, clave(cfg.Prefijo, "pacientes.dump"))
	}
	if fotosHash != previo.FotosSha256 {
		if err := subirFichero(ctx, cliente, cfg.Bucket, clave(cfg.Prefijo, "fotos.zip"), fotosZipPath); err != nil {
			return fmt.Errorf("subiendo fotos: %w", err)
		}
		log.Printf("Fotos subidas a s3://%s/%s", cfg.Bucket, clave(cfg.Prefijo, "fotos.zip"))
	}

	if err := guardarEstado(cfg.EstadoPath, estado{DBSha256: dbHash, FotosSha256: fotosHash}); err != nil {
		log.Printf("AVISO: no se pudo guardar el estado del backup (se volverá a subir en el próximo tick): %v", err)
	}
	return nil
}

// snapshotDB crea, en un fichero temporal, un volcado consistente de la BBDD
// vía pg_dump (formato "custom", comprimido). Requiere tener instalado
// pg_dump en el PATH del equipo (basta con las "PostgreSQL Command Line
// Tools", no hace falta el servidor completo). Para restaurar un volcado:
// pg_restore --clean --if-exists -h <host> -U <user> -d <dbname> <fichero>.
// El llamador es responsable de borrar el fichero devuelto.
func snapshotDB(ctx context.Context, pg store.Config) (string, error) {
	tmp, err := os.CreateTemp("", "nutriclinica-*.dump")
	if err != nil {
		return "", err
	}
	path := tmp.Name()
	tmp.Close()

	sslMode := pg.SSLMode
	if sslMode == "" {
		sslMode = "require"
	}
	cmd := exec.CommandContext(ctx, "pg_dump",
		"-h", pg.Host,
		"-p", strconv.Itoa(pg.Port),
		"-U", pg.User,
		"-d", pg.DBName,
		"-Fc",
		"-f", path,
	)
	cmd.Env = append(os.Environ(),
		"PGPASSWORD="+pg.Password,
		"PGSSLMODE="+sslMode,
	)
	var stderr bytes.Buffer
	cmd.Stderr = &stderr
	if err := cmd.Run(); err != nil {
		os.Remove(path)
		return "", fmt.Errorf("pg_dump: %w (%s)", err, strings.TrimSpace(stderr.String()))
	}
	return path, nil
}

// zipFotos comprime fotosDir en un fichero temporal .zip, conservando la
// estructura de carpetas por paciente. El llamador es responsable de borrar
// el fichero devuelto.
func zipFotos(fotosDir string) (string, error) {
	tmp, err := os.CreateTemp("", "nutriclinica-fotos-*.zip")
	if err != nil {
		return "", err
	}
	path := tmp.Name()
	defer tmp.Close()
	if err := zipDir(fotosDir, tmp); err != nil {
		os.Remove(path)
		return "", err
	}
	return path, nil
}

func clave(prefijo, nombre string) string {
	if prefijo == "" {
		return nombre
	}
	return prefijo + "/" + nombre
}

func subirFichero(ctx context.Context, cliente *s3.Client, bucket, key, path string) error {
	f, err := os.Open(path)
	if err != nil {
		return err
	}
	defer f.Close()
	_, err = cliente.PutObject(ctx, &s3.PutObjectInput{
		Bucket: aws.String(bucket),
		Key:    aws.String(key),
		Body:   f,
	})
	return err
}

// zipDir comprime recursivamente el contenido de dir en w, preservando la
// ruta relativa de cada fichero (carpeta del paciente + nombre de la foto).
// Si dir no existe todavía, escribe un zip vacío sin error.
func zipDir(dir string, w io.Writer) error {
	zw := zip.NewWriter(w)
	defer zw.Close()

	if _, err := os.Stat(dir); os.IsNotExist(err) {
		return nil
	}
	return filepath.Walk(dir, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}
		if info.IsDir() {
			return nil
		}
		rel, err := filepath.Rel(dir, path)
		if err != nil {
			return err
		}
		entry, err := zw.Create(filepath.ToSlash(rel))
		if err != nil {
			return err
		}
		src, err := os.Open(path)
		if err != nil {
			return err
		}
		defer src.Close()
		_, err = io.Copy(entry, src)
		return err
	})
}

// sha256Fichero calcula el hash SHA-256 de un fichero, para detectar si su
// contenido ha cambiado respecto a la última subida sin necesidad de
// preguntarle nada a S3 (0 llamadas a AWS, 0 coste, cuando no hay cambios).
func sha256Fichero(path string) (string, error) {
	f, err := os.Open(path)
	if err != nil {
		return "", err
	}
	defer f.Close()
	h := sha256.New()
	if _, err := io.Copy(h, f); err != nil {
		return "", err
	}
	return hex.EncodeToString(h.Sum(nil)), nil
}

func leerEstado(path string) estado {
	var e estado
	if path == "" {
		return e
	}
	data, err := os.ReadFile(path)
	if err != nil {
		return e
	}
	_ = json.Unmarshal(data, &e)
	return e
}

func guardarEstado(path string, e estado) error {
	if path == "" {
		return nil
	}
	data, err := json.Marshal(e)
	if err != nil {
		return err
	}
	if err := os.MkdirAll(filepath.Dir(path), 0o700); err != nil {
		return err
	}
	return os.WriteFile(path, data, 0o600)
}
