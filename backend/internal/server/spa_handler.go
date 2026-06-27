package server

import (
	"io"
	"io/fs"
	"net/http"
	"path"
	"strings"
)

// handleSPA sirve los ficheros estáticos del SPA embebido. Si la ruta no
// corresponde a un fichero existente, devuelve index.html (fallback para el
// enrutado del lado cliente: /pacientes, /login, etc.).
func (s *Server) handleSPA(w http.ResponseWriter, r *http.Request) {
	if s.spa == nil {
		http.Error(w, "SPA no embebido (modo desarrollo: usa el dev server de Vite)", http.StatusNotFound)
		return
	}
	upath := strings.TrimPrefix(path.Clean("/"+r.URL.Path), "/")
	if upath == "" {
		upath = "index.html"
	}

	if serveFile(w, r, s.spa, upath) {
		return
	}
	// Fallback SPA.
	serveFile(w, r, s.spa, "index.html")
}

func serveFile(w http.ResponseWriter, r *http.Request, fsys fs.FS, name string) bool {
	f, err := fsys.Open(name)
	if err != nil {
		return false
	}
	defer f.Close()
	info, err := f.Stat()
	if err != nil || info.IsDir() {
		return false
	}
	rs, ok := f.(io.ReadSeeker)
	if !ok {
		data, err := io.ReadAll(f)
		if err != nil {
			return false
		}
		w.Header().Set("Content-Type", contentType(name))
		w.Write(data)
		return true
	}
	http.ServeContent(w, r, name, info.ModTime(), rs)
	return true
}

func contentType(name string) string {
	switch {
	case strings.HasSuffix(name, ".html"):
		return "text/html; charset=utf-8"
	case strings.HasSuffix(name, ".js"):
		return "text/javascript; charset=utf-8"
	case strings.HasSuffix(name, ".css"):
		return "text/css; charset=utf-8"
	case strings.HasSuffix(name, ".svg"):
		return "image/svg+xml"
	case strings.HasSuffix(name, ".json"):
		return "application/json"
	default:
		return "application/octet-stream"
	}
}
