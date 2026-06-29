// Package server define el router HTTP y los handlers de la API.
package server

import (
	"io/fs"
	"net/http"
	"sync"
	"sync/atomic"
	"time"

	"nutriclinica/internal/auth"
	"nutriclinica/internal/store"
)

// Config agrupa las dependencias para construir el Server.
type Config struct {
	Sessions  *auth.Manager
	FotosDir  string
	SPA       fs.FS  // SPA embebido (puede ser nil en dev)
	DBPath    string // ruta del fichero de BD
	VaultPath string // ruta del fichero de claves (cifrado)
	Cifrado   bool   // si true, arranca bloqueado hasta recibir la contraseña maestra
	// Abrir abre (y migra) el store con la clave de datos dada; con dek=nil abre
	// sin cifrar. La provee main para no acoplar el server a la secuencia de
	// arranque (verify/integrity/orphans/migrate).
	Abrir func(dek []byte) (*store.Store, error)
}

// Server agrupa las dependencias de los handlers. El store vive en un puntero
// atómico porque en modo cifrado no existe hasta que el usuario desbloquea.
type Server struct {
	st           atomic.Pointer[store.Store]
	sessions     *auth.Manager
	fotosDir     string
	spa          fs.FS
	loginLimiter *rateLimiter

	dbPath    string
	vaultPath string
	abrir     func(dek []byte) (*store.Store, error)
	mu        sync.Mutex // serializa configurar/unlock
	fotoKey   []byte     // clave de cifrado de fotos (nil si la BD no va cifrada)
}

// New crea un Server. En modo no cifrado abre el store de inmediato.
func New(cfg Config) (*Server, error) {
	s := &Server{
		sessions:     cfg.Sessions,
		fotosDir:     cfg.FotosDir,
		spa:          cfg.SPA,
		dbPath:       cfg.DBPath,
		vaultPath:    cfg.VaultPath,
		abrir:        cfg.Abrir,
		loginLimiter: newRateLimiter(10, time.Minute), // máx. 10 logins/min por IP
	}
	if !cfg.Cifrado {
		st, err := cfg.Abrir(nil)
		if err != nil {
			return nil, err
		}
		s.st.Store(st)
	}
	return s, nil
}

// db devuelve el store actual (nil si la BD está bloqueada).
func (s *Server) db() *store.Store { return s.st.Load() }

// Close cierra el store si está abierto (para el apagado ordenado).
func (s *Server) Close() error {
	if st := s.db(); st != nil {
		return st.Close()
	}
	return nil
}

// Handler construye el http.Handler con todas las rutas y middleware global.
func (s *Server) Handler() http.Handler {
	mux := http.NewServeMux()

	// --- Ciclo de vida del cifrado (sin auth ni gate): estado, configuración
	// inicial y desbloqueo con la contraseña maestra. ---
	mux.HandleFunc("GET /api/estado", s.handleEstado)
	mux.HandleFunc("POST /api/configurar", limitMW(s.loginLimiter, s.handleConfigurar))
	mux.HandleFunc("POST /api/unlock", limitMW(s.loginLimiter, s.handleUnlock))

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

	return loggingMW(securityHeadersMW(recoverMW(s.gateMW(s.auditMW(mux)))))
}
