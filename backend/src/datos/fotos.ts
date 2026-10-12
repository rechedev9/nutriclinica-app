import { desc, eq } from 'drizzle-orm'
import type { BD } from '../db/cliente'
import { fotos } from '../db/esquema'

// Las fotos de un paciente, de la más reciente a la más antigua.
export function listarFotos(db: BD, pacienteId: number) {
  return db
    .select()
    .from(fotos)
    .where(eq(fotos.paciente_id, pacienteId))
    .orderBy(desc(fotos.fecha), desc(fotos.id))
    .all()
}

export function obtenerFoto(db: BD, id: number) {
  return db.select().from(fotos).where(eq(fotos.id, id)).get() ?? null
}

// crearFoto registra una foto ya guardada en disco; filename es la ruta relativa con '/'.
export function crearFoto(db: BD, datos: { paciente_id: number; filename: string; nota: string | null }) {
  return db.insert(fotos).values(datos).returning().get()
}

export function eliminarFoto(db: BD, id: number): void {
  db.delete(fotos).where(eq(fotos.id, id)).run()
}
