// Corrige pacientes cuyo campo sexo quedó como 'F'/'M' (por ejemplo, del seeder
// antiguo) en vez de 'Mujer'/'Hombre', que es lo que espera el frontend.
// Uso: go run ./cmd/fix_sexo  (desde backend/)
package main

import (
	"fmt"
	"log"

	"nutriclinica/internal/config"
	"nutriclinica/internal/store"
)

func main() {
	pgCfg, err := config.PostgresFromEnv()
	if err != nil {
		log.Fatalf("configuración de PostgreSQL: %v", err)
	}
	st, err := store.Open(pgCfg)
	if err != nil {
		log.Fatalf("abriendo BD: %v", err)
	}
	defer st.Close()

	resMujer, err := st.DB.Exec(`UPDATE pacientes SET sexo = 'Mujer' WHERE sexo = 'F'`)
	if err != nil {
		log.Fatalf("actualizando sexo='F': %v", err)
	}
	nMujer, _ := resMujer.RowsAffected()

	resHombre, err := st.DB.Exec(`UPDATE pacientes SET sexo = 'Hombre' WHERE sexo = 'M'`)
	if err != nil {
		log.Fatalf("actualizando sexo='M': %v", err)
	}
	nHombre, _ := resHombre.RowsAffected()

	fmt.Printf("✓ Corregidos %d pacientes ('F' → 'Mujer') y %d pacientes ('M' → 'Hombre').\n", nMujer, nHombre)
}
