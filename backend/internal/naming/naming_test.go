package naming

import "testing"

func TestPrefijo(t *testing.T) {
	cases := map[string]string{
		"Laura Sanchez Moreno":   "laura_sanchez_moreno",
		"Rafael Pascual Morcillo": "rafael_pascual_morcillo",
		"José Pérez Gómez":        "jose_perez_gomez",
		"  Ana   María  ":         "ana_maria",
		"Núñez":                   "nunez",
	}
	for in, want := range cases {
		if got := Prefijo(in); got != want {
			t.Errorf("Prefijo(%q) = %q, quería %q", in, got, want)
		}
	}
}

func TestCarpeta(t *testing.T) {
	// Casos que DEBEN coincidir con las carpetas reales en fotos/.
	cases := map[string]string{
		"Laura Sanchez Moreno":   "LauraSanchezMoreno",
		"Rafael Pascual Morcillo": "RafaelPascualMorcillo",
		"José Pérez Gómez":        "JosePerezGomez",
		"ANA maría":               "AnaMaria",
		"Núñez":                   "Nunez",
	}
	for in, want := range cases {
		if got := Carpeta(in); got != want {
			t.Errorf("Carpeta(%q) = %q, quería %q", in, got, want)
		}
	}
}
