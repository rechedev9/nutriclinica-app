package store

import "nutriclinica/internal/models"

// RegistrarAuditoria anota una operación sobre los datos (quién, qué, cuándo).
// Pensada para llamarse tras una operación que modifica o exporta datos.
func (s *Store) RegistrarAuditoria(usuario, metodo, ruta string, estado int) error {
	_, err := s.DB.Exec(
		`INSERT INTO audit_log (usuario, metodo, ruta, estado) VALUES (?,?,?,?)`,
		usuario, metodo, ruta, estado)
	return err
}

// Auditoria devuelve las últimas entradas del registro, más recientes primero.
func (s *Store) Auditoria(limite int) ([]models.AuditEntry, error) {
	if limite <= 0 || limite > 1000 {
		limite = 200
	}
	rows, err := s.DB.Query(
		`SELECT id, fecha, usuario, metodo, ruta, estado
		 FROM audit_log ORDER BY id DESC LIMIT ?`, limite)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []models.AuditEntry{}
	for rows.Next() {
		var e models.AuditEntry
		if err := rows.Scan(&e.ID, &e.Fecha, &e.Usuario, &e.Metodo, &e.Ruta, &e.Estado); err != nil {
			return nil, err
		}
		out = append(out, e)
	}
	return out, rows.Err()
}
