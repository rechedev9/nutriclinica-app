// Package config resuelve las rutas de datos de la aplicación de forma
// portable y multiplataforma (Windows / macOS).
package config

import (
	"os"
	"path/filepath"
)

// Paths agrupa las rutas de datos que usa la aplicación. La BBDD ya no vive
// en este directorio (está en PostgreSQL/RDS, ver PostgresFromEnv); solo
// quedan las fotos y la clave de firma de sesiones.
type Paths struct {
	DataDir   string // raíz de datos (contiene bbdd/ y fotos/)
	FotosDir  string // fotos/
	SecretKey string // bbdd/secret.key
}

// Resolve decide el directorio de datos según esta prioridad:
//  1. flag --data-dir (parámetro explicit, si no está vacío)
//  2. variable de entorno NUTRICLINICA_DATA
//  3. carpeta junto al ejecutable (modo portable), si es escribible
//  4. directorio de datos del usuario por SO
//     (%APPDATA%\NutriClinica en Windows, ~/Library/Application Support/NutriClinica en Mac)
func Resolve(explicit string) (Paths, error) {
	dataDir := explicit
	if dataDir == "" {
		dataDir = os.Getenv("NUTRICLINICA_DATA")
	}
	if dataDir == "" {
		if dir, ok := portableDir(); ok {
			dataDir = dir
		}
	}
	if dataDir == "" {
		base, err := os.UserConfigDir()
		if err != nil {
			return Paths{}, err
		}
		dataDir = filepath.Join(base, "NutriClinica")
	}

	p := Paths{
		DataDir:   dataDir,
		FotosDir:  filepath.Join(dataDir, "fotos"),
		SecretKey: filepath.Join(dataDir, "bbdd", "secret.key"),
	}
	// 0700: estos directorios contienen PII (fotos y la clave de sesión), no
	// deben ser accesibles por otros usuarios del sistema.
	if err := os.MkdirAll(filepath.Dir(p.SecretKey), 0o700); err != nil {
		return Paths{}, err
	}
	if err := os.MkdirAll(p.FotosDir, 0o700); err != nil {
		return Paths{}, err
	}
	return p, nil
}

// portableDir devuelve la carpeta del ejecutable si podemos escribir en ella.
func portableDir() (string, bool) {
	exe, err := os.Executable()
	if err != nil {
		return "", false
	}
	dir := filepath.Dir(exe)
	// Comprobar escritura creando un temporal con nombre único (os.CreateTemp):
	// evita dejar un .write-probe fijo si el proceso muere entre crear y borrar.
	f, err := os.CreateTemp(dir, ".write-probe-*")
	if err != nil {
		return "", false
	}
	name := f.Name()
	f.Close()
	os.Remove(name)
	return dir, true
}
