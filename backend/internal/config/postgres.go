package config

import (
	"fmt"
	"os"
	"strconv"

	"nutriclinica/internal/store"
)

// PostgresFromEnv resuelve los parámetros de conexión a la instancia
// PostgreSQL (p.ej. RDS) desde variables de entorno:
//   - NUTRICLINICA_PG_HOST     (obligatoria)
//   - NUTRICLINICA_PG_PORT     (opcional, por defecto 5432)
//   - NUTRICLINICA_PG_USER     (obligatoria)
//   - NUTRICLINICA_PG_PASSWORD (obligatoria)
//   - NUTRICLINICA_PG_DBNAME   (obligatoria)
//   - NUTRICLINICA_PG_SSLMODE  (opcional, por defecto "require": RDS exige TLS)
func PostgresFromEnv() (store.Config, error) {
	host := os.Getenv("NUTRICLINICA_PG_HOST")
	if host == "" {
		return store.Config{}, fmt.Errorf("falta la variable de entorno NUTRICLINICA_PG_HOST")
	}
	user := os.Getenv("NUTRICLINICA_PG_USER")
	if user == "" {
		return store.Config{}, fmt.Errorf("falta la variable de entorno NUTRICLINICA_PG_USER")
	}
	password := os.Getenv("NUTRICLINICA_PG_PASSWORD")
	if password == "" {
		return store.Config{}, fmt.Errorf("falta la variable de entorno NUTRICLINICA_PG_PASSWORD")
	}
	dbname := os.Getenv("NUTRICLINICA_PG_DBNAME")
	if dbname == "" {
		return store.Config{}, fmt.Errorf("falta la variable de entorno NUTRICLINICA_PG_DBNAME")
	}

	port := 5432
	if v := os.Getenv("NUTRICLINICA_PG_PORT"); v != "" {
		p, err := strconv.Atoi(v)
		if err != nil {
			return store.Config{}, fmt.Errorf("NUTRICLINICA_PG_PORT inválido: %w", err)
		}
		port = p
	}

	return store.Config{
		Host:     host,
		Port:     port,
		User:     user,
		Password: password,
		DBName:   dbname,
		SSLMode:  os.Getenv("NUTRICLINICA_PG_SSLMODE"),
	}, nil
}
