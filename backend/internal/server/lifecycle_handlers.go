package server

import (
	"errors"
	"net/http"
	"os"

	"nutriclinica/internal/crypto"
	"nutriclinica/internal/store"
)

// handleEstado informa del estado del cifrado para que el SPA decida qué
// pantalla mostrar: configurar (primer arranque), migrar (hay BD en claro),
// bloqueado (pide contraseña) o abierto.
func (s *Server) handleEstado(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]string{"estado": s.estado()})
}

func (s *Server) estado() string {
	switch {
	case s.db() != nil:
		return "abierto"
	case existeFichero(s.vaultPath):
		return "bloqueado"
	case existeFichero(s.dbPath):
		return "migrar"
	default:
		return "configurar"
	}
}

func existeFichero(p string) bool {
	_, err := os.Stat(p)
	return err == nil
}

// handleConfigurar crea la contraseña maestra en el primer arranque (o cifra una
// BD en claro existente) y devuelve la clave de recuperación, que se muestra UNA
// vez. A partir de aquí la BD queda cifrada en reposo.
func (s *Server) handleConfigurar(w http.ResponseWriter, r *http.Request) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.db() != nil || existeFichero(s.vaultPath) {
		writeError(w, http.StatusConflict, "La aplicación ya está configurada")
		return
	}
	var body struct {
		Password string `json:"password"`
	}
	if err := decodeJSON(r, &body); err != nil {
		writeError(w, http.StatusBadRequest, "JSON inválido")
		return
	}
	if msg := validarPassword(body.Password); msg != "" {
		writeError(w, http.StatusBadRequest, msg)
		return
	}
	vault, dek, recovery, err := crypto.NuevoVault(body.Password)
	if err != nil {
		serverError(w, err)
		return
	}
	// Si hay una BD en claro previa, cifrarla con la nueva clave antes de abrir.
	if existeFichero(s.dbPath) {
		if err := store.CifrarBaseExistente(s.dbPath, dek); err != nil {
			serverError(w, err)
			return
		}
	}
	st, err := s.abrir(dek)
	if err != nil {
		serverError(w, err)
		return
	}
	data, err := vault.Serializar()
	if err != nil {
		st.Close()
		serverError(w, err)
		return
	}
	if err := os.WriteFile(s.vaultPath, data, 0o600); err != nil {
		st.Close()
		serverError(w, err)
		return
	}
	s.st.Store(st)
	writeJSON(w, http.StatusOK, map[string]any{"ok": true, "recovery_key": recovery})
}

// handleUnlock abre la BD cifrada con la contraseña maestra o la clave de
// recuperación.
func (s *Server) handleUnlock(w http.ResponseWriter, r *http.Request) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.db() != nil {
		writeJSON(w, http.StatusOK, ok(nil))
		return
	}
	data, err := os.ReadFile(s.vaultPath)
	if err != nil {
		writeError(w, http.StatusBadRequest, "No hay configuración de cifrado")
		return
	}
	vault, err := crypto.Parse(data)
	if err != nil {
		serverError(w, err)
		return
	}
	var body struct {
		Password string `json:"password"`
	}
	if err := decodeJSON(r, &body); err != nil {
		writeError(w, http.StatusBadRequest, "JSON inválido")
		return
	}
	dek, err := vault.Abrir(body.Password)
	if err != nil {
		if errors.Is(err, crypto.ErrSecretoIncorrecto) {
			writeError(w, http.StatusUnauthorized, "Contraseña o clave de recuperación incorrecta")
			return
		}
		serverError(w, err)
		return
	}
	st, err := s.abrir(dek)
	if err != nil {
		serverError(w, err)
		return
	}
	s.st.Store(st)
	writeJSON(w, http.StatusOK, ok(nil))
}
