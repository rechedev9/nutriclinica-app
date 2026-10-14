import { and, eq } from 'drizzle-orm'
import { leerOpciones, prepararDatos } from '../config'
import { abrirBD } from './cliente'
import demo from './demo-pacientes.json'
import { pacientes, revisiones } from './esquema'

// Inserta pacientes de ejemplo con sus revisiones mensuales. Se puede repetir sin duplicar.
// Uso: bun run seed [--data-dir <carpeta>]

const { rutaBD } = prepararDatos(leerOpciones(Bun.argv.slice(2)).dataDir)
const db = abrirBD(rutaBD)

db.transaction((tx) => {
  for (const paciente of demo.pacientes) {
    const existe = tx.select({ id: pacientes.id }).from(pacientes).where(eq(pacientes.nombre, paciente.nombre)).get()
    if (existe === undefined) tx.insert(pacientes).values(paciente).run()
  }
  for (const { paciente, ...revision } of demo.revisiones) {
    const fila = tx.select({ id: pacientes.id }).from(pacientes).where(eq(pacientes.nombre, paciente)).get()
    if (fila === undefined) continue
    const mismaFecha = and(eq(revisiones.paciente_id, fila.id), eq(revisiones.fecha, revision.fecha))
    const existe = tx.select({ id: revisiones.id }).from(revisiones).where(mismaFecha).get()
    if (existe === undefined)
      tx.insert(revisiones)
        .values({ ...revision, paciente_id: fila.id })
        .run()
  }
})

console.log(`Clientes y revisiones de ejemplo insertados en ${rutaBD}`)
