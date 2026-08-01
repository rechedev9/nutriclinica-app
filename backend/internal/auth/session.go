// Package auth gestiona las sesiones por cookie firmada y el hashing bcrypt.
package auth

import (
	"crypto/rand"
	"net/http"
	"os"

	"github.com/gorilla/sessions"
)

const sessionName = "nutriclinica_session"

// Manager encapsula el almacén de sesiones.
type Manager struct {
	store *sessions.CookieStore
}

// NewManager crea el gestor de sesiones, cargando o generando la clave de
// firma persistida en secretKeyPath (32 bytes aleatorios). secureCookie debe
// ser true cuando la app se sirve por HTTPS (despliegue en servidor); false
// en el uso local por defecto (http://127.0.0.1).
func NewManager(secretKeyPath string, secureCookie bool) (*Manager, error) {
	key, err := loadOrCreateKey(secretKeyPath)
	if err != nil {
		return nil, err
	}
	store := sessions.NewCookieStore(key)
	store.Options = &sessions.Options{
		Path:     "/",
		MaxAge:   12 * 60 * 60, // 12 horas
		HttpOnly: true,
		SameSite: http.SameSiteStrictMode,
		Secure:   secureCookie,
	}
	return &Manager{store: store}, nil
}

func loadOrCreateKey(path string) ([]byte, error) {
	if data, err := os.ReadFile(path); err == nil && len(data) >= 32 {
		return data, nil
	}
	key := make([]byte, 32)
	if _, err := rand.Read(key); err != nil {
		return nil, err
	}
	if err := os.WriteFile(path, key, 0o600); err != nil {
		return nil, err
	}
	return key, nil
}

// SessionUser son los datos de usuario guardados en la sesión.
type SessionUser struct {
	ID      int64
	Usuario string
	Rol     string
}

// Login marca la sesión como autenticada y guarda los datos del usuario.
// Usa store.New (no Get) para emitir una sesión nueva e ignorar cualquier
// cookie previa: así se evita la fijación de sesión (un identificador elegido
// antes del login no sobrevive a la autenticación).
func (m *Manager) Login(w http.ResponseWriter, r *http.Request, u SessionUser) error {
	sess, _ := m.store.New(r, sessionName)
	sess.Values["logged_in"] = true
	sess.Values["user_id"] = u.ID
	sess.Values["usuario"] = u.Usuario
	sess.Values["rol"] = u.Rol
	return sess.Save(r, w)
}

// Logout limpia la sesión.
func (m *Manager) Logout(w http.ResponseWriter, r *http.Request) error {
	sess, _ := m.store.Get(r, sessionName)
	sess.Options.MaxAge = -1
	sess.Values = map[any]any{}
	return sess.Save(r, w)
}

// Current devuelve el usuario de la sesión y si está autenticado.
func (m *Manager) Current(r *http.Request) (SessionUser, bool) {
	sess, err := m.store.Get(r, sessionName)
	if err != nil {
		return SessionUser{}, false
	}
	logged, _ := sess.Values["logged_in"].(bool)
	if !logged {
		return SessionUser{}, false
	}
	u := SessionUser{}
	if id, ok := sess.Values["user_id"].(int64); ok {
		u.ID = id
	}
	if name, ok := sess.Values["usuario"].(string); ok {
		u.Usuario = name
	}
	if rol, ok := sess.Values["rol"].(string); ok {
		u.Rol = rol
	}
	return u, true
}
