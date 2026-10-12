import { Database } from 'bun:sqlite'
import { drizzle } from 'drizzle-orm/bun-sqlite'
import { MIGRACIONES } from './migraciones'

const SEPARADOR = '--> statement-breakpoint'

function migrar(sqlite: Database): void {
  sqlite.run('CREATE TABLE IF NOT EXISTS __migraciones (tag TEXT PRIMARY KEY, aplicada TEXT NOT NULL)')
  const aplicadas = new Set(
    sqlite
      .query<{ tag: string }, []>('SELECT tag FROM __migraciones')
      .all()
      .map((fila) => fila.tag),
  )
  for (const migracion of MIGRACIONES) {
    if (aplicadas.has(migracion.tag)) continue
    sqlite.transaction(() => {
      for (const sentencia of migracion.sql.split(SEPARADOR)) {
        if (sentencia.trim() !== '') sqlite.run(sentencia)
      }
      sqlite.run("INSERT INTO __migraciones (tag, aplicada) VALUES (?, datetime('now', 'localtime'))", [migracion.tag])
    })()
  }
}

// abrirBD abre (o crea) el fichero SQLite, aplica las migraciones pendientes y devuelve Drizzle.
export function abrirBD(ruta: string) {
  const sqlite = new Database(ruta, { create: true, strict: true })
  sqlite.run('PRAGMA journal_mode = WAL')
  sqlite.run('PRAGMA foreign_keys = ON')
  sqlite.run('PRAGMA busy_timeout = 5000')
  migrar(sqlite)
  return drizzle({ client: sqlite })
}

export type BD = ReturnType<typeof abrirBD>
type Tx = Parameters<Parameters<BD['transaction']>[0]>[0]
// Ejecutor es la BD o una transacción abierta: lo que aceptan las funciones de consulta.
export type Ejecutor = BD | Tx
