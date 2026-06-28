package crypto

import (
	"bytes"
	"testing"
)

func TestCifrarDescifrarFichero(t *testing.T) {
	dek := bytes.Repeat([]byte{7}, 32)
	key, err := DerivarClaveFotos(dek)
	if err != nil {
		t.Fatal(err)
	}
	if len(key) != 32 {
		t.Fatalf("clave de %d bytes", len(key))
	}

	plano := []byte("contenido binario de una foto \x00\x01\x02 con bytes raros")
	enc, err := CifrarFichero(key, plano)
	if err != nil {
		t.Fatal(err)
	}
	if !EstaCifradoFichero(enc) {
		t.Error("el cifrado debería llevar la marca")
	}
	if bytes.Contains(enc, plano) {
		t.Error("el texto en claro no debería aparecer en el cifrado")
	}

	dec, err := DescifrarFichero(key, enc)
	if err != nil {
		t.Fatal(err)
	}
	if !bytes.Equal(dec, plano) {
		t.Error("el descifrado no coincide con el original")
	}

	// Una clave distinta no descifra.
	otra, _ := DerivarClaveFotos(bytes.Repeat([]byte{9}, 32))
	if _, err := DescifrarFichero(otra, enc); err == nil {
		t.Error("una clave distinta no debería descifrar")
	}

	// Datos sin marca: ErrNoCifrado.
	if _, err := DescifrarFichero(key, plano); err != ErrNoCifrado {
		t.Errorf("se esperaba ErrNoCifrado, se obtuvo %v", err)
	}

	// La derivación es determinista.
	key2, _ := DerivarClaveFotos(dek)
	if !bytes.Equal(key, key2) {
		t.Error("DerivarClaveFotos debería ser determinista")
	}
}
