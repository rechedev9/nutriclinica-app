import { desc, eq } from 'drizzle-orm'
import type { BD } from '../db/cliente'
import { audit_log } from '../db/esquema'
import { leerDetalle } from '../lib/cambios'
import type { DetalleAuditoria } from '../lib/cambios'

// registrarAuditoria anota quién hizo qué sobre los datos (RGPD).
export function registrarAuditoria(
  db: BD,
  entrada: {
    usuario: string
    metodo: string
    ruta: string
    estado: number
    paciente_id: number | null
    detalle: DetalleAuditoria | null
  },
): void {
  const { detalle, ...resto } = entrada
  db.insert(audit_log)
    .values({ ...resto, detalle: detalle === null ? null : JSON.stringify(detalle) })
    .run()
}

function conDetalle(fila: typeof audit_log.$inferSelect) {
  return { ...fila, detalle: leerDetalle(fila.detalle) }
}

// Las últimas entradas del registro, de la más reciente a la más antigua.
export function listarAuditoria(db: BD, limite: number) {
  const tope = limite <= 0 || limite > 1000 ? 200 : limite
  return db.select().from(audit_log).orderBy(desc(audit_log.id)).limit(tope).all().map(conDetalle)
}

// La traza de un cliente, de la más reciente a la más antigua.
export function listarHistorial(db: BD, pacienteId: number) {
  return db
    .select()
    .from(audit_log)
    .where(eq(audit_log.paciente_id, pacienteId))
    .orderBy(desc(audit_log.id))
    .limit(500)
    .all()
    .map(conDetalle)
}
