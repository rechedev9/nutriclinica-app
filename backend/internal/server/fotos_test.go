package server

import (
	"bytes"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strconv"
	"testing"
	"time"

	"nutriclinica/internal/config"
	"nutriclinica/internal/crypto"
	"nutriclinica/internal/models"
	"nutriclinica/internal/store"
)

// PNG 1x1 válido (la subida valida que el contenido es una imagen real).
const png1x1B64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="

// abrirStoreTest crea un esquema de Postgres desechable y devuelve un Store
// migrado sobre él (test de integración: se omite si no hay Postgres
// configurado en NUTRICLINICA_PG_*).
func abrirStoreTest(t *testing.T) *store.Store {
	t.Helper()
	base, err := config.PostgresFromEnv()
	if err != nil {
		t.Skipf("Postgres no configurado para tests de integración: %v", err)
	}
	schema := fmt.Sprintf("test_%d", time.Now().UnixNano())

	admin, err := store.Open(base)
	if err != nil {
		t.Fatalf("conectando a Postgres: %v", err)
	}
	if _, err := admin.DB.Exec(`CREATE SCHEMA "` + schema + `"`); err != nil {
		admin.Close()
		t.Fatalf("creando esquema de prueba: %v", err)
	}
	t.Cleanup(func() {
		admin.DB.Exec(`DROP SCHEMA "` + schema + `" CASCADE`)
		admin.Close()
	})

	base.SearchPath = schema
	st, err := store.Open(base)
	if err != nil {
		t.Fatalf("abriendo BD de prueba: %v", err)
	}
	t.Cleanup(func() { st.Close() })
	if err := st.Migrate(); err != nil {
		t.Fatalf("migrando BD de prueba: %v", err)
	}
	return st
}

func TestFotosCifradoEnReposo(t *testing.T) {
	dir := t.TempDir()
	fotosDir := filepath.Join(dir, "fotos")
	// Clave arbitraria de 32 bytes: el cifrado de fotos es independiente del
	// cifrado de la BD (que ya no existe), solo hace falta material de clave
	// para derivar fotoKey vía HKDF.
	dek := bytes.Repeat([]byte{3}, 32)

	st := abrirStoreTest(t)
	p, err := st.CreatePaciente(models.PacienteInput{Nombre: "Foto Test"})
	if err != nil {
		t.Fatal(err)
	}
	fotoKey, err := crypto.DerivarClaveFotos(dek)
	if err != nil {
		t.Fatal(err)
	}

	srv := &Server{fotosDir: fotosDir, fotoKey: fotoKey, dbStore: st}

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
