package crypto

import (
	"crypto/rand"
	"crypto/sha256"
	"errors"
	"io"

	"golang.org/x/crypto/hkdf"
)

// marcaFoto identifica un fichero de foto cifrado por esta app. Va al principio
// del fichero, seguida del nonce y del texto cifrado (AES-256-GCM).
var marcaFoto = []byte("NUTRIENC1")

// ErrNoCifrado indica que los datos no llevan la marca de fichero cifrado.
var ErrNoCifrado = errors.New("el fichero no está cifrado")

// DerivarClaveFotos deriva una clave de 32 bytes para las fotos a partir de la
// clave de datos (DEK), con HKDF-SHA256 e info distinta, de modo que la clave
// de las fotos no sea la misma que la de la base de datos.
func DerivarClaveFotos(dek []byte) ([]byte, error) {
	key := make([]byte, 32)
	r := hkdf.New(sha256.New, dek, nil, []byte("nutriclinica-fotos-v1"))
	if _, err := io.ReadFull(r, key); err != nil {
		return nil, err
	}
	return key, nil
}

// EstaCifradoFichero indica si data empieza por la marca de foto cifrada.
func EstaCifradoFichero(data []byte) bool {
	return len(data) >= len(marcaFoto) && string(data[:len(marcaFoto)]) == string(marcaFoto)
}

// CifrarFichero cifra los datos completos con la clave dada (AES-256-GCM) y los
// antepone de la marca y el nonce. Pensado para ficheros pequeños (fotos), que
// caben en memoria.
func CifrarFichero(key, plano []byte) ([]byte, error) {
	gcm, err := nuevoGCM(key)
	if err != nil {
		return nil, err
	}
	nonce := make([]byte, gcm.NonceSize())
	if _, err := io.ReadFull(rand.Reader, nonce); err != nil {
		return nil, err
	}
	out := make([]byte, 0, len(marcaFoto)+len(nonce)+len(plano)+gcm.Overhead())
	out = append(out, marcaFoto...)
	out = append(out, nonce...)
	return gcm.Seal(out, nonce, plano, nil), nil
}

// DescifrarFichero invierte CifrarFichero. Devuelve ErrNoCifrado si los datos no
// llevan la marca.
func DescifrarFichero(key, data []byte) ([]byte, error) {
	if !EstaCifradoFichero(data) {
		return nil, ErrNoCifrado
	}
	gcm, err := nuevoGCM(key)
	if err != nil {
		return nil, err
	}
	rest := data[len(marcaFoto):]
	ns := gcm.NonceSize()
	if len(rest) < ns {
		return nil, errors.New("fichero cifrado truncado")
	}
	nonce, ct := rest[:ns], rest[ns:]
	return gcm.Open(nil, nonce, ct, nil)
}
