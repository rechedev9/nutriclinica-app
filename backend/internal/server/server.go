// Package server define el router HTTP y los handlers de la API.
package server

import (
	"io/fs"
	"net/http"
	"time"

	"nutriclinica/internal/auth"
	"nutriclinica/internal/store"
)

// Config agrupa las dependencias para construir el Server.
type Config struct {
	Sessions *auth.Manager
	FotosDir string
	SPA      fs.FS // SPA embebido (puede ser nil en dev)
	// Abrir abre (y migra) el store. La provee main para no acoplar el server
	// a la secuencia de arranque.
	Abrir func() (*store.Store, error)
}

// Server agrupa las dependencias de los handlers.
type Server struct {
	dbStore      *store.Store
	sessions     *auth.Manager
	fotosDir     string
	spa          fs.FS
	loginLimiter *rateLimiter
	fotoKey      []byte // clave de cifrado de fotos (nil: sin cifrar, el caso normal)
}

// New crea un Server y abre el store de inmediato.
func New(cfg Config) (*Server, error) {
	db, err := cfg.Abrir()
	if err != nil {
		return nil, err
	}
	return &Server{
		dbStore:      db,
		sessions:     cfg.Sessions,
		fotosDir:     cfg.FotosDir,
		spa:          cfg.SPA,
		loginLimiter: newRateLimiter(10, time.Minute), // máx. 10 logins/min por IP
	}, nil
}

// db devuelve el store actual.
func (s *Server) db() *store.Store { return s.dbStore }

// Close cierra el store.
func (s *Server) Close() error { return s.dbStore.Close() }

// Handler construye el http.Handler con todas las rutas y middleware global.
func (s *Server) Handler() http.Handler {
	mux := http.NewServeMux()

	// --- Estado de la app (sin auth ni gate): el SPA lo consulta al cargar. ---
	mux.HandleFunc("GET /api/estado", s.handleEstado)

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
	mux.HandleFunc("PUT /api/stock/compras/{id}", s.requireAuth(s.handleUpdateCompra))
	mux.HandleFunc("DELETE /api/stock/compras/{id}", s.requireAuth(s.handleDeleteCompra))
	mux.HandleFunc("GET /api/stock/ventas", s.requireAuth(s.handleListVentas))
	mux.HandleFunc("POST /api/stock/ventas", s.requireAuth(s.handleCreateVenta))
	mux.HandleFunc("DELETE /api/stock/ventas/{id}", s.requireAuth(s.handleDeleteVenta))
	mux.HandleFunc("GET /api/stock/mermas", s.requireAuth(s.handleListMermas))
	mux.HandleFunc("POST /api/stock/mermas", s.requireAuth(s.handleCreateMerma))
	mux.HandleFunc("DELETE /api/stock/mermas/{id}", s.requireAuth(s.handleDeleteMerma))

	// --- Auditoría (solo admin, RGPD) ---
	mux.HandleFunc("GET /api/auditoria", s.requireAdmin(s.handleListAuditoria))

	// --- Usuarios (solo admin) ---
	mux.HandleFunc("GET /api/usuarios", s.requireAdmin(s.handleListUsuarios))
	mux.HandleFunc("POST /api/usuarios", s.requireAdmin(s.handleCreateUsuario))
	mux.HandleFunc("PUT /api/usuarios/{id}", s.requireAdmin(s.handleUpdateUsuario))
	mux.HandleFunc("DELETE /api/usuarios/{id}", s.requireAdmin(s.handleDeleteUsuario))
	mux.HandleFunc("POST /api/usuarios/{id}/password", s.requireAdmin(s.handleSetPassword))

	// --- SPA + estáticos (fallback) ---
	mux.HandleFunc("/", s.handleSPA)

	return loggingMW(securityHeadersMW(recoverMW(s.auditMW(mux))))
}
