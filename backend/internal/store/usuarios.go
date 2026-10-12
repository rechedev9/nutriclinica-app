package store

import (
	"database/sql"
	"errors"

	"nutriclinica/internal/models"
)

// ErrUltimoAdmin indica que la operación dejaría la app sin administradores.
var ErrUltimoAdmin = errors.New("no puede quedar la app sin administradores")

// UsuarioAuth incluye el hash de contraseña (solo para verificación interna).
type UsuarioAuth struct {
	ID           int64
	Usuario      string
	PasswordHash string
	Rol          string
}

// Usuarios devuelve todos los usuarios (sin hash), ordenados por nombre.
func (s *Store) Usuarios() ([]models.Usuario, error) {
	rows, err := s.DB.Query(`SELECT id, usuario, rol, creado FROM usuarios ORDER BY lower(usuario)`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []models.Usuario{}
	for rows.Next() {
		var u models.Usuario
		if err := rows.Scan(&u.ID, &u.Usuario, &u.Rol, &u.Creado); err != nil {
			return nil, err
		}
		out = append(out, u)
	}
	return out, rows.Err()
}

// UsuarioByName busca un usuario por nombre para autenticación.
func (s *Store) UsuarioByName(usuario string) (*UsuarioAuth, error) {
	var u UsuarioAuth
	err := s.DB.QueryRow(`SELECT id, usuario, password_hash, rol FROM usuarios WHERE usuario=$1`, usuario).
		Scan(&u.ID, &u.Usuario, &u.PasswordHash, &u.Rol)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	return &u, err
}

func (s *Store) usuario(id int64) (*models.Usuario, error) {
	var u models.Usuario
	err := s.DB.QueryRow(`SELECT id, usuario, rol, creado FROM usuarios WHERE id=$1`, id).
		Scan(&u.ID, &u.Usuario, &u.Rol, &u.Creado)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	return &u, err
}

// CreateUsuario inserta un usuario con su hash.
func (s *Store) CreateUsuario(usuario, passwordHash, rol string) (*models.Usuario, error) {
	var id int64
	err := s.DB.QueryRow(`INSERT INTO usuarios (usuario, password_hash, rol) VALUES ($1,$2,$3) RETURNING id`,
		usuario, passwordHash, rol).Scan(&id)
	if err != nil {
		return nil, err
	}
	return s.usuario(id)
}

// otrosAdmins cuenta, dentro de la transacción, los administradores distintos
// de id. Bloquea a todos los admin en orden de id para que dos transacciones
// simultáneas no se bloqueen entre sí en orden cruzado (interbloqueo).
func otrosAdmins(tx *sql.Tx, id int64) (int, error) {
	rows, err := tx.Query(`SELECT id FROM usuarios WHERE rol='admin' ORDER BY id FOR UPDATE`)
	if err != nil {
		return 0, err
	}
	defer rows.Close()
	n := 0
	for rows.Next() {
		var otro int64
		if err := rows.Scan(&otro); err != nil {
			return 0, err
		}
		if otro != id {
			n++
		}
	}
	return n, rows.Err()
}

// rolDe devuelve el rol del usuario id dentro de la transacción ("" si no existe).
func rolDe(tx *sql.Tx, id int64) (string, error) {
	var rol string
	err := tx.QueryRow(`SELECT rol FROM usuarios WHERE id=$1`, id).Scan(&rol)
	if err == sql.ErrNoRows {
		return "", nil
	}
	return rol, err
}

// UpdateUsuario actualiza usuario y rol. Devuelve ErrUltimoAdmin si se
// quitaría el rol admin al único administrador.
func (s *Store) UpdateUsuario(id int64, usuario, rol string) (*models.Usuario, error) {
	tx, err := s.DB.Begin()
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()
	actual, err := rolDe(tx, id)
	if err != nil {
		return nil, err
	}
	if actual == "admin" && rol != "admin" {
		otros, err := otrosAdmins(tx, id)
		if err != nil {
			return nil, err
		}
		if otros == 0 {
			return nil, ErrUltimoAdmin
		}
	}
	if _, err := tx.Exec(`UPDATE usuarios SET usuario=$1, rol=$2 WHERE id=$3`, usuario, rol, id); err != nil {
		return nil, err
	}
	if err := tx.Commit(); err != nil {
		return nil, err
	}
	return s.usuario(id)
}

// SetPassword cambia el hash de contraseña de un usuario.
func (s *Store) SetPassword(id int64, passwordHash string) error {
	_, err := s.DB.Exec(`UPDATE usuarios SET password_hash=$1 WHERE id=$2`, passwordHash, id)
	return err
}

// PasswordHash devuelve el hash de un usuario por id.
func (s *Store) PasswordHash(id int64) (string, error) {
	var h string
	err := s.DB.QueryRow(`SELECT password_hash FROM usuarios WHERE id=$1`, id).Scan(&h)
	if err == sql.ErrNoRows {
		return "", nil
	}
	return h, err
}

// DeleteUsuario borra un usuario por id. Devuelve ErrUltimoAdmin si es el
// único administrador.
func (s *Store) DeleteUsuario(id int64) error {
	tx, err := s.DB.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()
	rol, err := rolDe(tx, id)
	if err != nil {
		return err
	}
	if rol == "admin" {
		otros, err := otrosAdmins(tx, id)
		if err != nil {
			return err
		}
		if otros == 0 {
			return ErrUltimoAdmin
		}
	}
	if _, err := tx.Exec(`DELETE FROM usuarios WHERE id=$1`, id); err != nil {
		return err
	}
	return tx.Commit()
}

// CountUsuarios cuenta los usuarios existentes (para impedir borrar el último).
func (s *Store) CountUsuarios() (int, error) {
	var n int
	err := s.DB.QueryRow(`SELECT COUNT(*) FROM usuarios`).Scan(&n)
	return n, err
}
