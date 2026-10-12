import { eq, getTableColumns, sql } from 'drizzle-orm'
import type { BD } from '../db/cliente'
import { fotos, pacientes, revisiones, stock_ventas } from '../db/esquema'
import { fechaHoraLocal } from '../lib/fechas'
import { porNombre } from '../lib/texto'
import type { PacienteDatos } from '../validacion'

// Los contadores van como subconsultas: una sola consulta para toda la lista.
// Drizzle no califica las columnas en un select de una sola tabla: en las subconsultas
// correlacionadas hay que escribir `tabla.columna` a mano o "id" apuntaría a la tabla interior.
const columnas = {
  ...getTableColumns(pacientes),
  num_fotos: sql`(select count(*) from ${fotos} where ${fotos}.paciente_id = ${pacientes}.id)`.mapWith(Number),
  num_revisiones:
    sql`(select count(*) from ${revisiones} where ${revisiones}.paciente_id = ${pacientes}.id)`.mapWith(Number),
}

export function listarPacientes(db: BD) {
  return porNombre(db.select(columnas).from(pacientes).all(), (p) => p.nombre)
}

export function obtenerPaciente(db: BD, id: number) {
  return db.select(columnas).from(pacientes).where(eq(pacientes.id, id)).get() ?? null
}

export function crearPaciente(db: BD, datos: PacienteDatos) {
  const consentimiento_fecha = datos.consentimiento === 1 ? fechaHoraLocal(new Date()) : null
  const paciente = db
    .insert(pacientes)
    .values({ ...datos, consentimiento_fecha })
    .returning()
    .get()
  return { ...paciente, num_fotos: 0, num_revisiones: 0 }
}

// actualizarPaciente devuelve null si el paciente no existe.
export function actualizarPaciente(db: BD, id: number, datos: PacienteDatos) {
  const existe = db.transaction(
    (tx) => {
      const actual = tx
        .select({ consentimiento: pacientes.consentimiento, fecha: pacientes.consentimiento_fecha })
        .from(pacientes)
        .where(eq(pacientes.id, id))
        .get()
      if (actual === undefined) return false
      // Se conserva la fecha original del consentimiento; se sella al otorgarlo y se limpia al revocarlo.
      const yaOtorgado = actual.consentimiento === 1 && actual.fecha !== null
      const sello = yaOtorgado ? actual.fecha : fechaHoraLocal(new Date())
      const consentimiento_fecha = datos.consentimiento === 1 ? sello : null
      tx.update(pacientes)
        .set({ ...datos, consentimiento_fecha })
        .where(eq(pacientes.id, id))
        .run()
      return true
    },
    { behavior: 'immediate' },
  )
  return existe ? obtenerPaciente(db, id) : null
}

// eliminarPaciente borra el paciente con sus fotos y revisiones, y desvincula sus ventas.
// Devuelve los archivos de sus fotos (para borrarlos del disco) o null si no existía.
export function eliminarPaciente(db: BD, id: number): string[] | null {
  return db.transaction(
    (tx) => {
      const fila = tx.select({ id: pacientes.id }).from(pacientes).where(eq(pacientes.id, id)).get()
      if (fila === undefined) return null
      const archivos = tx.delete(fotos).where(eq(fotos.paciente_id, id)).returning({ f: fotos.filename }).all()
      tx.delete(revisiones).where(eq(revisiones.paciente_id, id)).run()
      tx.update(stock_ventas).set({ paciente_id: null }).where(eq(stock_ventas.paciente_id, id)).run()
      tx.delete(pacientes).where(eq(pacientes.id, id)).run()
      return archivos.map((a) => a.f)
    },
    { behavior: 'immediate' },
  )
}
