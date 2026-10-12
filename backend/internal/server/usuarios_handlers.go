package server

import (
	"errors"
	"net/http"
	"strings"

	"nutriclinica/internal/models"
	"nutriclinica/internal/store"

	"golang.org/x/crypto/bcrypt"
)

func (s *Server) handleListUsuarios(w http.ResponseWriter, r *http.Request) {
	us, err := s.db().Usuarios()
	if err != nil {
		serverError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, us)
}

func (s *Server) handleCreateUsuario(w http.ResponseWriter, r *http.Request) {
	var in models.UsuarioInput
	if err := decodeJSON(r, &in); err != nil {
		writeError(w, http.StatusBadRequest, "JSON inválido")
		return
	}
	in.Usuario = strings.TrimSpace(in.Usuario)
	if in.Usuario == "" || in.Password == "" {
		writeError(w, http.StatusBadRequest, "Usuario y contraseña son obligatorios")
		return
	}
	if msg := validarPassword(in.Password); msg != "" {
		writeError(w, http.StatusBadRequest, msg)
		return
	}
	rol := "user"
	if in.Rol != nil && *in.Rol != "" {
		rol = *in.Rol
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(in.Password), 12)
	if err != nil {
		serverError(w, err)
		return
	}
	u, err := s.db().CreateUsuario(in.Usuario, string(hash), rol)
	if err != nil {
		if store.IsUniqueViolation(err) {
			writeError(w, http.StatusConflict, "Ese nombre de usuario ya existe")
			return
		}
		serverError(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, u)
}

func (s *Server) handleUpdateUsuario(w http.ResponseWriter, r *http.Request) {
	id, err := pathInt(r, "id")
	if err != nil {
		writeError(w, http.StatusBadRequest, "id inválido")
		return
	}
	var in struct {
		Usuario string `json:"usuario"`
		Rol     string `json:"rol"`
	}
	if err := decodeJSON(r, &in); err != nil {
		writeError(w, http.StatusBadRequest, "JSON inválido")
		return
	}
	in.Usuario = strings.TrimSpace(in.Usuario)
	if in.Usuario == "" {
		writeError(w, http.StatusBadRequest, "El usuario es obligatorio")
		return
	}
	if in.Rol == "" {
		in.Rol = "user"
	}
	u, err := s.db().UpdateUsuario(id, in.Usuario, in.Rol)
	if err != nil {
		if errors.Is(err, store.ErrUltimoAdmin) {
			writeError(w, http.StatusConflict, "Debe quedar al menos un administrador")
			return
		}
		serverError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, u)
}

func (s *Server) handleDeleteUsuario(w http.ResponseWriter, r *http.Request) {
	id, err := pathInt(r, "id")
	if err != nil {
		writeError(w, http.StatusBadRequest, "id inválido")
		return
	}
	if actual, ok := s.sessions.Current(r); ok && actual.ID == id {
		writeError(w, http.StatusBadRequest, "No puedes eliminar tu propia cuenta")
		return
	}
	if err := s.db().DeleteUsuario(id); err != nil {
		if errors.Is(err, store.ErrUltimoAdmin) {
			writeError(w, http.StatusConflict, "No se puede eliminar al último administrador")
			return
		}
		serverError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, ok(nil))
}

func (s *Server) handleSetPassword(w http.ResponseWriter, r *http.Request) {
	id, err := pathInt(r, "id")
	if err != nil {
		writeError(w, http.StatusBadRequest, "id inválido")
		return
	}
	var in struct {
		Password string `json:"password"`
	}
	if err := decodeJSON(r, &in); err != nil {
		writeError(w, http.StatusBadRequest, "JSON inválido")
		return
	}
	if msg := validarPassword(in.Password); msg != "" {
		writeError(w, http.StatusBadRequest, msg)
		return
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(in.Password), 12)
	if err != nil {
		serverError(w, err)
		return
	}
	if err := s.db().SetPassword(id, string(hash)); err != nil {
		serverError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, ok(nil))
}
