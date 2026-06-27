package server

import (
	"crypto/rand"
	"encoding/hex"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"nutriclinica/internal/naming"
)

func (s *Server) handleListFotos(w http.ResponseWriter, r *http.Request) {
	pid, err := pathInt(r, "id")
	if err != nil {
		writeError(w, http.StatusBadRequest, "id inválido")
		return
	}
	fotos, err := s.st.Fotos(pid)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, fotos)
}

func (s *Server) handleUploadFoto(w http.ResponseWriter, r *http.Request) {
	pid, err := pathInt(r, "id")
	if err != nil {
		writeError(w, http.StatusBadRequest, "id inválido")
		return
	}
	if err := r.ParseMultipartForm(32 << 20); err != nil {
		writeError(w, http.StatusBadRequest, "Formulario inválido")
		return
	}
	file, header, err := r.FormFile("foto")
	if err != nil {
		writeError(w, http.StatusBadRequest, "Sin archivo")
		return
	}
	defer file.Close()

	nombre, err := s.st.PacienteNombre(pid)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	if nombre == "" {
		writeError(w, http.StatusNotFound, "Paciente no encontrado")
		return
	}

	carpeta := naming.Carpeta(nombre)
	prefijo := naming.Prefijo(nombre)
	ext := strings.ToLower(filepath.Ext(header.Filename))
	if ext == "" {
		ext = ".jpg"
	}
	fechaStr := time.Now().Format("20060102_150405")
	fname := prefijo + "_" + fechaStr + "_" + randHex(3) + ext
	// La BBDD guarda la ruta relativa con barra '/' (igual que Flask).
	filenameRel := carpeta + "/" + fname

	dir := filepath.Join(s.fotosDir, carpeta)
	if err := os.MkdirAll(dir, 0o755); err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	dst, err := os.Create(filepath.Join(dir, fname))
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	if _, err := io.Copy(dst, file); err != nil {
		dst.Close()
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	dst.Close()

	var nota *string
	if v := strings.TrimSpace(r.FormValue("nota")); v != "" {
		nota = &v
	}
	foto, err := s.st.CreateFoto(pid, filenameRel, nota)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusCreated, foto)
}

func (s *Server) handleDeleteFoto(w http.ResponseWriter, r *http.Request) {
	id, err := pathInt(r, "id")
	if err != nil {
		writeError(w, http.StatusBadRequest, "id inválido")
		return
	}
	foto, err := s.st.Foto(id)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	if foto != nil {
		rel := filepath.FromSlash(foto.Filename)
		_ = os.Remove(filepath.Join(s.fotosDir, rel))
		if err := s.st.DeleteFoto(id); err != nil {
			writeError(w, http.StatusInternalServerError, err.Error())
			return
		}
	}
	writeJSON(w, http.StatusOK, ok(nil))
}

// handleServeFoto sirve un archivo de la carpeta de fotos.
func (s *Server) handleServeFoto(w http.ResponseWriter, r *http.Request) {
	rel := r.PathValue("path")
	// Evitar path traversal.
	clean := filepath.Clean("/" + rel)
	full := filepath.Join(s.fotosDir, filepath.FromSlash(clean))
	if !strings.HasPrefix(full, filepath.Clean(s.fotosDir)) {
		writeError(w, http.StatusBadRequest, "Ruta inválida")
		return
	}
	http.ServeFile(w, r, full)
}

func randHex(n int) string {
	b := make([]byte, n)
	if _, err := rand.Read(b); err != nil {
		return "000000"[:n*2]
	}
	return hex.EncodeToString(b)
}
