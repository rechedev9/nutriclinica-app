package server

import (
	"net/http"
	"strconv"
)

// handleListAuditoria devuelve las últimas entradas del registro de auditoría
// (solo admin). Acepta ?limite=N (por defecto 200, máximo 1000).
func (s *Server) handleListAuditoria(w http.ResponseWriter, r *http.Request) {
	limite := 200
	if v := r.URL.Query().Get("limite"); v != "" {
		if n, err := strconv.Atoi(v); err == nil {
			limite = n
		}
	}
	entradas, err := s.db().Auditoria(limite)
	if err != nil {
		serverError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, entradas)
}
