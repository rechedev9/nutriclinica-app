package server

import (
	"bytes"
	"encoding/base64"
	"encoding/json"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strconv"
	"testing"

	"nutriclinica/internal/crypto"
	"nutriclinica/internal/models"
	"nutriclinica/internal/store"
)

// PNG 1x1 válido (la subida valida que el contenido es una imagen real).
const png1x1B64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="

func TestFotosCifradoEnReposo(t *testing.T) {
	dir := t.TempDir()
	fotosDir := filepath.Join(dir, "fotos")
	dek := bytes.Repeat([]byte{3}, 32)

	st, err := store.Open(filepath.Join(dir, "test.db"), dek)
	if err != nil {
		t.Fatal(err)
	}
	defer st.Close()
	if err := st.Migrate(); err != nil {
		t.Fatal(err)
	}
	p, err := st.CreatePaciente(models.PacienteInput{Nombre: "Foto Test"})
	if err != nil {
		t.Fatal(err)
	}
	fotoKey, err := crypto.DerivarClaveFotos(dek)
	if err != nil {
		t.Fatal(err)
	}

	srv := &Server{fotosDir: fotosDir, fotoKey: fotoKey}
	srv.st.Store(st)

	png, _ := base64.StdEncoding.DecodeString(png1x1B64)

	// --- Subir la foto ---
	body := &bytes.Buffer{}
	mw := multipart.NewWriter(body)
	fw, _ := mw.CreateFormFile("foto", "test.png")
	fw.Write(png)
	mw.Close()
	req := httptest.NewRequest(http.MethodPost, "/api/pacientes/1/fotos", body)
	req.Header.Set("Content-Type", mw.FormDataContentType())
	req.SetPathValue("id", strconv.FormatInt(p.ID, 10))
	rec := httptest.NewRecorder()
	srv.handleUploadFoto(rec, req)
	if rec.Code != http.StatusCreated {
		t.Fatalf("subida: status %d, cuerpo %s", rec.Code, rec.Body.String())
	}
	var foto models.Foto
	if err := json.Unmarshal(rec.Body.Bytes(), &foto); err != nil {
		t.Fatal(err)
	}

	// --- El fichero en disco debe estar cifrado (no es un PNG) ---
	enDisco, err := os.ReadFile(filepath.Join(fotosDir, filepath.FromSlash(foto.Filename)))
	if err != nil {
		t.Fatal(err)
	}
	if !crypto.EstaCifradoFichero(enDisco) {
		t.Error("la foto en disco debería estar cifrada (con la marca)")
	}
	if bytes.HasPrefix(enDisco, png) {
		t.Error("la foto en disco no debería ser el PNG en claro")
	}

	// --- Servirla debe devolver el PNG original ---
	req2 := httptest.NewRequest(http.MethodGet, "/fotos/"+foto.Filename, nil)
	req2.SetPathValue("path", foto.Filename)
	rec2 := httptest.NewRecorder()
	srv.handleServeFoto(rec2, req2)
	if rec2.Code != http.StatusOK {
		t.Fatalf("servir: status %d", rec2.Code)
	}
	if !bytes.Equal(rec2.Body.Bytes(), png) {
		t.Error("la foto servida no coincide con el PNG original")
	}
}

func TestCifrarFotosExistentes(t *testing.T) {
	dir := t.TempDir()
	sub := filepath.Join(dir, "Juan")
	if err := os.MkdirAll(sub, 0o700); err != nil {
		t.Fatal(err)
	}
	png, _ := base64.StdEncoding.DecodeString(png1x1B64)
	plano := filepath.Join(sub, "foto.png")
	if err := os.WriteFile(plano, png, 0o600); err != nil {
		t.Fatal(err)
	}
	key, _ := crypto.DerivarClaveFotos(bytes.Repeat([]byte{5}, 32))

	if err := cifrarFotosExistentes(dir, key); err != nil {
		t.Fatal(err)
	}
	data, _ := os.ReadFile(plano)
	if !crypto.EstaCifradoFichero(data) {
		t.Error("tras migrar, la foto debería estar cifrada")
	}
	dec, err := crypto.DescifrarFichero(key, data)
	if err != nil || !bytes.Equal(dec, png) {
		t.Errorf("la foto migrada debería descifrar al original: %v", err)
	}
	// Idempotente: una segunda pasada no la rompe.
	if err := cifrarFotosExistentes(dir, key); err != nil {
		t.Fatal(err)
	}
	data2, _ := os.ReadFile(plano)
	dec2, err := crypto.DescifrarFichero(key, data2)
	if err != nil || !bytes.Equal(dec2, png) {
		t.Errorf("tras segunda pasada debería seguir descifrando al original: %v", err)
	}
}
