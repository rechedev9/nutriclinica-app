package store

import (
	"database/sql"
	"time"

	"nutriclinica/internal/models"
)

// nowStr devuelve la fecha-hora actual en el mismo formato que usaba
// datetime('now') en SQLite, para sellar el momento del consentimiento.
func nowStr() string { return time.Now().Format("2006-01-02 15:04:05") }

// consInt normaliza el consentimiento recibido (*int) a 0/1.
func consInt(p *int) int {
	if p != nil && *p == 1 {
		return 1
	}
	return 0
}

const pacienteCols = `id, nombre, fecha_nac, sexo, dni, telefono, email, objetivo,
	actividad_fisica, intolerancias, patologias, notas, peso, talla, grupo_sanguineo, creado,
	consentimiento, consentimiento_fecha`

func scanPaciente(row scanner) (*models.Paciente, error) {
	var p models.Paciente
	err := row.Scan(&p.ID, &p.Nombre, &p.FechaNac, &p.Sexo, &p.DNI, &p.Telefono,
		&p.Email, &p.Objetivo, &p.ActividadFisica, &p.Intolerancias, &p.Patologias,
		&p.Notas, &p.Peso, &p.Talla, &p.GrupoSanguineo, &p.Creado,
		&p.Consentimiento, &p.ConsentFecha)
	if err != nil {
		return nil, err
	}
	return &p, nil
}

// scanner abstrae *sql.Row y *sql.Rows.
type scanner interface {
	Scan(dest ...any) error
}

// Pacientes devuelve todos los pacientes ordenados por nombre, enriquecidos
// con num_fotos y num_revisiones. Usa subqueries (una sola consulta) para
// evitar el patrón N+1.
func (s *Store) Pacientes() ([]models.Paciente, error) {
	rows, err := s.DB.Query(`
		SELECT ` + pacienteCols + `,
			(SELECT COUNT(*) FROM fotos f WHERE f.paciente_id = pacientes.id)      AS num_fotos,
			(SELECT COUNT(*) FROM revisiones r WHERE r.paciente_id = pacientes.id) AS num_revisiones
		FROM pacientes ORDER BY lower(nombre)`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := []models.Paciente{}
	for rows.Next() {
		var p models.Paciente
		if err := rows.Scan(&p.ID, &p.Nombre, &p.FechaNac, &p.Sexo, &p.DNI, &p.Telefono,
			&p.Email, &p.Objetivo, &p.ActividadFisica, &p.Intolerancias, &p.Patologias,
			&p.Notas, &p.Peso, &p.Talla, &p.GrupoSanguineo, &p.Creado,
			&p.Consentimiento, &p.ConsentFecha,
			&p.NumFotos, &p.NumRevisiones); err != nil {
			return nil, err
		}
		out = append(out, p)
	}
	return out, rows.Err()
}

// Paciente devuelve un paciente por id (sin contadores).
func (s *Store) Paciente(id int64) (*models.Paciente, error) {
	row := s.DB.QueryRow(`SELECT `+pacienteCols+` FROM pacientes WHERE id=$1`, id)
	p, err := scanPaciente(row)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	return p, err
}

// FillCounts rellena NumFotos y NumRevisiones de un paciente.
func (s *Store) FillCounts(p *models.Paciente) error { return s.fillCounts(p) }

func (s *Store) fillCounts(p *models.Paciente) error {
	if err := s.DB.QueryRow(`SELECT COUNT(*) FROM fotos WHERE paciente_id=$1`, p.ID).Scan(&p.NumFotos); err != nil {
		return err
	}
	return s.DB.QueryRow(`SELECT COUNT(*) FROM revisiones WHERE paciente_id=$1`, p.ID).Scan(&p.NumRevisiones)
}

// CreatePaciente inserta un paciente y devuelve el creado con contadores a 0.
func (s *Store) CreatePaciente(in models.PacienteInput) (*models.Paciente, error) {
	cons := consInt(in.Consentimiento)
	var consFecha *string
	if cons == 1 {
		f := nowStr()
		consFecha = &f
	}
	// Postgres no soporta LastInsertId(): se pide el id con RETURNING.
	var id int64
	err := s.DB.QueryRow(
		`INSERT INTO pacientes
		 (nombre, fecha_nac, sexo, dni, telefono, email, objetivo, actividad_fisica,
		  intolerancias, patologias, notas, peso, talla, grupo_sanguineo,
		  consentimiento, consentimiento_fecha)
		 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
		 RETURNING id`,
		in.Nombre, in.FechaNac, in.Sexo, in.DNI, in.Telefono, in.Email, in.Objetivo,
		in.ActividadFisica, in.Intolerancias, in.Patologias, in.Notas, in.Peso, in.Talla,
		in.GrupoSanguineo, cons, consFecha,
	).Scan(&id)
	if err != nil {
		return nil, err
	}
	return s.Paciente(id)
}

// UpdatePaciente actualiza un paciente y lo devuelve con contadores.
func (s *Store) UpdatePaciente(id int64, in models.PacienteInput) (*models.Paciente, error) {
	// Sellar la fecha del consentimiento: si se otorga ahora (y no constaba),
	// se estampa el momento; si ya estaba otorgado, se conserva la fecha
	// original; si se revoca, se limpia.
	cons := consInt(in.Consentimiento)
	var consFecha *string
	if cons == 1 {
		var actualCons int
		var actualFecha *string
		_ = s.DB.QueryRow(`SELECT consentimiento, consentimiento_fecha FROM pacientes WHERE id=$1`, id).
			Scan(&actualCons, &actualFecha)
		if actualCons == 1 && actualFecha != nil {
			consFecha = actualFecha
		} else {
			f := nowStr()
			consFecha = &f
		}
	}
	_, err := s.DB.Exec(
		`UPDATE pacientes SET nombre=$1, fecha_nac=$2, sexo=$3, dni=$4, telefono=$5, email=$6,
		 objetivo=$7, actividad_fisica=$8, intolerancias=$9, patologias=$10, notas=$11, peso=$12,
		 talla=$13, grupo_sanguineo=$14, consentimiento=$15, consentimiento_fecha=$16 WHERE id=$17`,
		in.Nombre, in.FechaNac, in.Sexo, in.DNI, in.Telefono, in.Email, in.Objetivo,
		in.ActividadFisica, in.Intolerancias, in.Patologias, in.Notas, in.Peso, in.Talla,
		in.GrupoSanguineo, cons, consFecha, id,
	)
	if err != nil {
		return nil, err
	}
	p, err := s.Paciente(id)
	if err != nil || p == nil {
		return p, err
	}
	if err := s.fillCounts(p); err != nil {
		return nil, err
	}
	return p, nil
}

// DeletePaciente borra fotos, revisiones y el paciente en una transacción.
// Devuelve el nombre del paciente para que el handler borre su carpeta de fotos.
func (s *Store) DeletePaciente(id int64) (nombre string, err error) {
	row := s.DB.QueryRow(`SELECT nombre FROM pacientes WHERE id=$1`, id)
	if err = row.Scan(&nombre); err == sql.ErrNoRows {
		return "", nil
	} else if err != nil {
		return "", err
	}

	tx, err := s.DB.Begin()
	if err != nil {
		return "", err
	}
	defer tx.Rollback()

	for _, q := range []string{
		`DELETE FROM fotos WHERE paciente_id=$1`,
		`DELETE FROM revisiones WHERE paciente_id=$1`,
		`DELETE FROM pacientes WHERE id=$1`,
	} {
		if _, err = tx.Exec(q, id); err != nil {
			return "", err
		}
	}
	return nombre, tx.Commit()
}
