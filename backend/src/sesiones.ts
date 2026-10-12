import { randomBytes } from 'node:crypto'
import { eq, lt } from 'drizzle-orm'
import type { BD } from './db/cliente'
import { sesiones, usuarios } from './db/esquema'

export const COOKIE_SESION = 'nutriclinica_session'
export const DURACION_SESION_S = 12 * 60 * 60

// En la BD solo se guarda el SHA-256 del token: una copia de la BD no sirve para suplantar sesiones.
export function hashToken(token: string): string {
  return new Bun.CryptoHasher('sha256').update(token).digest('hex')
}

// abrirSesion crea una sesión nueva y devuelve el token que viaja en la cookie.
export function abrirSesion(db: BD, usuarioId: number, ahora: number = Date.now()): string {
  const token = randomBytes(32).toString('hex')
  db.delete(sesiones).where(lt(sesiones.expira, ahora)).run()
  db.insert(sesiones)
    .values({ token_hash: hashToken(token), usuario_id: usuarioId, expira: ahora + DURACION_SESION_S * 1000 })
    .run()
  return token
}

// usuarioDeSesion devuelve el usuario de un token vigente. El rol se lee en cada petición.
export function usuarioDeSesion(db: BD, token: string, ahora: number = Date.now()) {
  const token_hash = hashToken(token)
  const fila = db
    .select({ id: usuarios.id, usuario: usuarios.usuario, rol: usuarios.rol, expira: sesiones.expira })
    .from(sesiones)
    .innerJoin(usuarios, eq(usuarios.id, sesiones.usuario_id))
    .where(eq(sesiones.token_hash, token_hash))
    .get()
  if (fila === undefined || fila.expira <= ahora) return null
  return { id: fila.id, usuario: fila.usuario, rol: fila.rol, token_hash }
}

export function cerrarSesion(db: BD, token: string): void {
  db.delete(sesiones).where(eq(sesiones.token_hash, hashToken(token))).run()
}
