package store

import (
	"encoding/hex"
	"fmt"
	"net/url"
	"os"

	"github.com/ncruces/go-sqlite3"
)

// CifrarBaseExistente convierte una BD SQLite en claro en su equivalente cifrada
// con Adiantum usando la clave dek. Usa la API de backup de SQLite (copia las
// páginas a través del VFS de cifrado del destino) y deja el fichero original
// en <path>.plain-bak como red de seguridad.
//
// AVISO: <path>.plain-bak queda SIN cifrar. Se conserva a propósito por si la
// migración fallara; debe borrarse a mano tras comprobar que todo va bien.
func CifrarBaseExistente(path string, dek []byte) error {
	tmp := path + ".enc-tmp"
	_ = os.Remove(tmp)
	_ = os.Remove(tmp + "-wal")
	_ = os.Remove(tmp + "-shm")

	// Abrir la BD en claro (VFS por defecto) y volcarla al destino cifrado.
	src, err := sqlite3.Open("file:" + url.PathEscape(path) + "?_pragma=busy_timeout(5000)")
	if err != nil {
		return fmt.Errorf("abriendo BD en claro: %w", err)
	}
	dstURI := "file:" + url.PathEscape(tmp) + "?vfs=adiantum&hexkey=" + hex.EncodeToString(dek)
	if err := src.Backup("main", dstURI); err != nil {
		src.Close()
		_ = os.Remove(tmp)
		return fmt.Errorf("copiando a BD cifrada: %w", err)
	}
	if err := src.Close(); err != nil {
		_ = os.Remove(tmp)
		return fmt.Errorf("cerrando BD en claro: %w", err)
	}

	// Reemplazar de forma ordenada: el original a .plain-bak, el cifrado a path,
	// y limpiar los WAL/SHM en claro para que no confundan a la BD cifrada.
	bak := path + ".plain-bak"
	_ = os.Remove(bak)
	if err := os.Rename(path, bak); err != nil {
		_ = os.Remove(tmp)
		return fmt.Errorf("respaldando BD en claro: %w", err)
	}
	_ = os.Remove(path + "-wal")
	_ = os.Remove(path + "-shm")
	if err := os.Rename(tmp, path); err != nil {
		_ = os.Rename(bak, path) // restaurar el original
		return fmt.Errorf("instalando BD cifrada: %w", err)
	}
	return nil
}
