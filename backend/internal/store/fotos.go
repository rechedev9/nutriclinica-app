package store

import (
	"database/sql"

	"nutriclinica/internal/models"
)

// Fotos devuelve las fotos de un paciente, más recientes primero.
func (s *Store) Fotos(pid int64) ([]models.Foto, error) {
	rows, err := s.DB.Query(
		`SELECT id, paciente_id, filename, nota, fecha FROM fotos WHERE paciente_id=? ORDER BY fecha DESC`, pid)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []models.Foto{}
	for rows.Next() {
		var f models.Foto
		if err := rows.Scan(&f.ID, &f.PacienteID, &f.Filename, &f.Nota, &f.Fecha); err != nil {
			return nil, err
		}
		out = append(out, f)
	}
	return out, rows.Err()
}

// Foto devuelve una foto por id, o nil si no existe.
func (s *Store) Foto(id int64) (*models.Foto, error) {
	var f models.Foto
	err := s.DB.QueryRow(
		`SELECT id, paciente_id, filename, nota, fecha FROM fotos WHERE id=?`, id).
		Scan(&f.ID, &f.PacienteID, &f.Filename, &f.Nota, &f.Fecha)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	return &f, err
}

// PacienteNombre devuelve el nombre de un paciente (para construir rutas de foto).
func (s *Store) PacienteNombre(id int64) (string, error) {
	var nombre string
	err := s.DB.QueryRow(`SELECT nombre FROM pacientes WHERE id=?`, id).Scan(&nombre)
	if err == sql.ErrNoRows {
		return "", nil
	}
	return nombre, err
}

// CreateFoto inserta el registro de una foto ya guardada en disco.
func (s *Store) CreateFoto(pid int64, filename string, nota *string) (*models.Foto, error) {
	res, err := s.DB.Exec(
		`INSERT INTO fotos (paciente_id, filename, nota) VALUES (?,?,?)`, pid, filename, nota)
	if err != nil {
		return nil, err
	}
	id, err := res.LastInsertId()
	if err != nil {
		return nil, err
	}
	return s.Foto(id)
}

// DeleteFoto borra el registro de una foto por id.
func (s *Store) DeleteFoto(id int64) error {
	_, err := s.DB.Exec(`DELETE FROM fotos WHERE id=?`, id)
	return err
}
