// Package web embebe el build del SPA (frontend/dist copiado a web/dist).
package web

import (
	"embed"
	"io/fs"
)

//go:embed all:dist
var distFS embed.FS

// DistFS devuelve el sistema de ficheros del SPA (raíz = contenido de dist/).
func DistFS() (fs.FS, error) {
	return fs.Sub(distFS, "dist")
}

// HasRealBuild indica si dist contiene algo más que el placeholder.
func HasRealBuild() bool {
	entries, err := distFS.ReadDir("dist")
	if err != nil {
		return false
	}
	for _, e := range entries {
		if e.Name() == "assets" {
			return true
		}
	}
	return false
}
