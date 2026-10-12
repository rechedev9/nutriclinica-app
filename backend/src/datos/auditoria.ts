import { desc } from 'drizzle-orm'
import type { BD } from '../db/cliente'
import { audit_log } from '../db/esquema'

// registrarAuditoria anota quién hizo qué sobre los datos (RGPD).
export function registrarAuditoria(
  db: BD,
  entrada: { usuario: string; metodo: string; ruta: string; estado: number },
): void {
  db.insert(audit_log).values(entrada).run()
}

// Las últimas entradas del registro, de la más reciente a la más antigua.
export function listarAuditoria(db: BD, limite: number) {
  const tope = limite <= 0 || limite > 1000 ? 200 : limite
  return db.select().from(audit_log).orderBy(desc(audit_log.id)).limit(tope).all()
}
