package server

import (
	"time"

	"nutriclinica/internal/models"
)

const layoutFecha = "2006-01-02"

// parseFecha lee los 10 primeros caracteres como AAAA-MM-DD (admite sufijo de hora).
func parseFecha(s string) (time.Time, bool) {
	if len(s) < 10 {
		return time.Time{}, false
	}
	t, err := time.Parse(layoutFecha, s[:10])
	return t, err == nil
}

func fueraDeRango(p *float64, min, max float64) bool {
	return p != nil && (*p < min || *p > max)
}

// validarPaciente devuelve el mensaje de error o "" si los datos son válidos.
func validarPaciente(in *models.PacienteInput, hoy time.Time) string {
	if in.Nombre == "" {
		return "El nombre es obligatorio"
	}
	if in.FechaNac != nil {
		t, okFecha := parseFecha(*in.FechaNac)
		limite := time.Date(1900, 1, 1, 0, 0, 0, 0, time.UTC)
		hoyUTC := time.Date(hoy.Year(), hoy.Month(), hoy.Day(), 0, 0, 0, 0, time.UTC)
		if !okFecha || t.Before(limite) || t.After(hoyUTC) {
			return "La fecha de nacimiento no es válida"
		}
	}
	if fueraDeRango(in.Peso, 1, 500) {
		return "El peso debe estar entre 1 y 500 kg"
	}
	if fueraDeRango(in.Talla, 30, 260) {
		return "La talla debe estar entre 30 y 260 cm"
	}
	return ""
}

// validarRevision devuelve el mensaje de error o "" si la revisión es válida.
func validarRevision(r *models.Revision, hoy time.Time) string {
	if r.Fecha == nil {
		return "La fecha de la revisión es obligatoria"
	}
	t, okFecha := parseFecha(*r.Fecha)
	if !okFecha {
		return "La fecha de la revisión no es válida"
	}
	manana := time.Date(hoy.Year(), hoy.Month(), hoy.Day(), 0, 0, 0, 0, time.UTC).AddDate(0, 0, 1)
	if t.After(manana) {
		return "La fecha de la revisión no puede ser futura"
	}
	if fueraDeRango(r.Peso, 1, 500) {
		return "El peso debe estar entre 1 y 500 kg"
	}
	if fueraDeRango(r.Talla, 30, 260) {
		return "La talla debe estar entre 30 y 260 cm"
	}
	if fueraDeRango(r.Envergadura, 30, 300) {
		return "La envergadura debe estar entre 30 y 300 cm"
	}
	pliegues := []*float64{r.PlBicipital, r.PlTricipital, r.PlSubescapular, r.PlSupraespinal,
		r.PlSupracrestal, r.PlAbdominal, r.PlMusloInt, r.PlPiernaMed}
	perimetros := []*float64{r.PerAntebrazo, r.PerBrazoRel, r.PerBrazoCont, r.PerHombros, r.PerPecho,
		r.PerCintura, r.PerCaderas, r.PerMuslo, r.PerMusloCont, r.PerGemelo}
	for _, p := range pliegues {
		if p != nil && (*p <= 0 || *p > 100) {
			return "Los pliegues deben estar entre 0 y 100 mm"
		}
	}
	for _, p := range perimetros {
		if p != nil && (*p <= 0 || *p > 300) {
			return "Los perímetros deben estar entre 0 y 300 cm"
		}
	}
	hayMedida := r.Peso != nil || r.Talla != nil || r.Envergadura != nil
	for _, p := range append(pliegues, perimetros...) {
		if p != nil {
			hayMedida = true
		}
	}
	if !hayMedida && r.Notas == nil {
		return "La revisión debe incluir al menos una medida o una nota"
	}
	return ""
}

func validarProducto(in *models.ProductoInput) string {
	if in.Nombre == "" {
		return "El nombre es obligatorio"
	}
	if (in.PrecioCoste != nil && *in.PrecioCoste < 0) || (in.PrecioVenta != nil && *in.PrecioVenta < 0) {
		return "El precio no puede ser negativo"
	}
	if in.StockMinimo != nil && *in.StockMinimo < 0 {
		return "El stock mínimo no puede ser negativo"
	}
	return ""
}

// validarLineas comprueba las líneas de una compra o venta; entidad es "compra" o "venta".
func validarLineas(lineas []models.LineaInput, entidad string) string {
	if len(lineas) == 0 {
		if entidad == "venta" {
			return "La venta debe tener al menos una línea"
		}
		return "La compra debe tener al menos una línea"
	}
	for _, l := range lineas {
		if l.ProductoID == 0 {
			return "El producto es obligatorio"
		}
		if l.Cantidad <= 0 {
			return "La cantidad debe ser mayor que 0"
		}
		if l.PrecioUnitario != nil && *l.PrecioUnitario < 0 {
			return "El precio no puede ser negativo"
		}
	}
	return ""
}
