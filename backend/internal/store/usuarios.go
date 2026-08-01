package store

import (
	"database/sql"

	"nutriclinica/internal/models"
)

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

// UpdateUsuario actualiza usuario y rol.
func (s *Store) UpdateUsuario(id int64, usuario, rol string) (*models.Usuario, error) {
	if _, err := s.DB.Exec(`UPDATE usuarios SET usuario=$1, rol=$2 WHERE id=$3`, usuario, rol, id); err != nil {
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

// DeleteUsuario borra un usuario por id.
func (s *Store) DeleteUsuario(id int64) error {
	_, err := s.DB.Exec(`DELETE FROM usuarios WHERE id=$1`, id)
	return err
}

// CountUsuarios cuenta los usuarios existentes (para impedir borrar el último).
func (s *Store) CountUsuarios() (int, error) {
	var n int
	err := s.DB.QueryRow(`SELECT COUNT(*) FROM usuarios`).Scan(&n)
	return n, err
}
