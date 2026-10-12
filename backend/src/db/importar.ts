import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { parseArgs } from 'node:util'
import type { Database } from 'bun:sqlite'
import { leerOpciones, prepararDatos } from '../config'
import { abrirBD } from './cliente'

// Importa los datos de una base SQLite anterior (el pacientes.db de la app original)
// conservando los ids. Sustituye todo el contenido de la base de destino.
// Uso: bun run importar <ruta/pacientes.db> [--data-dir <carpeta>] [--reemplazar]

// En orden de dependencias: cada tabla va después de las que referencia.
const TABLAS = [
  'usuarios',
  'pacientes',
  'revisiones',
  'fotos',
  'stock_categorias',
  'stock_proveedores',
  'stock_productos',
  'stock_compras',
  'stock_compras_lineas',
  'stock_ventas',
  'stock_ventas_lineas',
  'stock_mermas',
  'audit_log',
] as const

interface Columna {
  name: string
  notnull: number
  dflt_value: string | null
}

function columnas(sqlite: Database, esquema: string, tabla: string): Columna[] {
  return sqlite.query<Columna, []>(`PRAGMA ${esquema}.table_info("${tabla}")`).all()
}

function contar(sqlite: Database, tabla: string): number {
  return sqlite.query<{ n: number }, []>(`SELECT count(*) AS n FROM ${tabla}`).get()?.n ?? 0
}

// Copia las columnas que existen en ambos lados; un NULL antiguo en una columna hoy
// obligatoria toma el valor por defecto del esquema nuevo.
function copiar(sqlite: Database, tabla: string): number {
  const enOrigen = new Set(columnas(sqlite, 'origen', tabla).map((c) => c.name))
  if (enOrigen.size === 0) return 0
  const comunes = columnas(sqlite, 'main', tabla).filter((c) => enOrigen.has(c.name))
  const destino = comunes.map((c) => `"${c.name}"`).join(', ')
  const valores = comunes
    .map((c) => (c.notnull === 1 && c.dflt_value !== null ? `coalesce("${c.name}", ${c.dflt_value})` : `"${c.name}"`))
    .join(', ')
  sqlite.run(`INSERT INTO main."${tabla}" (${destino}) SELECT ${valores} FROM origen."${tabla}"`)
  return contar(sqlite, `main."${tabla}"`)
}

const { values, positionals } = parseArgs({
  args: Bun.argv.slice(2),
  allowPositionals: true,
  options: { 'data-dir': { type: 'string' }, reemplazar: { type: 'boolean', default: false } },
})
const [origen] = positionals
if (origen === undefined || !existsSync(origen)) {
  throw new Error('Indica la base de datos de origen: bun run importar <ruta/pacientes.db>')
}

const dataDir = leerOpciones(values['data-dir'] === undefined ? [] : ['--data-dir', values['data-dir']]).dataDir
const { rutaBD } = prepararDatos(dataDir)
const sqlite = abrirBD(rutaBD).$client

if (contar(sqlite, 'pacientes') > 0 && !values.reemplazar) {
  throw new Error(`${rutaBD} ya tiene pacientes. Repite con --reemplazar para sustituir todos sus datos.`)
}

sqlite.run('ATTACH DATABASE ? AS origen', [resolve(origen)])
sqlite.transaction(() => {
  sqlite.run('DELETE FROM sesiones')
  for (const tabla of TABLAS.toReversed()) sqlite.run(`DELETE FROM main."${tabla}"`)
  for (const tabla of TABLAS) console.log(`  ${tabla}: ${copiar(sqlite, tabla)}`)
})()
sqlite.run('DETACH DATABASE origen')
sqlite.close()

console.log(`Datos importados en ${rutaBD}`)
