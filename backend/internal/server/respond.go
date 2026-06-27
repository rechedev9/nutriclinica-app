package server

import (
	"encoding/json"
	"net/http"
	"strconv"
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

// writeOK responde {"ok": true} (opcionalmente con campos extra).
func ok(extra map[string]any) map[string]any {
	m := map[string]any{"ok": true}
	for k, v := range extra {
		m[k] = v
	}
	return m
}

// decodeJSON decodifica el cuerpo de la petición en dst.
func decodeJSON(r *http.Request, dst any) error {
	defer r.Body.Close()
	return json.NewDecoder(r.Body).Decode(dst)
}

// pathInt extrae un parámetro de ruta entero (Go 1.22 PathValue).
func pathInt(r *http.Request, name string) (int64, error) {
	return strconv.ParseInt(r.PathValue(name), 10, 64)
}
