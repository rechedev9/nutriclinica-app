package server

import (
	"net/http"
	"strings"

	"nutriclinica/internal/models"
)

// --- Almacén ---

func (s *Server) handleAlmacen(w http.ResponseWriter, r *http.Request) {
	rows, err := s.db().Almacen()
	if err != nil {
		serverError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, rows)
}

// --- Productos ---

func (s *Server) handleListProductos(w http.ResponseWriter, r *http.Request) {
	ps, err := s.db().Productos()
	if err != nil {
		serverError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, ps)
}

func (s *Server) handleCreateProducto(w http.ResponseWriter, r *http.Request) {
	var in models.ProductoInput
	if err := decodeJSON(r, &in); err != nil {
		writeError(w, http.StatusBadRequest, "JSON inválido")
		return
	}
	in.Nombre = strings.TrimSpace(in.Nombre)
	if in.Nombre == "" {
		writeError(w, http.StatusBadRequest, "El nombre es obligatorio")
		return
	}
	p, err := s.db().CreateProducto(in)
	if err != nil {
		serverError(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, p)
}

func (s *Server) handleUpdateProducto(w http.ResponseWriter, r *http.Request) {
	id, err := pathInt(r, "id")
	if err != nil {
		writeError(w, http.StatusBadRequest, "id inválido")
		return
	}
	var in models.ProductoInput
	if err := decodeJSON(r, &in); err != nil {
		writeError(w, http.StatusBadRequest, "JSON inválido")
		return
	}
	in.Nombre = strings.TrimSpace(in.Nombre)
	p, err := s.db().UpdateProducto(id, in)
	if err != nil {
		serverError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, p)
}

func (s *Server) handleDeleteProducto(w http.ResponseWriter, r *http.Request) {
	id, err := pathInt(r, "id")
	if err != nil {
		writeError(w, http.StatusBadRequest, "id inválido")
		return
	}
	if err := s.db().SoftDeleteProducto(id); err != nil {
		serverError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, ok(nil))
}

// --- Categorías ---

func (s *Server) handleListCategorias(w http.ResponseWriter, r *http.Request) {
	cs, err := s.db().Categorias()
	if err != nil {
		serverError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, cs)
}

func (s *Server) handleCreateCategoria(w http.ResponseWriter, r *http.Request) {
	var in struct {
		Nombre string `json:"nombre"`
	}
	if err := decodeJSON(r, &in); err != nil {
		writeError(w, http.StatusBadRequest, "JSON inválido")
		return
	}
	in.Nombre = strings.TrimSpace(in.Nombre)
	if in.Nombre == "" {
		writeError(w, http.StatusBadRequest, "El nombre es obligatorio")
		return
	}
	c, err := s.db().CreateCategoria(in.Nombre)
	if err != nil {
		serverError(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, c)
}

func (s *Server) handleUpdateCategoria(w http.ResponseWriter, r *http.Request) {
	id, err := pathInt(r, "id")
	if err != nil {
		writeError(w, http.StatusBadRequest, "id inválido")
		return
	}
	var in struct {
		Nombre string `json:"nombre"`
	}
	if err := decodeJSON(r, &in); err != nil {
		writeError(w, http.StatusBadRequest, "JSON inválido")
		return
	}
	in.Nombre = strings.TrimSpace(in.Nombre)
	if in.Nombre == "" {
		writeError(w, http.StatusBadRequest, "El nombre es obligatorio")
		return
	}
	c, err := s.db().UpdateCategoria(id, in.Nombre)
	if err != nil {
		serverError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, c)
}

func (s *Server) handleDeleteCategoria(w http.ResponseWriter, r *http.Request) {
	id, err := pathInt(r, "id")
	if err != nil {
		writeError(w, http.StatusBadRequest, "id inválido")
		return
	}
	if err := s.db().DeleteCategoria(id); err != nil {
		serverError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, ok(nil))
}

// --- Proveedores ---

func (s *Server) handleListProveedores(w http.ResponseWriter, r *http.Request) {
	ps, err := s.db().Proveedores()
	if err != nil {
		serverError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, ps)
}

func normalizeProveedor(in *models.ProveedorInput) {
	in.Nombre = strings.TrimSpace(in.Nombre)
	in.Telefono = emptyToNil(in.Telefono)
	in.Email = emptyToNil(in.Email)
	in.Notas = emptyToNil(in.Notas)
}

func (s *Server) handleCreateProveedor(w http.ResponseWriter, r *http.Request) {
	var in models.ProveedorInput
	if err := decodeJSON(r, &in); err != nil {
		writeError(w, http.StatusBadRequest, "JSON inválido")
		return
	}
	normalizeProveedor(&in)
	if in.Nombre == "" {
		writeError(w, http.StatusBadRequest, "El nombre es obligatorio")
		return
	}
	p, err := s.db().CreateProveedor(in)
	if err != nil {
		serverError(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, p)
}

func (s *Server) handleUpdateProveedor(w http.ResponseWriter, r *http.Request) {
	id, err := pathInt(r, "id")
	if err != nil {
		writeError(w, http.StatusBadRequest, "id inválido")
		return
	}
	var in models.ProveedorInput
	if err := decodeJSON(r, &in); err != nil {
		writeError(w, http.StatusBadRequest, "JSON inválido")
		return
	}
	normalizeProveedor(&in)
	p, err := s.db().UpdateProveedor(id, in)
	if err != nil {
		serverError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, p)
}

func (s *Server) handleDeleteProveedor(w http.ResponseWriter, r *http.Request) {
	id, err := pathInt(r, "id")
	if err != nil {
		writeError(w, http.StatusBadRequest, "id inválido")
		return
	}
	if err := s.db().DeleteProveedor(id); err != nil {
		serverError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, ok(nil))
}

// --- Compras ---

func (s *Server) handleListCompras(w http.ResponseWriter, r *http.Request) {
	cs, err := s.db().Compras()
	if err != nil {
		serverError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, cs)
}

func (s *Server) handleCreateCompra(w http.ResponseWriter, r *http.Request) {
	var in models.CompraInput
	if err := decodeJSON(r, &in); err != nil {
		writeError(w, http.StatusBadRequest, "JSON inválido")
		return
	}
	in.Notas = emptyToNil(in.Notas)
	in.Fecha = emptyToNil(in.Fecha)
	id, err := s.db().CreateCompra(in)
	if err != nil {
		serverError(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, ok(map[string]any{"id": id}))
}

func (s *Server) handleUpdateCompra(w http.ResponseWriter, r *http.Request) {
	id, err := pathInt(r, "id")
	if err != nil {
		writeError(w, http.StatusBadRequest, "id inválido")
		return
	}
	var in models.CompraInput
	if err := decodeJSON(r, &in); err != nil {
		writeError(w, http.StatusBadRequest, "JSON inválido")
		return
	}
	in.Notas = emptyToNil(in.Notas)
	in.Fecha = emptyToNil(in.Fecha)
	if err := s.db().UpdateCompra(id, in); err != nil {
		serverError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, ok(nil))
}

func (s *Server) handleDeleteCompra(w http.ResponseWriter, r *http.Request) {
	id, err := pathInt(r, "id")
	if err != nil {
		writeError(w, http.StatusBadRequest, "id inválido")
		return
	}
	if err := s.db().DeleteCompra(id); err != nil {
		serverError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, ok(nil))
}

// --- Mermas ---

func (s *Server) handleListMermas(w http.ResponseWriter, r *http.Request) {
	ms, err := s.db().Mermas()
	if err != nil {
		serverError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, ms)
}

func (s *Server) handleCreateMerma(w http.ResponseWriter, r *http.Request) {
	var in models.MermaInput
	if err := decodeJSON(r, &in); err != nil {
		writeError(w, http.StatusBadRequest, "JSON inválido")
		return
	}
	in.Notas = emptyToNil(in.Notas)
	in.Fecha = emptyToNil(in.Fecha)
	if in.ProductoID == 0 {
		writeError(w, http.StatusBadRequest, "El producto es obligatorio")
		return
	}
	if in.Cantidad <= 0 {
		writeError(w, http.StatusBadRequest, "La cantidad debe ser mayor que cero")
		return
	}
	id, err := s.db().CreateMerma(in)
	if err != nil {
		serverError(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, ok(map[string]any{"id": id}))
}

func (s *Server) handleDeleteMerma(w http.ResponseWriter, r *http.Request) {
	id, err := pathInt(r, "id")
	if err != nil {
		writeError(w, http.StatusBadRequest, "id inválido")
		return
	}
	if err := s.db().DeleteMerma(id); err != nil {
		serverError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, ok(nil))
}

// --- Ventas ---

func (s *Server) handleListVentas(w http.ResponseWriter, r *http.Request) {
	vs, err := s.db().Ventas()
	if err != nil {
		serverError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, vs)
}

func (s *Server) handleCreateVenta(w http.ResponseWriter, r *http.Request) {
	var in models.VentaInput
	if err := decodeJSON(r, &in); err != nil {
		writeError(w, http.StatusBadRequest, "JSON inválido")
		return
	}
	in.Notas = emptyToNil(in.Notas)
	in.Fecha = emptyToNil(in.Fecha)
	id, err := s.db().CreateVenta(in)
	if err != nil {
		serverError(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, ok(map[string]any{"id": id}))
}

func (s *Server) handleDeleteVenta(w http.ResponseWriter, r *http.Request) {
	id, err := pathInt(r, "id")
	if err != nil {
		writeError(w, http.StatusBadRequest, "id inválido")
		return
	}
	if err := s.db().DeleteVenta(id); err != nil {
		serverError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, ok(nil))
}
