package server

import (
	"net/http"

	"nutriclinica/internal/auth"

	"golang.org/x/crypto/bcrypt"
)

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
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	if u == nil || bcrypt.CompareHashAndPassword([]byte(u.PasswordHash), []byte(body.Password)) != nil {
		writeError(w, http.StatusUnauthorized, "Usuario o contraseña incorrectos")
		return
	}
	if err := s.sessions.Login(w, r, auth.SessionUser{ID: u.ID, Usuario: u.Usuario, Rol: u.Rol}); err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
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
	if body.Nueva == "" {
		writeError(w, http.StatusBadRequest, "La nueva contraseña no puede estar vacía")
		return
	}
	hash, err := s.st.PasswordHash(u.ID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	if bcrypt.CompareHashAndPassword([]byte(hash), []byte(body.Actual)) != nil {
		writeError(w, http.StatusForbidden, "La contraseña actual no es correcta")
		return
	}
	newHash, err := bcrypt.GenerateFromPassword([]byte(body.Nueva), 12)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	if err := s.st.SetPassword(u.ID, string(newHash)); err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, ok(nil))
}
