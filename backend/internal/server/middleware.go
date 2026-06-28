package server

import (
	"log"
	"net"
	"net/http"
	"strings"
	"sync"
	"time"
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

// statusRecorder captura el código de estado para el registro de auditoría.
type statusRecorder struct {
	http.ResponseWriter
	status int
}

func (r *statusRecorder) WriteHeader(code int) {
	r.status = code
	r.ResponseWriter.WriteHeader(code)
}

// auditMW registra en audit_log las operaciones que modifican o exportan datos
// (RGPD): POST/PUT/DELETE bajo /api y las descargas de Excel. Las lecturas
// normales no se anotan. El fallo al registrar no interrumpe la petición.
func (s *Server) auditMW(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		rec := &statusRecorder{ResponseWriter: w, status: http.StatusOK}
		next.ServeHTTP(rec, r)
		if !esAuditable(r) {
			return
		}
		usuario := ""
		if u, ok := s.sessions.Current(r); ok {
			usuario = u.Usuario
		}
		if err := s.st.RegistrarAuditoria(usuario, r.Method, r.URL.Path, rec.status); err != nil {
			log.Printf("auditoría: no se pudo registrar %s %s: %v", r.Method, r.URL.Path, err)
		}
	})
}

// esAuditable decide si la petición debe quedar en el registro: mutaciones de
// la API o exportaciones de datos a Excel.
func esAuditable(r *http.Request) bool {
	switch r.Method {
	case http.MethodPost, http.MethodPut, http.MethodDelete:
		return strings.HasPrefix(r.URL.Path, "/api/")
	case http.MethodGet:
		return strings.HasPrefix(r.URL.Path, "/api/exportar")
	}
	return false
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

// securityHeadersMW inyecta cabeceras de seguridad en todas las respuestas.
// La CSP permite 'unsafe-inline' en scripts/estilos porque index.html incluye
// el script anti-flash de tema en línea; el resto del contenido de usuario se
// renderiza siempre escapado (sin dangerouslySetInnerHTML).
func securityHeadersMW(next http.Handler) http.Handler {
	const csp = "default-src 'self'; img-src 'self' data: blob:; " +
		"style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; " +
		"font-src 'self' data:; object-src 'none'; base-uri 'self'; frame-ancestors 'none'"
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		h := w.Header()
		h.Set("X-Content-Type-Options", "nosniff")
		h.Set("X-Frame-Options", "DENY")
		h.Set("Referrer-Policy", "no-referrer")
		h.Set("Content-Security-Policy", csp)
		next.ServeHTTP(w, r)
	})
}

// rateLimiter es un limitador sencillo por clave (IP) con ventana deslizante
// de conteo fijo. Pensado para proteger el login de fuerza bruta.
type rateLimiter struct {
	mu      sync.Mutex
	hits    map[string][]time.Time
	max     int
	ventana time.Duration
	nowFn   func() time.Time
}

func newRateLimiter(max int, ventana time.Duration) *rateLimiter {
	return &rateLimiter{
		hits:    map[string][]time.Time{},
		max:     max,
		ventana: ventana,
		nowFn:   time.Now,
	}
}

// permite registra un intento para key y devuelve false si excede el máximo
// dentro de la ventana.
func (rl *rateLimiter) permite(key string) bool {
	rl.mu.Lock()
	defer rl.mu.Unlock()
	now := rl.nowFn()
	corte := now.Add(-rl.ventana)
	recientes := rl.hits[key][:0]
	for _, t := range rl.hits[key] {
		if t.After(corte) {
			recientes = append(recientes, t)
		}
	}
	if len(recientes) >= rl.max {
		rl.hits[key] = recientes
		return false
	}
	rl.hits[key] = append(recientes, now)
	return true
}

// limitMW aplica el rate limiter usando la IP remota como clave.
func limitMW(rl *rateLimiter, next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if !rl.permite(clientIP(r)) {
			writeError(w, http.StatusTooManyRequests, "Demasiados intentos, espera un momento e inténtalo de nuevo")
			return
		}
		next(w, r)
	}
}

// clientIP extrae la IP del cliente (sin puerto) de RemoteAddr.
func clientIP(r *http.Request) string {
	host, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		return r.RemoteAddr
	}
	return host
}
