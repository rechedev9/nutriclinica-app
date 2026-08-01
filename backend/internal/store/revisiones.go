package store

import (
	"database/sql"
	"fmt"
	"strings"

	"nutriclinica/internal/models"
)

// revFields son los 23 campos editables de una revisión (espejo de REV_FIELDS
// en app.py), en el mismo orden que se insertan/actualizan.
var revFields = []string{
	"fecha", "peso", "talla", "envergadura",
	"pl_bicipital", "pl_tricipital", "pl_subescapular", "pl_supraespinal",
	"pl_supracrestal", "pl_abdominal", "pl_muslo_int", "pl_pierna_med",
	"per_antebrazo", "per_brazo_rel", "per_brazo_cont", "per_hombros",
	"per_pecho", "per_cintura", "per_caderas", "per_muslo", "per_muslo_cont",
	"per_gemelo", "notas",
}

const revisionCols = `id, paciente_id, ` + `fecha, peso, talla, envergadura,
	pl_bicipital, pl_tricipital, pl_subescapular, pl_supraespinal,
	pl_supracrestal, pl_abdominal, pl_muslo_int, pl_pierna_med,
	per_antebrazo, per_brazo_rel, per_brazo_cont, per_hombros,
	per_pecho, per_cintura, per_caderas, per_muslo, per_muslo_cont,
	per_gemelo, notas`

func scanRevision(row scanner) (*models.Revision, error) {
	var r models.Revision
	err := row.Scan(&r.ID, &r.PacienteID, &r.Fecha, &r.Peso, &r.Talla, &r.Envergadura,
		&r.PlBicipital, &r.PlTricipital, &r.PlSubescapular, &r.PlSupraespinal,
		&r.PlSupracrestal, &r.PlAbdominal, &r.PlMusloInt, &r.PlPiernaMed,
		&r.PerAntebrazo, &r.PerBrazoRel, &r.PerBrazoCont, &r.PerHombros,
		&r.PerPecho, &r.PerCintura, &r.PerCaderas, &r.PerMuslo, &r.PerMusloCont,
		&r.PerGemelo, &r.Notas)
	if err != nil {
		return nil, err
	}
	return &r, nil
}

// revValues devuelve los valores de r en el orden de revFields.
func revValues(r *models.Revision) []any {
	return []any{
		r.Fecha, r.Peso, r.Talla, r.Envergadura,
		r.PlBicipital, r.PlTricipital, r.PlSubescapular, r.PlSupraespinal,
		r.PlSupracrestal, r.PlAbdominal, r.PlMusloInt, r.PlPiernaMed,
		r.PerAntebrazo, r.PerBrazoRel, r.PerBrazoCont, r.PerHombros,
		r.PerPecho, r.PerCintura, r.PerCaderas, r.PerMuslo, r.PerMusloCont,
		r.PerGemelo, r.Notas,
	}
}

// Revisiones devuelve las revisiones de un paciente, más recientes primero.
func (s *Store) Revisiones(pid int64) ([]models.Revision, error) {
	rows, err := s.DB.Query(`SELECT `+revisionCols+` FROM revisiones WHERE paciente_id=$1 ORDER BY fecha DESC`, pid)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []models.Revision{}
	for rows.Next() {
		r, err := scanRevision(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, *r)
	}
	return out, rows.Err()
}

// Revision devuelve una revisión por id, o nil si no existe.
func (s *Store) Revision(id int64) (*models.Revision, error) {
	row := s.DB.QueryRow(`SELECT `+revisionCols+` FROM revisiones WHERE id=$1`, id)
	r, err := scanRevision(row)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	return r, err
}

// CreateRevision inserta una revisión para un paciente.
func (s *Store) CreateRevision(pid int64, r *models.Revision) (*models.Revision, error) {
	cols := strings.Join(revFields, ", ")
	// $1 es paciente_id; los campos de revFields ocupan $2..$(len+1).
	ph := placeholders(2, len(revFields))
	args := append([]any{pid}, revValues(r)...)
	var id int64
	err := s.DB.QueryRow(
		`INSERT INTO revisiones (paciente_id, `+cols+`) VALUES ($1, `+ph+`) RETURNING id`,
		args...,
	).Scan(&id)
	if err != nil {
		return nil, err
	}
	return s.Revision(id)
}

// UpdateRevision actualiza una revisión por id.
func (s *Store) UpdateRevision(id int64, r *models.Revision) (*models.Revision, error) {
	sets := strings.Join(indexedAssignments(revFields, 1), ", ")
	args := append(revValues(r), id)
	where := fmt.Sprintf("$%d", len(revFields)+1)
	if _, err := s.DB.Exec(`UPDATE revisiones SET `+sets+` WHERE id=`+where, args...); err != nil {
		return nil, err
	}
	return s.Revision(id)
}

// DeleteRevision borra una revisión por id.
func (s *Store) DeleteRevision(id int64) error {
	_, err := s.DB.Exec(`DELETE FROM revisiones WHERE id=$1`, id)
	return err
}

// placeholders genera "$start, $start+1, ..." para n parámetros.
func placeholders(start, n int) string {
	ph := make([]string, n)
	for i := 0; i < n; i++ {
		ph[i] = fmt.Sprintf("$%d", start+i)
	}
	return strings.Join(ph, ", ")
}

// indexedAssignments genera "campo=$start, campo2=$start+1, ..." para un
// UPDATE SET, en el mismo orden que in.
func indexedAssignments(in []string, start int) []string {
	out := make([]string, len(in))
	for i, f := range in {
		out[i] = fmt.Sprintf("%s=$%d", f, start+i)
	}
	return out
}
