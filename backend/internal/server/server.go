// Package server define el router HTTP y los handlers de la API.
package server

import (
	"io/fs"
	"net/http"
	"time"

	"nutriclinica/internal/auth"
	"nutriclinica/internal/store"
)

// Server agrupa las dependencias de los handlers.
type Server struct {
	st           *store.Store
	sessions     *auth.Manager
	fotosDir     string
	spa          fs.FS // sistema de ficheros del SPA embebido (puede ser nil en dev)
	loginLimiter *rateLimiter
}

// New crea un Server.
func New(st *store.Store, sessions *auth.Manager, fotosDir string, spa fs.FS) *Server {
	return &Server{
		st:       st,
		sessions: sessions,
		fotosDir: fotosDir,
		spa:      spa,
		// Máx. 10 intentos de login por IP cada minuto.
		loginLimiter: newRateLimiter(10, time.Minute),
	}
}

// Handler construye el http.Handler con todas las rutas y middleware global.
func (s *Server) Handler() http.Handler {
	mux := http.NewServeMux()

	// --- Auth (sin requireAuth). Bajo /api para no colisionar con las rutas
	// de cliente del SPA (/login, /logout son rutas de React Router). ---
	mux.HandleFunc("POST /api/login", limitMW(s.loginLimiter, s.handleLogin))
	mux.HandleFunc("POST /api/logout", s.handleLogout)
	mux.HandleFunc("GET /api/me", s.requireAuth(s.handleMe))
	mux.HandleFunc("POST /api/me/password", s.requireAuth(s.handleMyPassword))

	// --- Pacientes ---
	mux.HandleFunc("GET /api/pacientes", s.requireAuth(s.handleListPacientes))
	mux.HandleFunc("POST /api/pacientes", s.requireAuth(s.handleCreatePaciente))
	mux.HandleFunc("PUT /api/pacientes/{id}", s.requireAuth(s.handleUpdatePaciente))
	mux.HandleFunc("DELETE /api/pacientes/{id}", s.requireAuth(s.handleDeletePaciente))

	// --- Revisiones ---
	mux.HandleFunc("GET /api/pacientes/{id}/revisiones", s.requireAuth(s.handleListRevisiones))
	mux.HandleFunc("POST /api/pacientes/{id}/revisiones", s.requireAuth(s.handleCreateRevision))
	mux.HandleFunc("PUT /api/revisiones/{id}", s.requireAuth(s.handleUpdateRevision))
	mux.HandleFunc("DELETE /api/revisiones/{id}", s.requireAuth(s.handleDeleteRevision))

	// --- Fotos ---
	mux.HandleFunc("GET /api/pacientes/{id}/fotos", s.requireAuth(s.handleListFotos))
	mux.HandleFunc("POST /api/pacientes/{id}/fotos", s.requireAuth(s.handleUploadFoto))
	mux.HandleFunc("DELETE /api/fotos/{id}", s.requireAuth(s.handleDeleteFoto))
	mux.HandleFunc("GET /fotos/{path...}", s.requireAuth(s.handleServeFoto))

	// --- Exportación Excel ---
	mux.HandleFunc("GET /api/exportar-excel", s.requireAuth(s.handleExportExcel))
	mux.HandleFunc("GET /api/exportar-revision/{id}", s.requireAuth(s.handleExportRevision))

	// --- Stock ---
	mux.HandleFunc("GET /api/stock/almacen", s.requireAuth(s.handleAlmacen))
	mux.HandleFunc("GET /api/stock/productos", s.requireAuth(s.handleListProductos))
	mux.HandleFunc("POST /api/stock/productos", s.requireAuth(s.handleCreateProducto))
	mux.HandleFunc("PUT /api/stock/productos/{id}", s.requireAuth(s.handleUpdateProducto))
	mux.HandleFunc("DELETE /api/stock/productos/{id}", s.requireAuth(s.handleDeleteProducto))
	mux.HandleFunc("GET /api/stock/categorias", s.requireAuth(s.handleListCategorias))
	mux.HandleFunc("POST /api/stock/categorias", s.requireAuth(s.handleCreateCategoria))
	mux.HandleFunc("GET /api/stock/proveedores", s.requireAuth(s.handleListProveedores))
	mux.HandleFunc("POST /api/stock/proveedores", s.requireAuth(s.handleCreateProveedor))
	mux.HandleFunc("PUT /api/stock/proveedores/{id}", s.requireAuth(s.handleUpdateProveedor))
	mux.HandleFunc("DELETE /api/stock/proveedores/{id}", s.requireAuth(s.handleDeleteProveedor))
	mux.HandleFunc("GET /api/stock/compras", s.requireAuth(s.handleListCompras))
	mux.HandleFunc("POST /api/stock/compras", s.requireAuth(s.handleCreateCompra))
	mux.HandleFunc("DELETE /api/stock/compras/{id}", s.requireAuth(s.handleDeleteCompra))
	mux.HandleFunc("GET /api/stock/ventas", s.requireAuth(s.handleListVentas))
	mux.HandleFunc("POST /api/stock/ventas", s.requireAuth(s.handleCreateVenta))
	mux.HandleFunc("DELETE /api/stock/ventas/{id}", s.requireAuth(s.handleDeleteVenta))

	// --- Usuarios (solo admin) ---
	mux.HandleFunc("GET /api/usuarios", s.requireAdmin(s.handleListUsuarios))
	mux.HandleFunc("POST /api/usuarios", s.requireAdmin(s.handleCreateUsuario))
	mux.HandleFunc("PUT /api/usuarios/{id}", s.requireAdmin(s.handleUpdateUsuario))
	mux.HandleFunc("DELETE /api/usuarios/{id}", s.requireAdmin(s.handleDeleteUsuario))
	mux.HandleFunc("POST /api/usuarios/{id}/password", s.requireAdmin(s.handleSetPassword))

	// --- SPA + estáticos (fallback) ---
	mux.HandleFunc("/", s.handleSPA)

	return loggingMW(securityHeadersMW(recoverMW(mux)))
}
