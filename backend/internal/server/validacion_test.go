package server

import (
	"testing"
	"time"

	"nutriclinica/internal/models"
)

func fp(v float64) *float64 { return &v }
func sp(v string) *string   { return &v }

var hoyTest = time.Date(2026, 10, 12, 10, 0, 0, 0, time.UTC)

func TestValidarPaciente(t *testing.T) {
	casos := []struct {
		nombre string
		in     models.PacienteInput
		want   string
	}{
		{"valido", models.PacienteInput{Nombre: "Ana", FechaNac: sp("1990-05-01"), Peso: fp(70), Talla: fp(170)}, ""},
		{"solo nombre", models.PacienteInput{Nombre: "Ana"}, ""},
		{"sin nombre", models.PacienteInput{}, "El nombre es obligatorio"},
		{"nacimiento futuro", models.PacienteInput{Nombre: "A", FechaNac: sp("2027-01-01")}, "La fecha de nacimiento no es válida"},
		{"nacimiento antiguo", models.PacienteInput{Nombre: "A", FechaNac: sp("1899-12-31")}, "La fecha de nacimiento no es válida"},
		{"nacimiento basura", models.PacienteInput{Nombre: "A", FechaNac: sp("ayer")}, "La fecha de nacimiento no es válida"},
		{"peso negativo", models.PacienteInput{Nombre: "A", Peso: fp(-5)}, "El peso debe estar entre 1 y 500 kg"},
		{"peso alto", models.PacienteInput{Nombre: "A", Peso: fp(501)}, "El peso debe estar entre 1 y 500 kg"},
		{"talla 9999", models.PacienteInput{Nombre: "A", Talla: fp(9999)}, "La talla debe estar entre 30 y 260 cm"},
		{"talla baja", models.PacienteInput{Nombre: "A", Talla: fp(29)}, "La talla debe estar entre 30 y 260 cm"},
	}
	for _, c := range casos {
		in := c.in
		if got := validarPaciente(&in, hoyTest); got != c.want {
			t.Errorf("%s: got %q, want %q", c.nombre, got, c.want)
		}
	}
}

func TestValidarRevision(t *testing.T) {
	base := func() models.Revision {
		return models.Revision{Fecha: sp("2026-10-12"), Peso: fp(70)}
	}
	casos := []struct {
		nombre string
		mod    func(r *models.Revision)
		want   string
	}{
		{"valida", func(r *models.Revision) {}, ""},
		{"mañana vale", func(r *models.Revision) { r.Fecha = sp("2026-10-13") }, ""},
		{"futura", func(r *models.Revision) { r.Fecha = sp("2026-10-14") }, "La fecha de la revisión no puede ser futura"},
		{"sin fecha", func(r *models.Revision) { r.Fecha = nil }, "La fecha de la revisión es obligatoria"},
		{"peso negativo", func(r *models.Revision) { r.Peso = fp(-1) }, "El peso debe estar entre 1 y 500 kg"},
		{"envergadura", func(r *models.Revision) { r.Envergadura = fp(301) }, "La envergadura debe estar entre 30 y 300 cm"},
		{"pliegue enorme", func(r *models.Revision) { r.PlTricipital = fp(99999) }, "Los pliegues deben estar entre 0 y 100 mm"},
		{"pliegue cero", func(r *models.Revision) { r.PlBicipital = fp(0) }, "Los pliegues deben estar entre 0 y 100 mm"},
		{"perimetro enorme", func(r *models.Revision) { r.PerCintura = fp(301) }, "Los perímetros deben estar entre 0 y 300 cm"},
		{"sin medidas ni nota", func(r *models.Revision) { r.Peso = nil }, "La revisión debe incluir al menos una medida o una nota"},
		{"solo nota", func(r *models.Revision) { r.Peso = nil; r.Notas = sp("revisión sin medidas") }, ""},
	}
	for _, c := range casos {
		r := base()
		c.mod(&r)
		if got := validarRevision(&r, hoyTest); got != c.want {
			t.Errorf("%s: got %q, want %q", c.nombre, got, c.want)
		}
	}
}

func TestValidarLineasYProducto(t *testing.T) {
	l := func(cant float64, precio *float64) []models.LineaInput {
		return []models.LineaInput{{ProductoID: 1, Cantidad: cant, PrecioUnitario: precio}}
	}
	if got := validarLineas(nil, "compra"); got != "La compra debe tener al menos una línea" {
		t.Errorf("compra vacía: %q", got)
	}
	if got := validarLineas(nil, "venta"); got != "La venta debe tener al menos una línea" {
		t.Errorf("venta vacía: %q", got)
	}
	if got := validarLineas(l(0, nil), "venta"); got != "La cantidad debe ser mayor que 0" {
		t.Errorf("cantidad 0: %q", got)
	}
	if got := validarLineas(l(-3, fp(1)), "venta"); got != "La cantidad debe ser mayor que 0" {
		t.Errorf("cantidad negativa: %q", got)
	}
	if got := validarLineas(l(1, fp(-1)), "compra"); got != "El precio no puede ser negativo" {
		t.Errorf("precio negativo: %q", got)
	}
	if got := validarLineas(l(2, fp(0)), "compra"); got != "" {
		t.Errorf("línea válida: %q", got)
	}

	if got := validarProducto(&models.ProductoInput{Nombre: "X", PrecioVenta: fp(-1)}); got != "El precio no puede ser negativo" {
		t.Errorf("precio venta: %q", got)
	}
	if got := validarProducto(&models.ProductoInput{Nombre: "X", PrecioCoste: fp(-1)}); got != "El precio no puede ser negativo" {
		t.Errorf("precio coste: %q", got)
	}
	if got := validarProducto(&models.ProductoInput{Nombre: "X", StockMinimo: fp(-1)}); got != "El stock mínimo no puede ser negativo" {
		t.Errorf("stock mínimo: %q", got)
	}
	if got := validarProducto(&models.ProductoInput{Nombre: "X"}); got != "" {
		t.Errorf("producto válido: %q", got)
	}
}
