package server

import (
	"net/http"
	"strings"

	"nutriclinica/internal/models"
)

// --- Almacén ---

func (s *Server) handleAlmacen(w http.ResponseWriter, r *http.Request) {
	rows, err := s.st.Almacen()
	if err != nil {
		serverError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, rows)
}

// --- Productos ---

func (s *Server) handleListProductos(w http.ResponseWriter, r *http.Request) {
	ps, err := s.st.Productos()
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
	p, err := s.st.CreateProducto(in)
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
	p, err := s.st.UpdateProducto(id, in)
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
	if err := s.st.SoftDeleteProducto(id); err != nil {
		serverError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, ok(nil))
}

// --- Categorías ---

func (s *Server) handleListCategorias(w http.ResponseWriter, r *http.Request) {
	cs, err := s.st.Categorias()
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
	c, err := s.st.CreateCategoria(in.Nombre)
	if err != nil {
		serverError(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, c)
}

// --- Proveedores ---

func (s *Server) handleListProveedores(w http.ResponseWriter, r *http.Request) {
	ps, err := s.st.Proveedores()
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
	p, err := s.st.CreateProveedor(in)
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
	p, err := s.st.UpdateProveedor(id, in)
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
	if err := s.st.DeleteProveedor(id); err != nil {
		serverError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, ok(nil))
}

// --- Compras ---

func (s *Server) handleListCompras(w http.ResponseWriter, r *http.Request) {
	cs, err := s.st.Compras()
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
	id, err := s.st.CreateCompra(in)
	if err != nil {
		serverError(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, ok(map[string]any{"id": id}))
}

func (s *Server) handleDeleteCompra(w http.ResponseWriter, r *http.Request) {
	id, err := pathInt(r, "id")
	if err != nil {
		writeError(w, http.StatusBadRequest, "id inválido")
		return
	}
	if err := s.st.DeleteCompra(id); err != nil {
		serverError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, ok(nil))
}

// --- Ventas ---

func (s *Server) handleListVentas(w http.ResponseWriter, r *http.Request) {
	vs, err := s.st.Ventas()
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
	id, err := s.st.CreateVenta(in)
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
	if err := s.st.DeleteVenta(id); err != nil {
		serverError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, ok(nil))
}
