package server

import "net/http"

// handleEstado informa del estado de la aplicación al SPA. El cifrado de BD
// en reposo (que antes podía dejar esto "bloqueado" o "configurar") se
// eliminó al migrar a PostgreSQL: RDS cifra en reposo a nivel de
// infraestructura, así que el estado es siempre "abierto".
func (s *Server) handleEstado(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]string{"estado": "abierto"})
}
