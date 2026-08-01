package store

import (
	"database/sql"
	"embed"
	"fmt"
	"strings"

	"golang.org/x/crypto/bcrypt"
)

//go:embed schema/*.sql
var schemaFS embed.FS

// schemaVersion es la versión de esquema objetivo, rastreada en la tabla
// schema_migrations (PostgreSQL no tiene un equivalente a PRAGMA user_version).
const schemaVersion = 7

// seedUser describe un usuario inicial.
type seedUser struct {
	usuario  string
	password string
	rol      string
}

// usuariosSeed son los usuarios migrados desde el dict USUARIOS de Flask.
var usuariosSeed = []seedUser{
	{"admin", "admin", "admin"},
	{"Jose", "Jose123", "user"},
}

// Migrate aplica las migraciones pendientes preservando los datos existentes.
// El progreso se guarda en la tabla schema_migrations.
func (s *Store) Migrate() error {
	if _, err := s.DB.Exec(`CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER NOT NULL)`); err != nil {
		return fmt.Errorf("creando schema_migrations: %w", err)
	}
	version, err := s.currentSchemaVersion()
	if err != nil {
		return fmt.Errorf("leyendo schema_migrations: %w", err)
	}

	if version < 1 {
		if err := s.applySQLFile("schema/0001_init.sql"); err != nil {
			return err
		}
		if err := s.setSchemaVersion(1); err != nil {
			return err
		}
		version = 1
	}

	if version < 2 {
		if err := s.applySQLFile("schema/0002_usuarios.sql"); err != nil {
			return err
		}
		if err := s.seedUsuarios(); err != nil {
			return err
		}
		if err := s.setSchemaVersion(2); err != nil {
			return err
		}
		version = 2
	}

	if version < 3 {
		if err := s.applySQLFile("schema/0003_indices.sql"); err != nil {
			return err
		}
		if err := s.setSchemaVersion(3); err != nil {
			return err
		}
		version = 3
	}

	if version < 4 {
		if err := s.applySQLFile("schema/0004_auditoria.sql"); err != nil {
			return err
		}
		if err := s.setSchemaVersion(4); err != nil {
			return err
		}
		version = 4
	}

	if version < 5 {
		if err := s.applySQLFile("schema/0005_consentimiento.sql"); err != nil {
			return err
		}
		if err := s.setSchemaVersion(5); err != nil {
			return err
		}
		version = 5
	}

	if version < 6 {
		if err := s.applySQLFile("schema/0006_mermas.sql"); err != nil {
			return err
		}
		if err := s.setSchemaVersion(6); err != nil {
			return err
		}
		version = 6
	}

	if version < 7 {
		if err := s.applySQLFile("schema/0007_seed_stock.sql"); err != nil {
			return err
		}
		if err := s.setSchemaVersion(7); err != nil {
			return err
		}
		version = 7
	}

	return nil
}

// applySQLFile ejecuta cada sentencia del fichero embebido dentro de una
// transacción. A diferencia de SQLite, el driver de Postgres no garantiza
// ejecutar varias sentencias separadas por ';' en un único Exec, así que se
// dividen y se ejecutan una a una (los ficheros de schema/ son de control
// interno, no contienen ';' dentro de literales de texto).
func (s *Store) applySQLFile(name string) error {
	data, err := schemaFS.ReadFile(name)
	if err != nil {
		return fmt.Errorf("leyendo %s: %w", name, err)
	}
	tx, err := s.DB.Begin()
	if err != nil {
		return fmt.Errorf("iniciando transacción para %s: %w", name, err)
	}
	defer tx.Rollback()

	for _, stmt := range splitStatements(string(data)) {
		if _, err := tx.Exec(stmt); err != nil {
			return fmt.Errorf("aplicando %s: %w", name, err)
		}
	}
	if err := tx.Commit(); err != nil {
		return fmt.Errorf("confirmando %s: %w", name, err)
	}
	return nil
}

// splitStatements separa un fichero SQL en sentencias individuales por ';',
// descartando líneas de comentario ('--') y sentencias vacías.
func splitStatements(sqlText string) []string {
	var lines []string
	for _, line := range strings.Split(sqlText, "\n") {
		trimmed := strings.TrimSpace(line)
		if strings.HasPrefix(trimmed, "--") {
			continue
		}
		lines = append(lines, line)
	}
	cleaned := strings.Join(lines, "\n")

	var stmts []string
	for _, part := range strings.Split(cleaned, ";") {
		part = strings.TrimSpace(part)
		if part != "" {
			stmts = append(stmts, part)
		}
	}
	return stmts
}

// seedUsuarios inserta los usuarios iniciales con hash bcrypt si no existen.
func (s *Store) seedUsuarios() error {
	for _, u := range usuariosSeed {
		hash, err := bcrypt.GenerateFromPassword([]byte(u.password), 12)
		if err != nil {
			return err
		}
		_, err = s.DB.Exec(
			`INSERT INTO usuarios (usuario, password_hash, rol) VALUES ($1,$2,$3) ON CONFLICT (usuario) DO NOTHING`,
			u.usuario, string(hash), u.rol,
		)
		if err != nil {
			return fmt.Errorf("seed usuario %s: %w", u.usuario, err)
		}
	}
	return nil
}

// UsuariosConPasswordPorDefecto devuelve los usuarios semilla que todavía
// conservan su contraseña por defecto (admin/admin, Jose/Jose123). Permite
// avisar en el arranque para que se cambien antes de usar datos reales.
func (s *Store) UsuariosConPasswordPorDefecto() ([]string, error) {
	var pendientes []string
	for _, u := range usuariosSeed {
		var hash string
		err := s.DB.QueryRow(`SELECT password_hash FROM usuarios WHERE usuario=$1`, u.usuario).Scan(&hash)
		if err == sql.ErrNoRows {
			continue
		}
		if err != nil {
			return nil, err
		}
		if bcrypt.CompareHashAndPassword([]byte(hash), []byte(u.password)) == nil {
			pendientes = append(pendientes, u.usuario)
		}
	}
	return pendientes, nil
}

func (s *Store) currentSchemaVersion() (int, error) {
	var version int
	err := s.DB.QueryRow(`SELECT version FROM schema_migrations LIMIT 1`).Scan(&version)
	if err == sql.ErrNoRows {
		if _, err := s.DB.Exec(`INSERT INTO schema_migrations (version) VALUES (0)`); err != nil {
			return 0, err
		}
		return 0, nil
	}
	if err != nil {
		return 0, err
	}
	return version, nil
}

func (s *Store) setSchemaVersion(v int) error {
	_, err := s.DB.Exec(`UPDATE schema_migrations SET version = $1`, v)
	return err
}
