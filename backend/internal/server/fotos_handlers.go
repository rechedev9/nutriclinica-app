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
	fotos, err := s.db().Fotos(pid)
	if err != nil {
		serverError(w, err)
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

	// Validar que el contenido real es una imagen (accept="image/*" del HTML es
	// solo una pista del navegador, no una garantía). Se inspeccionan los
	// primeros bytes y se rebobina el lector para no perder datos.
	sniff := make([]byte, 512)
	n, _ := io.ReadFull(file, sniff)
	if _, err := file.Seek(0, io.SeekStart); err != nil {
		serverError(w, err)
		return
	}
	if !strings.HasPrefix(http.DetectContentType(sniff[:n]), "image/") {
		writeError(w, http.StatusBadRequest, "El archivo no es una imagen")
		return
	}

	nombre, err := s.db().PacienteNombre(pid)
	if err != nil {
		serverError(w, err)
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
	if err := os.MkdirAll(dir, 0o700); err != nil {
		serverError(w, err)
		return
	}
	fullPath := filepath.Join(dir, fname)
	// 0600: las fotos contienen PII, no deben ser legibles por otros usuarios.
	dst, err := os.OpenFile(fullPath, os.O_WRONLY|os.O_CREATE|os.O_TRUNC, 0o600)
	if err != nil {
		serverError(w, err)
		return
	}
	if _, err := io.Copy(dst, file); err != nil {
		dst.Close()
		_ = os.Remove(fullPath)
		serverError(w, err)
		return
	}
	dst.Close()

	var nota *string
	if v := strings.TrimSpace(r.FormValue("nota")); v != "" {
		nota = &v
	}
	foto, err := s.db().CreateFoto(pid, filenameRel, nota)
	if err != nil {
		// Si el INSERT falla, no dejar el archivo huérfano en disco.
		_ = os.Remove(fullPath)
		serverError(w, err)
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
	foto, err := s.db().Foto(id)
	if err != nil {
		serverError(w, err)
		return
	}
	if foto != nil {
		// Borrar primero el registro (operación verificable) y luego el archivo
		// best-effort: así un fallo del DELETE no deja el archivo perdido con la
		// BD aún apuntándolo.
		if err := s.db().DeleteFoto(id); err != nil {
			serverError(w, err)
			return
		}
		rel := filepath.FromSlash(foto.Filename)
		_ = os.Remove(filepath.Join(s.fotosDir, rel))
	}
	writeJSON(w, http.StatusOK, ok(nil))
}

// handleServeFoto sirve un archivo de la carpeta de fotos.
func (s *Server) handleServeFoto(w http.ResponseWriter, r *http.Request) {
	rel := r.PathValue("path")
	full := filepath.Join(s.fotosDir, filepath.FromSlash(filepath.Clean("/"+rel)))
	if !dentroDe(s.fotosDir, full) {
		writeError(w, http.StatusBadRequest, "Ruta inválida")
		return
	}
	http.ServeFile(w, r, full)
}

// dentroDe comprueba que target no escapa del directorio base. Usa filepath.Rel
// y rechaza cualquier resultado que empiece por ".." (cubre también el caso de
// Windows, cuyo sistema de ficheros es case-insensitive y donde un HasPrefix
// sensible a mayúsculas podría dar un falso negativo).
func dentroDe(base, target string) bool {
	rel, err := filepath.Rel(filepath.Clean(base), filepath.Clean(target))
	if err != nil {
		return false
	}
	return rel != ".." && !strings.HasPrefix(rel, ".."+string(filepath.Separator))
}

func randHex(n int) string {
	b := make([]byte, n)
	if _, err := rand.Read(b); err != nil {
		return "000000"[:n*2]
	}
	return hex.EncodeToString(b)
}
