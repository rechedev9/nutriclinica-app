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

// schemaVersion es la versión de esquema objetivo (PRAGMA user_version).
const schemaVersion = 6

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
// Usa PRAGMA user_version para versionar el esquema.
func (s *Store) Migrate() error {
	var version int
	if err := s.DB.QueryRow("PRAGMA user_version").Scan(&version); err != nil {
		return fmt.Errorf("leyendo user_version: %w", err)
	}

	if version < 1 {
		if err := s.applySQLFile("schema/0001_init.sql"); err != nil {
			return err
		}
		if err := s.ensureRevisionColumns(); err != nil {
			return err
		}
		if err := s.setUserVersion(1); err != nil {
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
		if err := s.setUserVersion(2); err != nil {
			return err
		}
		version = 2
	}

	if version < 3 {
		if err := s.applySQLFile("schema/0003_indices.sql"); err != nil {
			return err
		}
		if err := s.setUserVersion(3); err != nil {
			return err
		}
		version = 3
	}

	if version < 4 {
		if err := s.applySQLFile("schema/0004_auditoria.sql"); err != nil {
			return err
		}
		if err := s.setUserVersion(4); err != nil {
			return err
		}
		version = 4
	}

	if version < 5 {
		if err := s.applySQLFile("schema/0005_consentimiento.sql"); err != nil {
			return err
		}
		if err := s.setUserVersion(5); err != nil {
			return err
		}
		version = 5
	}

	if version < 6 {
		if err := s.applySQLFile("schema/0006_mermas.sql"); err != nil {
			return err
		}
		if err := s.setUserVersion(6); err != nil {
			return err
		}
		version = 6
	}

	return nil
}

func (s *Store) applySQLFile(name string) error {
	data, err := schemaFS.ReadFile(name)
	if err != nil {
		return fmt.Errorf("leyendo %s: %w", name, err)
	}
	if _, err := s.DB.Exec(string(data)); err != nil {
		return fmt.Errorf("aplicando %s: %w", name, err)
	}
	return nil
}

// ensureRevisionColumns replica el patrón try/except ALTER TABLE del Flask
// original para BBDD antiguas que pudieran no tener peso/talla/grupo_sanguineo.
func (s *Store) ensureRevisionColumns() error {
	cols := map[string]bool{}
	rows, err := s.DB.Query("PRAGMA table_info(pacientes)")
	if err != nil {
		return err
	}
	defer rows.Close()
	for rows.Next() {
		var cid int
		var name, ctype string
		var notnull, pk int
		var dflt any
		if err := rows.Scan(&cid, &name, &ctype, &notnull, &dflt, &pk); err != nil {
			return err
		}
		cols[name] = true
	}
	if err := rows.Err(); err != nil {
		return err
	}

	add := []struct{ name, typ string }{
		{"peso", "REAL"},
		{"talla", "REAL"},
		{"grupo_sanguineo", "TEXT"},
	}
	for _, c := range add {
		if !cols[c.name] {
			stmt := fmt.Sprintf("ALTER TABLE pacientes ADD COLUMN %s %s", c.name, c.typ)
			if _, err := s.DB.Exec(stmt); err != nil &&
				!strings.Contains(err.Error(), "duplicate column") {
				return fmt.Errorf("añadiendo columna %s: %w", c.name, err)
			}
		}
	}
	return nil
}

// seedUsuarios inserta los usuarios iniciales con hash bcrypt si no existen.
func (s *Store) seedUsuarios() error {
	for _, u := range usuariosSeed {
		hash, err := bcrypt.GenerateFromPassword([]byte(u.password), 12)
		if err != nil {
			return err
		}
		_, err = s.DB.Exec(
			`INSERT OR IGNORE INTO usuarios (usuario, password_hash, rol) VALUES (?,?,?)`,
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
		err := s.DB.QueryRow(`SELECT password_hash FROM usuarios WHERE usuario=?`, u.usuario).Scan(&hash)
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

func (s *Store) setUserVersion(v int) error {
	// PRAGMA no admite parámetros enlazados; v es un entero controlado.
	_, err := s.DB.Exec(fmt.Sprintf("PRAGMA user_version = %d", v))
	return err
}
