package store

import (
	"fmt"
	"log"
	"os"
	"time"
)

// FixOrphans crea una copia de seguridad consistente y borra las filas que
// violan claves foráneas (datos heredados de cuando la BBDD corría con FK OFF).
func (s *Store) FixOrphans(dbPath string) error {
	backup := fmt.Sprintf("%s.bak-%d", dbPath, time.Now().Unix())
	if _, err := s.DB.Exec(`VACUUM INTO ?`, backup); err != nil {
		return fmt.Errorf("creando backup %s: %w", backup, err)
	}
	// El backup contiene PII: restringir permisos a solo el propietario.
	if err := os.Chmod(backup, 0o600); err != nil {
		log.Printf("AVISO: no se pudieron restringir los permisos del backup %s: %v", backup, err)
	}
	log.Printf("Backup creado en %s", backup)

	orphans, err := s.ForeignKeyCheck()
	if err != nil {
		return err
	}
	tx, err := s.DB.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	for _, o := range orphans {
		// Borra la fila huérfana por rowid (la tabla viene de foreign_key_check).
		stmt := fmt.Sprintf(`DELETE FROM %q WHERE rowid=?`, o.Table)
		if _, err := tx.Exec(stmt, o.RowID); err != nil {
			return fmt.Errorf("borrando huérfano %s rowid=%d: %w", o.Table, o.RowID, err)
		}
	}
	if err := tx.Commit(); err != nil {
		return err
	}
	log.Printf("Limpiadas %d filas huérfanas.", len(orphans))
	return nil
}
