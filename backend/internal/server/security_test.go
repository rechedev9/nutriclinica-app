package server

import (
	"path/filepath"
	"testing"
	"time"
)

func TestValidarPassword(t *testing.T) {
	casos := []struct {
		pass   string
		valida bool
	}{
		{"", false},
		{"corta", false},
		{"1234567", false},
		{"12345678", true},
		{"contraseña-larga", true},
	}
	for _, c := range casos {
		got := validarPassword(c.pass) == ""
		if got != c.valida {
			t.Errorf("validarPassword(%q) válida=%v, se esperaba %v", c.pass, got, c.valida)
		}
	}
}

func TestRateLimiter(t *testing.T) {
	ahora := time.Unix(1_700_000_000, 0)
	rl := newRateLimiter(3, time.Minute)
	rl.nowFn = func() time.Time { return ahora }

	for i := range 3 {
		if !rl.permite("1.2.3.4") {
			t.Fatalf("intento %d debería permitirse", i+1)
		}
	}
	if rl.permite("1.2.3.4") {
		t.Fatal("el 4º intento dentro de la ventana debería bloquearse")
	}
	// Otra IP no se ve afectada.
	if !rl.permite("5.6.7.8") {
		t.Fatal("una IP distinta no debería estar limitada")
	}
	// Pasada la ventana, se vuelve a permitir.
	ahora = ahora.Add(2 * time.Minute)
	if !rl.permite("1.2.3.4") {
		t.Fatal("tras expirar la ventana debería permitirse de nuevo")
	}
}

func TestDentroDe(t *testing.T) {
	base := filepath.FromSlash("/datos/fotos")
	dentro := []string{
		filepath.Join(base, "juan", "foto.jpg"),
		base,
	}
	fuera := []string{
		filepath.Join(base, "..", "secret.db"),
		filepath.FromSlash("/datos/otros/x.jpg"),
	}
	for _, p := range dentro {
		if !dentroDe(base, p) {
			t.Errorf("dentroDe(%q) = false, se esperaba true", p)
		}
	}
	for _, p := range fuera {
		if dentroDe(base, p) {
			t.Errorf("dentroDe(%q) = true, se esperaba false", p)
		}
	}
}
