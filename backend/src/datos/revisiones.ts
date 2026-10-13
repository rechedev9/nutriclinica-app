import { desc, eq, getTableColumns } from 'drizzle-orm'
import type { BD } from '../db/cliente'
import { pacientes, revisiones } from '../db/esquema'
import { ErrorHttp } from '../lib/errores'
import { porNombre } from '../lib/texto'
import type { RevisionDatos } from '../validacion'

// Las revisiones de un paciente, de la más reciente a la más antigua.
export function listarRevisiones(db: BD, pacienteId: number) {
  return db
    .select()
    .from(revisiones)
    .where(eq(revisiones.paciente_id, pacienteId))
    .orderBy(desc(revisiones.fecha), desc(revisiones.id))
    .all()
}

export function obtenerRevision(db: BD, id: number) {
  return db.select().from(revisiones).where(eq(revisiones.id, id)).get() ?? null
}

export function crearRevision(db: BD, pacienteId: number, datos: RevisionDatos) {
  const paciente = db.select({ id: pacientes.id }).from(pacientes).where(eq(pacientes.id, pacienteId)).get()
  if (paciente === undefined) throw new ErrorHttp(404, 'Cliente no encontrado')
  return db
    .insert(revisiones)
    .values({ ...datos, paciente_id: pacienteId })
    .returning()
    .get()
}

// actualizarRevision devuelve null si la revisión no existe.
export function actualizarRevision(db: BD, id: number, datos: RevisionDatos) {
  db.update(revisiones).set(datos).where(eq(revisiones.id, id)).run()
  return obtenerRevision(db, id)
}

export function eliminarRevision(db: BD, id: number): void {
  db.delete(revisiones).where(eq(revisiones.id, id)).run()
}

// Todas las revisiones con el nombre de su paciente, por paciente y fecha descendente (Excel global).
export function listarRevisionesConNombre(db: BD) {
  const filas = db
    .select({ ...getTableColumns(revisiones), paciente_nombre: pacientes.nombre })
    .from(revisiones)
    .innerJoin(pacientes, eq(pacientes.id, revisiones.paciente_id))
    .orderBy(desc(revisiones.fecha), desc(revisiones.id))
    .all()
  return porNombre(filas, (r) => r.paciente_nombre)
}
