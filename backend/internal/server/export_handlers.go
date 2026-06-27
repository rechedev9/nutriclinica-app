package server

import (
	"fmt"
	"net/http"
	"strings"
	"time"

	"nutriclinica/internal/models"

	"github.com/xuri/excelize/v2"
)

const verde = "16A34A"

// deref convierte un puntero (string/float64) en valor de celda o "".
func deref(v any) any {
	switch p := v.(type) {
	case *string:
		if p == nil {
			return ""
		}
		return *p
	case *float64:
		if p == nil {
			return ""
		}
		return *p
	}
	return v
}

func setRow(f *excelize.File, sheet string, row int, vals []any) {
	for i, v := range vals {
		cell, _ := excelize.CoordinatesToCellName(i+1, row)
		f.SetCellValue(sheet, cell, deref(v))
	}
}

func (s *Server) handleExportExcel(w http.ResponseWriter, r *http.Request) {
	idStr := r.URL.Query().Get("id")
	var pacientes []models.Paciente
	var singleName string
	if idStr != "" {
		var id int64
		fmt.Sscan(idStr, &id)
		p, err := s.st.Paciente(id)
		if err != nil {
			writeError(w, http.StatusInternalServerError, err.Error())
			return
		}
		if p != nil {
			if err := s.fillCountsPublic(p); err != nil {
				writeError(w, http.StatusInternalServerError, err.Error())
				return
			}
			pacientes = []models.Paciente{*p}
			singleName = p.Nombre
		}
	} else {
		var err error
		pacientes, err = s.st.Pacientes()
		if err != nil {
			writeError(w, http.StatusInternalServerError, err.Error())
			return
		}
	}

	f := excelize.NewFile()
	defer f.Close()

	headerStyle, _ := f.NewStyle(&excelize.Style{
		Fill:      excelize.Fill{Type: "pattern", Color: []string{verde}, Pattern: 1},
		Font:      &excelize.Font{Bold: true, Color: "FFFFFF", Size: 11},
		Alignment: &excelize.Alignment{Horizontal: "center", Vertical: "center"},
	})

	cabecera := func(sheet string, cabs []string, anchos []float64) {
		for i, cab := range cabs {
			cell, _ := excelize.CoordinatesToCellName(i+1, 1)
			f.SetCellValue(sheet, cell, cab)
			f.SetCellStyle(sheet, cell, cell, headerStyle)
			colName, _ := excelize.ColumnNumberToName(i + 1)
			f.SetColWidth(sheet, colName, colName, anchos[i])
		}
		f.SetRowHeight(sheet, 1, 22)
	}

	// --- Hoja 1: Pacientes ---
	sheet1 := "Pacientes"
	f.SetSheetName("Sheet1", sheet1)
	cabecera(sheet1,
		[]string{"ID", "Nombre", "Fecha nac.", "Sexo", "DNI", "Teléfono", "Email",
			"Objetivo", "Actividad física", "Intolerancias", "Patologías",
			"Notas", "Nº revisiones", "Nº fotos", "Fecha alta"},
		[]float64{6, 28, 14, 10, 14, 14, 28, 22, 20, 30, 30, 35, 12, 8, 18})
	for i, p := range pacientes {
		setRow(f, sheet1, i+2, []any{
			p.ID, p.Nombre, p.FechaNac, p.Sexo, p.DNI, p.Telefono, p.Email,
			p.Objetivo, p.ActividadFisica, p.Intolerancias, p.Patologias,
			p.Notas, p.NumRevisiones, p.NumFotos, p.Creado,
		})
	}

	// --- Hoja 2: Revisiones ---
	sheet2 := "Revisiones"
	f.NewSheet(sheet2)
	cabecera(sheet2,
		[]string{"ID Rev.", "Paciente", "Fecha revisión",
			"Peso (kg)", "Talla (cm)", "Envergadura (cm)",
			"Pl. Bicipital", "Pl. Tricipital", "Pl. Subescapular", "Pl. Supraespinal",
			"Pl. Supracrestal", "Pl. Abdominal", "Pl. Muslo int.", "Pl. Pierna med.",
			"Per. Antebrazo", "Per. Brazo rel.", "Per. Brazo cont.", "Per. Hombros",
			"Per. Pecho", "Per. Cintura", "Per. Caderas", "Per. Muslo",
			"Per. Muslo cont.", "Per. Gemelo", "Notas"},
		[]float64{8, 28, 16, 10, 10, 14, 13, 13, 16, 16, 16, 14, 14, 15,
			14, 14, 15, 13, 11, 12, 12, 11, 14, 12, 35})

	var revs []revRow
	if idStr != "" && len(pacientes) > 0 {
		var id int64
		fmt.Sscan(idStr, &id)
		rs, err := s.st.Revisiones(id)
		if err != nil {
			writeError(w, http.StatusInternalServerError, err.Error())
			return
		}
		for _, rv := range rs {
			revs = append(revs, revRow{rv, pacientes[0].Nombre})
		}
	} else {
		rc, err := s.st.RevisionesConNombre()
		if err != nil {
			writeError(w, http.StatusInternalServerError, err.Error())
			return
		}
		for _, x := range rc {
			revs = append(revs, revRow{x.Rev, x.Nombre})
		}
	}
	for i, rv := range revs {
		r := rv.rev
		setRow(f, sheet2, i+2, []any{
			r.ID, rv.nombre, r.Fecha, r.Peso, r.Talla, r.Envergadura,
			r.PlBicipital, r.PlTricipital, r.PlSubescapular, r.PlSupraespinal,
			r.PlSupracrestal, r.PlAbdominal, r.PlMusloInt, r.PlPiernaMed,
			r.PerAntebrazo, r.PerBrazoRel, r.PerBrazoCont, r.PerHombros,
			r.PerPecho, r.PerCintura, r.PerCaderas, r.PerMuslo, r.PerMusloCont,
			r.PerGemelo, r.Notas,
		})
	}

	nombrePac := "nutricion"
	if singleName != "" {
		nombrePac = strings.ReplaceAll(singleName, " ", "_")
	}
	filename := fmt.Sprintf("%s_%s.xlsx", nombrePac, time.Now().Format("20060102_1504"))
	sendXLSX(w, f, filename)
}

