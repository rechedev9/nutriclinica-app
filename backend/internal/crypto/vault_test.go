package crypto

import (
	"bytes"
	"strings"
	"testing"
)

func TestVaultPasswordYRecuperacion(t *testing.T) {
	v, dek, recovery, err := NuevoVault("micontraseña-larga")
	if err != nil {
		t.Fatal(err)
	}
	if len(dek) != dekLen {
		t.Fatalf("DEK de %d bytes, se esperaban %d", len(dek), dekLen)
	}

	// La contraseña abre y devuelve la misma DEK.
	d1, err := v.Abrir("micontraseña-larga")
	if err != nil {
		t.Fatalf("la contraseña debería abrir: %v", err)
	}
	if !bytes.Equal(d1, dek) {
		t.Error("la DEC abierta con contraseña no coincide")
	}

	// La clave de recuperación abre y devuelve la misma DEK.
	d2, err := v.Abrir(recovery)
	if err != nil {
		t.Fatalf("la recuperación debería abrir: %v", err)
	}
	if !bytes.Equal(d2, dek) {
		t.Error("la DEK abierta con recuperación no coincide")
	}

	// La recuperación abre aunque se teclee sin guiones y en minúsculas.
	sinFormato := strings.ToLower(strings.ReplaceAll(recovery, "-", ""))
	if _, err := v.Abrir(sinFormato); err != nil {
		t.Errorf("la recuperación sin formato debería abrir: %v", err)
	}

	// Un secreto incorrecto falla.
	if _, err := v.Abrir("otra-cosa"); err == nil {
		t.Error("un secreto incorrecto no debería abrir")
	}
}

func TestVaultCambiarPassword(t *testing.T) {
	v, dek, _, err := NuevoVault("vieja-contraseña")
	if err != nil {
		t.Fatal(err)
	}
	if err := v.CambiarPassword(dek, "nueva-contraseña"); err != nil {
		t.Fatal(err)
	}
	if _, err := v.Abrir("vieja-contraseña"); err == nil {
		t.Error("la contraseña vieja ya no debería abrir")
	}
	d, err := v.Abrir("nueva-contraseña")
	if err != nil || !bytes.Equal(d, dek) {
		t.Errorf("la nueva contraseña debería abrir con la misma DEK: %v", err)
	}
}

func TestVaultSerializarYParse(t *testing.T) {
	v, dek, _, err := NuevoVault("contraseña-de-prueba")
	if err != nil {
		t.Fatal(err)
	}
	data, err := v.Serializar()
	if err != nil {
		t.Fatal(err)
	}
	v2, err := Parse(data)
	if err != nil {
		t.Fatal(err)
	}
	d, err := v2.Abrir("contraseña-de-prueba")
	if err != nil || !bytes.Equal(d, dek) {
		t.Errorf("el vault reparseado debería abrir con la misma DEK: %v", err)
	}
}
