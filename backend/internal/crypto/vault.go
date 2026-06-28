// Package crypto implementa el cifrado en sobre (envelope) que protege la clave
// de cifrado de la base de datos. Una clave de datos aleatoria (DEK) cifra la
// BD; esa DEK se guarda envuelta dos veces, una bajo la contraseña maestra y
// otra bajo una clave de recuperación, de modo que cualquiera de los dos
// secretos pueda abrir los datos. Si se pierden ambos, los datos son
// irrecuperables por diseño.
package crypto

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"encoding/base32"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"strings"

	"golang.org/x/crypto/argon2"
)

// ErrSecretoIncorrecto se devuelve cuando ni la contraseña ni la clave de
// recuperación abren el sobre.
var ErrSecretoIncorrecto = errors.New("contraseña o clave de recuperación incorrecta")

const (
	dekLen   = 32 // tamaño de la clave de datos (Adiantum usa 256 bits)
	saltLen  = 16
	recBytes = 20 // 20 bytes -> 32 caracteres base32 para la clave de recuperación

	// Parámetros Argon2id. Equilibran coste y seguridad para derivar la clave
	// que envuelve la DEK a partir de un secreto tecleado.
	argonTime    = 3
	argonMemory  = 64 * 1024 // 64 MiB
	argonThreads = 4
)

// sobre guarda una copia de la DEK cifrada bajo un secreto concreto.
type sobre struct {
	Salt   string `json:"salt"`   // base64
	Nonce  string `json:"nonce"`  // base64
	Cipher string `json:"cipher"` // base64 (DEK cifrada con AES-256-GCM)
}

// Vault es el contenido del fichero de claves: la DEK envuelta bajo la
// contraseña y bajo la clave de recuperación.
type Vault struct {
	Version   int   `json:"version"`
	Password  sobre `json:"password"`
	Recuperar sobre `json:"recuperacion"`
}

// NuevoVault genera una DEK y una clave de recuperación nuevas, envuelve la DEK
// bajo la contraseña y bajo la recuperación, y devuelve el vault, la DEK en
// claro (para abrir la BD ahora) y la clave de recuperación legible (que se
// debe mostrar UNA vez al usuario).
func NuevoVault(password string) (v *Vault, dek []byte, recoveryKey string, err error) {
	dek = make([]byte, dekLen)
	if _, err = io.ReadFull(rand.Reader, dek); err != nil {
		return nil, nil, "", err
	}
	recoveryKey, err = generarRecoveryKey()
	if err != nil {
		return nil, nil, "", err
	}
	v = &Vault{Version: 1}
	if v.Password, err = envolver(dek, password); err != nil {
		return nil, nil, "", err
	}
	if v.Recuperar, err = envolver(dek, normalizarRecovery(recoveryKey)); err != nil {
		return nil, nil, "", err
	}
	return v, dek, recoveryKey, nil
}

// Abrir intenta recuperar la DEK con el secreto dado (contraseña o clave de
// recuperación). Devuelve ErrSecretoIncorrecto si ninguno encaja.
func (v *Vault) Abrir(secreto string) ([]byte, error) {
	if dek, err := desenvolver(v.Password, secreto); err == nil {
		return dek, nil
	}
	if dek, err := desenvolver(v.Recuperar, normalizarRecovery(secreto)); err == nil {
		return dek, nil
	}
	return nil, ErrSecretoIncorrecto
}

// CambiarPassword reescribe el sobre de la contraseña con una nueva, usando la
// DEK ya conocida (obtenida tras abrir el vault). No cambia la recuperación.
func (v *Vault) CambiarPassword(dek []byte, nueva string) error {
	s, err := envolver(dek, nueva)
	if err != nil {
		return err
	}
	v.Password = s
	return nil
}

// envolver cifra la DEK con una clave derivada del secreto (Argon2id + AES-GCM).
func envolver(dek []byte, secreto string) (sobre, error) {
	salt := make([]byte, saltLen)
	if _, err := io.ReadFull(rand.Reader, salt); err != nil {
		return sobre{}, err
	}
	kek := derivar(secreto, salt)
	gcm, err := nuevoGCM(kek)
	if err != nil {
		return sobre{}, err
	}
	nonce := make([]byte, gcm.NonceSize())
	if _, err := io.ReadFull(rand.Reader, nonce); err != nil {
		return sobre{}, err
	}
	ct := gcm.Seal(nil, nonce, dek, nil)
	return sobre{
		Salt:   base64.StdEncoding.EncodeToString(salt),
		Nonce:  base64.StdEncoding.EncodeToString(nonce),
		Cipher: base64.StdEncoding.EncodeToString(ct),
	}, nil
}

// desenvolver recupera la DEK de un sobre con el secreto dado.
func desenvolver(s sobre, secreto string) ([]byte, error) {
	salt, err := base64.StdEncoding.DecodeString(s.Salt)
	if err != nil {
		return nil, err
	}
	nonce, err := base64.StdEncoding.DecodeString(s.Nonce)
	if err != nil {
		return nil, err
	}
	ct, err := base64.StdEncoding.DecodeString(s.Cipher)
	if err != nil {
		return nil, err
	}
	gcm, err := nuevoGCM(derivar(secreto, salt))
	if err != nil {
		return nil, err
	}
	return gcm.Open(nil, nonce, ct, nil)
}

func derivar(secreto string, salt []byte) []byte {
	return argon2.IDKey([]byte(secreto), salt, argonTime, argonMemory, argonThreads, dekLen)
}

func nuevoGCM(key []byte) (cipher.AEAD, error) {
	block, err := aes.NewCipher(key)
	if err != nil {
		return nil, err
	}
	return cipher.NewGCM(block)
}

// generarRecoveryKey crea una clave de recuperación legible: base32 en grupos
// de 4 separados por guiones (p. ej. ABCD-EFGH-...).
func generarRecoveryKey() (string, error) {
	raw := make([]byte, recBytes)
	if _, err := io.ReadFull(rand.Reader, raw); err != nil {
		return "", err
	}
	s := base32.StdEncoding.WithPadding(base32.NoPadding).EncodeToString(raw)
	var grupos []string
	for i := 0; i < len(s); i += 4 {
		fin := min(i+4, len(s))
		grupos = append(grupos, s[i:fin])
	}
	return strings.Join(grupos, "-"), nil
}

// normalizarRecovery quita guiones/espacios y pasa a mayúsculas, para que la
// clave de recuperación abra igual aunque se teclee con o sin formato.
func normalizarRecovery(s string) string {
	r := strings.NewReplacer("-", "", " ", "")
	return strings.ToUpper(r.Replace(strings.TrimSpace(s)))
}

// Serializar devuelve el vault como JSON indentado.
func (v *Vault) Serializar() ([]byte, error) {
	return json.MarshalIndent(v, "", "  ")
}

// Parse lee un vault desde JSON.
func Parse(data []byte) (*Vault, error) {
	var v Vault
	if err := json.Unmarshal(data, &v); err != nil {
		return nil, fmt.Errorf("fichero de claves inválido: %w", err)
	}
	return &v, nil
}
