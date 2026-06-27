// Package config resuelve las rutas de datos de la aplicación de forma
// portable y multiplataforma (Windows / macOS).
package config

import (
	"os"
	"path/filepath"
)

// Paths agrupa las rutas de datos que usa la aplicación.
type Paths struct {
	DataDir   string // raíz de datos (contiene bbdd/ y fotos/)
	DBPath    string // bbdd/pacientes.db
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
		DBPath:    filepath.Join(dataDir, "bbdd", "pacientes.db"),
		FotosDir:  filepath.Join(dataDir, "fotos"),
		SecretKey: filepath.Join(dataDir, "bbdd", "secret.key"),
	}
	if err := os.MkdirAll(filepath.Dir(p.DBPath), 0o755); err != nil {
		return Paths{}, err
	}
	if err := os.MkdirAll(p.FotosDir, 0o755); err != nil {
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
	// Comprobar escritura con un archivo temporal.
	probe := filepath.Join(dir, ".write-probe")
	f, err := os.OpenFile(probe, os.O_CREATE|os.O_WRONLY, 0o644)
	if err != nil {
		return "", false
	}
	f.Close()
	os.Remove(probe)
	return dir, true
}
