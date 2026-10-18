import { Database } from 'bun:sqlite'

const ruta = process.argv[2]
const consulta = process.argv[3]

if (ruta === undefined || consulta === undefined || consulta.trim() === '') {
  console.error('uso: consultar.ts <base.db> <SELECT>')
  process.exit(1)
}

const texto = consulta.trim().replace(/;+\s*$/u, '')
if (texto.includes(';') || !/^select\b/iu.test(texto)) {
  console.error('solo se admite un SELECT')
  process.exit(1)
}

const db = new Database(ruta, { readonly: true, strict: true })
db.run('PRAGMA query_only = ON')
const filas = db.query(texto).all()
console.log(JSON.stringify(filas, null, 2))
