package store

import "nutriclinica/internal/models"

// RevConNombre es una revisión junto al nombre de su paciente (para exportar).
type RevConNombre struct {
	Rev    models.Revision
	Nombre string
}

// RevisionesConNombre devuelve todas las revisiones con el nombre del paciente,
// ordenadas por nombre de paciente y fecha descendente (para el Excel global).
func (s *Store) RevisionesConNombre() ([]RevConNombre, error) {
	// r.* expande a las columnas de revisiones en orden de definición, que
	// coincide con el orden de escaneo (id, paciente_id, fecha, ... notas).
	rows, err := s.DB.Query(`
		SELECT r.*, p.nombre
		FROM revisiones r JOIN pacientes p ON p.id = r.paciente_id
		ORDER BY lower(p.nombre), r.fecha DESC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []RevConNombre{}
	for rows.Next() {
		var rc RevConNombre
		r := &rc.Rev
		if err := rows.Scan(&r.ID, &r.PacienteID, &r.Fecha, &r.Peso, &r.Talla, &r.Envergadura,
			&r.PlBicipital, &r.PlTricipital, &r.PlSubescapular, &r.PlSupraespinal,
			&r.PlSupracrestal, &r.PlAbdominal, &r.PlMusloInt, &r.PlPiernaMed,
			&r.PerAntebrazo, &r.PerBrazoRel, &r.PerBrazoCont, &r.PerHombros,
			&r.PerPecho, &r.PerCintura, &r.PerCaderas, &r.PerMuslo, &r.PerMusloCont,
			&r.PerGemelo, &r.Notas, &rc.Nombre); err != nil {
			return nil, err
		}
		out = append(out, rc)
	}
	return out, rows.Err()
}
