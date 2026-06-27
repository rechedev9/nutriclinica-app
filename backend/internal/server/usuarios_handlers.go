package server

import (
	"net/http"
	"strings"

	"nutriclinica/internal/models"

	"golang.org/x/crypto/bcrypt"
)

func (s *Server) handleListUsuarios(w http.ResponseWriter, r *http.Request) {
	us, err := s.st.Usuarios()
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
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
	rol := "user"
	if in.Rol != nil && *in.Rol != "" {
		rol = *in.Rol
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(in.Password), 12)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	u, err := s.st.CreateUsuario(in.Usuario, string(hash), rol)
	if err != nil {
		if strings.Contains(err.Error(), "UNIQUE") {
			writeError(w, http.StatusConflict, "Ese nombre de usuario ya existe")
			return
		}
		writeError(w, http.StatusInternalServerError, err.Error())
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
	u, err := s.st.UpdateUsuario(id, in.Usuario, in.Rol)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
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
	n, err := s.st.CountUsuarios()
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	if n <= 1 {
		writeError(w, http.StatusBadRequest, "No se puede borrar el último usuario")
		return
	}
	if err := s.st.DeleteUsuario(id); err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
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
	if in.Password == "" {
		writeError(w, http.StatusBadRequest, "La contraseña no puede estar vacía")
		return
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(in.Password), 12)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	if err := s.st.SetPassword(id, string(hash)); err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, ok(nil))
}