type revRow struct {
	rev    models.Revision
	nombre string
}

func (s *Server) handleExportRevision(w http.ResponseWriter, r *http.Request) {
	id, err := pathInt(r, "id")
	if err != nil {
		writeError(w, http.StatusBadRequest, "id inválido")
		return
	}
	rev, err := s.st.Revision(id)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	if rev == nil {
		writeError(w, http.StatusNotFound, "No encontrado")
		return
	}
	pac, err := s.st.Paciente(rev.PacienteID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	if pac == nil {
		writeError(w, http.StatusNotFound, "Paciente no encontrado")
		return
	}

	f := excelize.NewFile()
	defer f.Close()
	sheet := "Revisión"
	f.SetSheetName("Sheet1", sheet)
	f.SetColWidth(sheet, "A", "A", 28)
	f.SetColWidth(sheet, "B", "B", 35)

	negrita, _ := f.NewStyle(&excelize.Style{Font: &excelize.Font{Bold: true, Size: 11}})
	seccion, _ := f.NewStyle(&excelize.Style{Font: &excelize.Font{Bold: true, Size: 10, Color: verde}})
	titulo, _ := f.NewStyle(&excelize.Style{
		Fill:      excelize.Fill{Type: "pattern", Color: []string{verde}, Pattern: 1},
		Font:      &excelize.Font{Bold: true, Color: "FFFFFF", Size: 12},
		Alignment: &excelize.Alignment{Horizontal: "center", Vertical: "center"},
	})

	fecha := strVal(rev.Fecha)
	f.SetCellValue(sheet, "A1", fmt.Sprintf("Revisión — %s  (%s)", pac.Nombre, fecha))
	f.MergeCell(sheet, "A1", "B1")
	f.SetCellStyle(sheet, "A1", "B1", titulo)
	f.SetRowHeight(sheet, 1, 24)

	f.SetCellValue(sheet, "A2", "DATOS DEL PACIENTE")
	f.SetCellStyle(sheet, "A2", "A2", seccion)

	datos := [][2]any{
		{"Nombre", pac.Nombre},
		{"Fecha nacimiento", strVal(pac.FechaNac)},
		{"Sexo", strVal(pac.Sexo)},
		{"DNI", strVal(pac.DNI)},
		{"Teléfono", strVal(pac.Telefono)},
		{"Email", strVal(pac.Email)},
		{"Objetivo", strVal(pac.Objetivo)},
		{"Actividad física", strVal(pac.ActividadFisica)},
		{"Talla (cm)", floatOrEmpty(pac.Talla)},
		{"Peso inicial (kg)", floatOrEmpty(pac.Peso)},
	}
	row := 3
	for _, d := range datos {
		writeKV(f, sheet, row, d[0], d[1], negrita)
		row++
	}

	sep := 3 + len(datos) + 1
	f.SetCellValue(sheet, fmt.Sprintf("A%d", sep), "MEDIDAS DE LA REVISIÓN")
	f.SetCellStyle(sheet, fmt.Sprintf("A%d", sep), fmt.Sprintf("A%d", sep), seccion)

	medidas := [][2]any{
		{"Fecha revisión", fecha},
		{"Peso (kg)", floatOrEmpty(rev.Peso)},
		{"Envergadura (cm)", floatOrEmpty(rev.Envergadura)},
		{"Pl. Bicipital", floatOrEmpty(rev.PlBicipital)},
		{"Pl. Tricipital", floatOrEmpty(rev.PlTricipital)},
		{"Pl. Subescapular", floatOrEmpty(rev.PlSubescapular)},
		{"Pl. Supraespinal", floatOrEmpty(rev.PlSupraespinal)},
		{"Pl. Supracrestal", floatOrEmpty(rev.PlSupracrestal)},
		{"Pl. Abdominal", floatOrEmpty(rev.PlAbdominal)},
		{"Pl. Muslo int.", floatOrEmpty(rev.PlMusloInt)},
		{"Pl. Pierna med.", floatOrEmpty(rev.PlPiernaMed)},
		{"Per. Antebrazo", floatOrEmpty(rev.PerAntebrazo)},
		{"Per. Brazo relaj.", floatOrEmpty(rev.PerBrazoRel)},
		{"Per. Brazo cont.", floatOrEmpty(rev.PerBrazoCont)},
		{"Per. Hombros", floatOrEmpty(rev.PerHombros)},
		{"Per. Pecho", floatOrEmpty(rev.PerPecho)},
		{"Per. Cintura", floatOrEmpty(rev.PerCintura)},
		{"Per. Caderas", floatOrEmpty(rev.PerCaderas)},
		{"Per. Muslo", floatOrEmpty(rev.PerMuslo)},
		{"Per. Muslo cont.", floatOrEmpty(rev.PerMusloCont)},
		{"Per. Gemelo", floatOrEmpty(rev.PerGemelo)},
		{"Notas", strVal(rev.Notas)},
	}
	row = sep + 1
	for _, m := range medidas {
		writeKV(f, sheet, row, m[0], m[1], negrita)
		row++
	}

	fechaArchivo := fecha
	if fechaArchivo == "" {
		fechaArchivo = "sin_fecha"
	}
	filename := fmt.Sprintf("revision_%s_%s.xlsx", strings.ReplaceAll(pac.Nombre, " ", "_"), fechaArchivo)
	sendXLSX(w, f, filename)
}

func writeKV(f *excelize.File, sheet string, row int, label, val any, labelStyle int) {
	a := fmt.Sprintf("A%d", row)
	b := fmt.Sprintf("B%d", row)
	f.SetCellValue(sheet, a, label)
	f.SetCellStyle(sheet, a, a, labelStyle)
	f.SetCellValue(sheet, b, val)
}

func strVal(p *string) string {
	if p == nil {
		return ""
	}
	return *p
}

func floatOrEmpty(p *float64) any {
	if p == nil {
		return ""
	}
	return *p
}

// fillCountsPublic expone el relleno de contadores desde el handler de export.
func (s *Server) fillCountsPublic(p *models.Paciente) error {
	return s.st.FillCounts(p)
}

func sendXLSX(w http.ResponseWriter, f *excelize.File, filename string) {
	w.Header().Set("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
	w.Header().Set("Content-Disposition", fmt.Sprintf(`attachment; filename="%s"`, filename))
	if _, err := f.WriteTo(w); err != nil {
		// La cabecera ya pudo enviarse; loguear implícito por el recover.
		return
	}
}
