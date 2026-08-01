// Command migrate_to_postgres es una herramienta de un solo uso: vuelca los
// datos reales de un pacientes.db (SQLite, la versión anterior de la app) en
// la base de datos PostgreSQL ya migrada, preservando los ids originales
// (imprescindible para no romper las relaciones paciente<->revisiones/fotos,
// compra<->líneas, etc.).
//
// Uso (desde backend/), con las variables NUTRICLINICA_PG_* ya exportadas
// apuntando a la instancia de Postgres destino:
//
//	go run ./cmd/migrate_to_postgres --sqlite /ruta/a/bbdd/pacientes.db
//
// La herramienta aplica el esquema en Postgres si hiciera falta (crea las
// tablas y siembra los datos de demostración), y a continuación VACÍA todas
// las tablas antes de importar: así no quedan mezclados los datos de
// demostración con los reales, ni hay colisión de ids entre unos y otros.
package main

import (
	"database/sql"
	"flag"
	"fmt"
	"log"
	"strings"

	_ "github.com/ncruces/go-sqlite3/driver" // driver "sqlite3" solo para esta herramienta

	"nutriclinica/internal/config"
	"nutriclinica/internal/store"
)

// tabla describe una tabla a migrar: nombre y columnas en el orden en que se
// leen de SQLite y se insertan en Postgres. El orden de la lista es el orden
// seguro de inserción (padres antes que hijos, por las FK).
type tabla struct {
	nombre string
	cols   []string
}

var tablas = []tabla{
	{"usuarios", []string{"id", "usuario", "password_hash", "rol", "creado"}},
	{"pacientes", []string{
		"id", "nombre", "fecha_nac", "sexo", "dni", "telefono", "email", "objetivo",
		"actividad_fisica", "intolerancias", "patologias", "notas", "peso", "talla",
		"grupo_sanguineo", "creado", "consentimiento", "consentimiento_fecha",
	}},
	{"revisiones", []string{
		"id", "paciente_id", "fecha", "peso", "talla", "envergadura",
		"pl_bicipital", "pl_tricipital", "pl_subescapular", "pl_supraespinal",
		"pl_supracrestal", "pl_abdominal", "pl_muslo_int", "pl_pierna_med",
		"per_antebrazo", "per_brazo_rel", "per_brazo_cont", "per_hombros",
		"per_pecho", "per_cintura", "per_caderas", "per_muslo", "per_muslo_cont",
		"per_gemelo", "notas",
	}},
	{"fotos", []string{"id", "paciente_id", "filename", "nota", "fecha"}},
	{"stock_categorias", []string{"id", "nombre"}},
	{"stock_proveedores", []string{"id", "nombre", "telefono", "email", "notas"}},
	{"stock_productos", []string{
		"id", "nombre", "categoria_id", "proveedor_id", "precio_coste", "precio_venta",
		"unidad", "stock_minimo", "activo", "creado",
	}},
	{"stock_compras", []string{"id", "fecha", "proveedor_id", "notas", "total"}},
	{"stock_compras_lineas", []string{"id", "compra_id", "producto_id", "cantidad", "precio_unitario"}},
	{"stock_ventas", []string{"id", "fecha", "paciente_id", "notas", "total"}},
	{"stock_ventas_lineas", []string{"id", "venta_id", "producto_id", "cantidad", "precio_unitario"}},
	{"stock_mermas", []string{"id", "producto_id", "proveedor_id", "cantidad", "motivo", "fecha", "notas", "creado"}},
	{"audit_log", []string{"id", "fecha", "usuario", "metodo", "ruta", "estado"}},
}

func main() {
	sqlitePath := flag.String("sqlite", "", "Ruta al fichero pacientes.db (SQLite) a migrar")
	flag.Parse()
	if *sqlitePath == "" {
		log.Fatal("uso: migrate_to_postgres --sqlite <ruta a pacientes.db>")
	}

	src, err := sql.Open("sqlite3", *sqlitePath)
	if err != nil {
		log.Fatalf("abriendo SQLite origen (%s): %v", *sqlitePath, err)
	}
	defer src.Close()
	if err := src.Ping(); err != nil {
		log.Fatalf("no se pudo leer %s: %v", *sqlitePath, err)
	}

	pgCfg, err := config.PostgresFromEnv()
	if err != nil {
		log.Fatalf("configuración de PostgreSQL: %v", err)
	}
	dst, err := store.Open(pgCfg)
	if err != nil {
		log.Fatalf("conectando a Postgres: %v", err)
	}
	defer dst.Close()

	log.Println("Aplicando el esquema en Postgres (crea tablas si hace falta)...")
	if err := dst.Migrate(); err != nil {
		log.Fatalf("migrando esquema: %v", err)
	}

	nombres := make([]string, len(tablas))
	for i, t := range tablas {
		nombres[i] = t.nombre
	}
	log.Println("Vaciando las tablas en Postgres antes de importar (para no mezclar con los datos de demostración)...")
	if _, err := dst.DB.Exec(fmt.Sprintf("TRUNCATE %s RESTART IDENTITY CASCADE", strings.Join(nombres, ", "))); err != nil {
		log.Fatalf("vaciando tablas: %v", err)
	}

	for _, t := range tablas {
		n, err := migrarTabla(src, dst.DB, t)
		if err != nil {
			log.Fatalf("migrando tabla %s: %v", t.nombre, err)
		}
		log.Printf("  %-24s %d filas", t.nombre, n)
	}

	log.Println("Ajustando las secuencias de autoincremento al máximo id de cada tabla...")
	for _, t := range tablas {
		if _, err := dst.DB.Exec(fmt.Sprintf(
			`SELECT setval(pg_get_serial_sequence('%s', 'id'), COALESCE((SELECT MAX(id) FROM %s), 1), (SELECT MAX(id) FROM %s) IS NOT NULL)`,
			t.nombre, t.nombre, t.nombre,
		)); err != nil {
			log.Fatalf("ajustando secuencia de %s: %v", t.nombre, err)
		}
	}

	log.Println("✓ Migración completada. Los datos reales ya están en Postgres.")
}

// migrarTabla copia todas las filas de una tabla de SQLite a Postgres,
// preservando los ids explícitos.
func migrarTabla(src, dst *sql.DB, t tabla) (int, error) {
	colsSQL := strings.Join(t.cols, ", ")
	rows, err := src.Query(fmt.Sprintf("SELECT %s FROM %s ORDER BY id", colsSQL, t.nombre))
	if err != nil {
		return 0, fmt.Errorf("leyendo de SQLite: %w", err)
	}
	defer rows.Close()

	ph := make([]string, len(t.cols))
	for i := range t.cols {
		ph[i] = fmt.Sprintf("$%d", i+1)
	}
	insertSQL := fmt.Sprintf("INSERT INTO %s (%s) VALUES (%s)", t.nombre, colsSQL, strings.Join(ph, ", "))

	n := 0
	for rows.Next() {
		vals := make([]any, len(t.cols))
		ptrs := make([]any, len(t.cols))
		for i := range vals {
			ptrs[i] = &vals[i]
		}
		if err := rows.Scan(ptrs...); err != nil {
			return n, fmt.Errorf("leyendo fila: %w", err)
		}
		if _, err := dst.Exec(insertSQL, vals...); err != nil {
			return n, fmt.Errorf("insertando fila: %w", err)
		}
		n++
	}
	return n, rows.Err()
}
