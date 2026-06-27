package server

import (
	"encoding/json"
	"io"
	"log"
	"net/http"
	"strconv"
	"unicode/utf8"
)

// writeJSON serializa v como JSON con el status dado.
func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	if v != nil {
		json.NewEncoder(w).Encode(v)
	}
}

// writeError responde {"error": msg} con el status dado.
func writeError(w http.ResponseWriter, status int, msg string) {
	writeJSON(w, status, map[string]string{"error": msg})
}

// serverError registra el error real en el log del servidor y responde al
// cliente con un 500 y un mensaje genérico. Nunca filtra detalles internos
// (nombres de tablas/columnas, SQL) al frontend.
func serverError(w http.ResponseWriter, err error) {
	log.Printf("error interno: %v", err)
	writeError(w, http.StatusInternalServerError, "Error interno del servidor")
}

// minPasswordLen es la longitud mínima exigida a las contraseñas.
const minPasswordLen = 8

// validarPassword aplica la política mínima de contraseñas. Devuelve el mensaje
// de error (en español, apto para mostrar al usuario) o "" si es válida.
func validarPassword(p string) string {
	if utf8.RuneCountInString(p) < minPasswordLen {
		return "La contraseña debe tener al menos 8 caracteres"
	}
	return ""
}

// writeOK responde {"ok": true} (opcionalmente con campos extra).
func ok(extra map[string]any) map[string]any {
	m := map[string]any{"ok": true}
	for k, v := range extra {
		m[k] = v
	}
	return m
}

// maxJSONBody limita el tamaño de los cuerpos JSON (1 MiB) para evitar que una
// petición gigante agote la memoria. La subida de fotos usa multipart aparte.
const maxJSONBody = 1 << 20

// decodeJSON decodifica el cuerpo de la petición en dst, acotando su tamaño.
func decodeJSON(r *http.Request, dst any) error {
	defer r.Body.Close()
	dec := json.NewDecoder(io.LimitReader(r.Body, maxJSONBody))
	return dec.Decode(dst)
}

// pathInt extrae un parámetro de ruta entero (Go 1.22 PathValue).
func pathInt(r *http.Request, name string) (int64, error) {
	return strconv.ParseInt(r.PathValue(name), 10, 64)
}
