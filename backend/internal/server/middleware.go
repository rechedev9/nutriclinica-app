package server

import (
	"log"
	"net/http"
)

// requireAuth protege rutas de API: 401 JSON si no hay sesión.
func (s *Server) requireAuth(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if _, ok := s.sessions.Current(r); !ok {
			writeError(w, http.StatusUnauthorized, "No autenticado")
			return
		}
		next(w, r)
	}
}

// requireAdmin exige rol admin (para gestión de usuarios).
func (s *Server) requireAdmin(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		u, ok := s.sessions.Current(r)
		if !ok {
			writeError(w, http.StatusUnauthorized, "No autenticado")
			return
		}
		if u.Rol != "admin" {
			writeError(w, http.StatusForbidden, "Requiere rol administrador")
			return
		}
		next(w, r)
	}
}

// recoverMW convierte panics en 500 JSON.
func recoverMW(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		defer func() {
			if rec := recover(); rec != nil {
				log.Printf("panic: %v", rec)
				writeError(w, http.StatusInternalServerError, "Error interno")
			}
		}()
		next.ServeHTTP(w, r)
	})
}

// loggingMW registra cada petición.
func loggingMW(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		log.Printf("%s %s", r.Method, r.URL.Path)
		next.ServeHTTP(w, r)
	})
}
