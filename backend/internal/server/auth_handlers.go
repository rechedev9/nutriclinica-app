package server

import (
	"net/http"

	"nutriclinica/internal/auth"

	"golang.org/x/crypto/bcrypt"
)

// dummyHash es un hash bcrypt válido (coste 12) que se compara cuando el
// usuario no existe, para igualar el coste temporal del login y evitar el canal
// lateral de tiempo que permitiría enumerar usuarios.
var dummyHash []byte

func init() {
	dummyHash, _ = bcrypt.GenerateFromPassword([]byte("nutriclinica-usuario-inexistente"), 12)
}

func (s *Server) handleLogin(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Usuario  string `json:"usuario"`
		Password string `json:"password"`
	}
	if err := decodeJSON(r, &body); err != nil {
		writeError(w, http.StatusBadRequest, "JSON inválido")
		return
	}
	u, err := s.st.UsuarioByName(body.Usuario)
	if err != nil {
		serverError(w, err)
		return
	}
	// Comparar siempre un bcrypt (el real o el dummy) para que el tiempo de
	// respuesta no revele si el usuario existe.
	hash := dummyHash
	if u != nil {
		hash = []byte(u.PasswordHash)
	}
	if bcrypt.CompareHashAndPassword(hash, []byte(body.Password)) != nil || u == nil {
		writeError(w, http.StatusUnauthorized, "Usuario o contraseña incorrectos")
		return
	}
	if err := s.sessions.Login(w, r, auth.SessionUser{ID: u.ID, Usuario: u.Usuario, Rol: u.Rol}); err != nil {
		serverError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"ok": true, "usuario": u.Usuario, "rol": u.Rol})
}

func (s *Server) handleLogout(w http.ResponseWriter, r *http.Request) {
	_ = s.sessions.Logout(w, r)
	writeJSON(w, http.StatusOK, ok(nil))
}

func (s *Server) handleMe(w http.ResponseWriter, r *http.Request) {
	u, _ := s.sessions.Current(r)
	writeJSON(w, http.StatusOK, map[string]any{"id": u.ID, "usuario": u.Usuario, "rol": u.Rol})
}

func (s *Server) handleMyPassword(w http.ResponseWriter, r *http.Request) {
	u, _ := s.sessions.Current(r)
	var body struct {
		Actual string `json:"actual"`
		Nueva  string `json:"nueva"`
	}
	if err := decodeJSON(r, &body); err != nil {
		writeError(w, http.StatusBadRequest, "JSON inválido")
		return
	}
	if msg := validarPassword(body.Nueva); msg != "" {
		writeError(w, http.StatusBadRequest, msg)
		return
	}
	hash, err := s.st.PasswordHash(u.ID)
	if err != nil {
		serverError(w, err)
		return
	}
	if bcrypt.CompareHashAndPassword([]byte(hash), []byte(body.Actual)) != nil {
		writeError(w, http.StatusForbidden, "La contraseña actual no es correcta")
		return
	}
	newHash, err := bcrypt.GenerateFromPassword([]byte(body.Nueva), 12)
	if err != nil {
		serverError(w, err)
		return
	}
	if err := s.st.SetPassword(u.ID, string(newHash)); err != nil {
		serverError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, ok(nil))
}
