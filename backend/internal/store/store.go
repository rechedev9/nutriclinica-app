// Package store gestiona el acceso a la base de datos PostgreSQL.
package store

import (
	"database/sql"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5/pgconn"
	_ "github.com/jackc/pgx/v5/stdlib" // registra el driver "pgx" (pure-Go)
)

// Store envuelve la conexión a la base de datos.
type Store struct {
	DB *sql.DB
}

// Config agrupa los parámetros de conexión a la instancia PostgreSQL (p.ej.
// RDS). SSLMode por defecto es "require" (RDS exige TLS en la conexión).
type Config struct {
	Host     string
	Port     int
	User     string
	Password string
	DBName   string
	SSLMode  string
	// SearchPath, si no está vacío, fija el esquema de Postgres para todas
	// las conexiones del pool (usado por los tests para aislar cada uno en
	// su propio esquema desechable; en producción se deja vacío = "public").
	SearchPath string
}

// Open abre la conexión a PostgreSQL. El pool usa varias conexiones (a
// diferencia del SQLite embebido anterior, que se limitaba a una sola):
// Postgres gestiona la concurrencia de escrituras él mismo.
func Open(cfg Config) (*Store, error) {
	sslMode := cfg.SSLMode
	if sslMode == "" {
		sslMode = "require"
	}
	dsn := fmt.Sprintf(
		"host=%s port=%d user=%s password=%s dbname=%s sslmode=%s",
		cfg.Host, cfg.Port, cfg.User, cfg.Password, cfg.DBName, sslMode,
	)
	if cfg.SearchPath != "" {
		dsn += fmt.Sprintf(" options='-c search_path=%s'", cfg.SearchPath)
	}
	db, err := sql.Open("pgx", dsn)
	if err != nil {
		return nil, err
	}
	if err := db.Ping(); err != nil {
		db.Close()
		return nil, err
	}
	return &Store{DB: db}, nil
}

// Close cierra la base de datos.
func (s *Store) Close() error { return s.DB.Close() }

// IsUniqueViolation indica si err corresponde a una violación de restricción
// UNIQUE de PostgreSQL (código 23505), sin depender de comparar el texto del
// error.
func IsUniqueViolation(err error) bool {
	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) {
		return pgErr.Code == "23505"
	}
	return false
}

// IsForeignKeyViolation indica si err corresponde a una violación de clave
// ajena de PostgreSQL (código 23503): borrar una fila que otras referencian.
func IsForeignKeyViolation(err error) bool {
	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) {
		return pgErr.Code == "23503"
	}
	return false
}
