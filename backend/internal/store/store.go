// Package store gestiona el acceso a la base de datos SQLite.
package store

import (
	"database/sql"
	"encoding/hex"
	"errors"
	"fmt"
	"net/url"
	"strings"

	"github.com/ncruces/go-sqlite3"
	_ "github.com/ncruces/go-sqlite3/driver"       // registra el driver "sqlite3" (pure-Go, wasm)
	_ "github.com/ncruces/go-sqlite3/vfs/adiantum" // registra el VFS "adiantum" (cifrado en reposo)
)

// Store envuelve la conexión a la base de datos.
type Store struct {
	DB *sql.DB
}

// Open abre la base de datos SQLite en dbPath con WAL, foreign keys y
// busy_timeout activados. Limita el pool a una sola conexión (app de un
// usuario): serializa escrituras y mantiene los pragmas consistentes.
//
// Si dek no es nil, la BD se abre cifrada en reposo con el VFS Adiantum usando
// esa clave de datos de 32 bytes; en ese caso WAL exige locking exclusivo (no
// hay memoria compartida con el VFS de cifrado), lo cual es correcto en esta
// app de un solo proceso.
func Open(dbPath string, dek []byte) (*Store, error) {
	params := []string{
		"_pragma=busy_timeout(5000)",
		"_pragma=foreign_keys(ON)",
		"_pragma=journal_mode(WAL)",
	}
	if dek != nil {
		params = append([]string{
			"vfs=adiantum",
			"hexkey=" + hex.EncodeToString(dek),
		}, params...)
		params = append(params, "_pragma=locking_mode(EXCLUSIVE)")
	}
	dsn := "file:" + url.PathEscape(dbPath) + "?" + strings.Join(params, "&")
	db, err := sql.Open("sqlite3", dsn)
	if err != nil {
		return nil, err
	}
	db.SetMaxOpenConns(1)
	if err := db.Ping(); err != nil {
		db.Close()
		return nil, err
	}
	return &Store{DB: db}, nil
}

// Close cierra la base de datos.
func (s *Store) Close() error { return s.DB.Close() }

// IsUniqueViolation indica si err corresponde a una violación de restricción
// UNIQUE de SQLite, sin depender de comparar el texto del error.
func IsUniqueViolation(err error) bool {
	var se *sqlite3.Error
	if errors.As(err, &se) {
		return se.ExtendedCode() == sqlite3.CONSTRAINT_UNIQUE
	}
	return false
}

// VerifyPragmas comprueba que WAL y foreign_keys están activos en la conexión.
func (s *Store) VerifyPragmas() error {
	var journal string
	if err := s.DB.QueryRow("PRAGMA journal_mode").Scan(&journal); err != nil {
		return err
	}
	var fk int
	if err := s.DB.QueryRow("PRAGMA foreign_keys").Scan(&fk); err != nil {
		return err
	}
	if journal != "wal" {
		return fmt.Errorf("journal_mode esperado wal, obtenido %q", journal)
	}
	if fk != 1 {
		return fmt.Errorf("foreign_keys esperado 1, obtenido %d", fk)
	}
	return nil
}

// IntegrityCheck ejecuta PRAGMA integrity_check y devuelve error si la BBDD
// está corrupta.
func (s *Store) IntegrityCheck() error {
	var result string
	if err := s.DB.QueryRow("PRAGMA integrity_check").Scan(&result); err != nil {
		return err
	}
	if result != "ok" {
		return fmt.Errorf("integrity_check falló: %s", result)
	}
	return nil
}

// OrphanRow describe una fila que viola una restricción de clave foránea.
type OrphanRow struct {
	Table  string
	RowID  int64
	Parent string
	FKID   int64
}

// ForeignKeyCheck devuelve las filas huérfanas detectadas por
// PRAGMA foreign_key_check (no modifica nada).
func (s *Store) ForeignKeyCheck() ([]OrphanRow, error) {
	rows, err := s.DB.Query("PRAGMA foreign_key_check")
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var orphans []OrphanRow
	for rows.Next() {
		var o OrphanRow
		var rowid sql.NullInt64
		if err := rows.Scan(&o.Table, &rowid, &o.Parent, &o.FKID); err != nil {
			return nil, err
		}
		o.RowID = rowid.Int64
		orphans = append(orphans, o)
	}
	return orphans, rows.Err()
}
