import { and, eq, ne } from 'drizzle-orm'
import type { BD, Ejecutor } from '../db/cliente'
import { sesiones, usuarios } from '../db/esquema'
import { ErrorHttp } from '../lib/errores'
import { porNombre } from '../lib/texto'

type Rol = (typeof usuarios.$inferSelect)['rol']

// Columnas públicas: nunca se devuelve el hash de la contraseña.
const publico = {
  id: usuarios.id,
  usuario: usuarios.usuario,
  rol: usuarios.rol,
  creado: usuarios.creado,
}

export function listarUsuarios(db: BD) {
  return porNombre(db.select(publico).from(usuarios).all(), (u) => u.usuario)
}

// buscarUsuario devuelve el usuario con su hash, solo para autenticar.
export function buscarUsuario(db: BD, nombre: string) {
  return db.select().from(usuarios).where(eq(usuarios.usuario, nombre)).get() ?? null
}

export function hashDeUsuario(db: BD, id: number): string | null {
  const fila = db.select({ hash: usuarios.password_hash }).from(usuarios).where(eq(usuarios.id, id)).get()
  return fila?.hash ?? null
}

function nombreOcupado(tx: Ejecutor, nombre: string, excepto: number): boolean {
  const filtro = and(eq(usuarios.usuario, nombre), ne(usuarios.id, excepto))
  return tx.select({ id: usuarios.id }).from(usuarios).where(filtro).get() !== undefined
}

function hayOtroAdmin(tx: Ejecutor, id: number): boolean {
  const filtro = and(eq(usuarios.rol, 'admin'), ne(usuarios.id, id))
  return tx.select({ id: usuarios.id }).from(usuarios).where(filtro).get() !== undefined
}

export function crearUsuario(db: BD, datos: { usuario: string; password_hash: string; rol: Rol }) {
  return db.transaction(
    (tx) => {
      if (nombreOcupado(tx, datos.usuario, 0)) throw new ErrorHttp(409, 'Ese nombre de usuario ya existe')
      return tx.insert(usuarios).values(datos).returning(publico).get()
    },
    { behavior: 'immediate' },
  )
}

// actualizarUsuario cambia nombre y rol. No permite degradar al único administrador.
export function actualizarUsuario(db: BD, id: number, datos: { usuario: string; rol: Rol }) {
  return db.transaction(
    (tx) => {
      const actual = tx.select({ rol: usuarios.rol }).from(usuarios).where(eq(usuarios.id, id)).get()
      if (actual === undefined) throw new ErrorHttp(404, 'Usuario no encontrado')
      if (actual.rol === 'admin' && datos.rol !== 'admin' && !hayOtroAdmin(tx, id)) {
        throw new ErrorHttp(409, 'Debe quedar al menos un administrador')
      }
      if (nombreOcupado(tx, datos.usuario, id)) throw new ErrorHttp(409, 'Ese nombre de usuario ya existe')
      return tx.update(usuarios).set(datos).where(eq(usuarios.id, id)).returning(publico).get()
    },
    { behavior: 'immediate' },
  )
}

// cambiarPassword guarda el hash nuevo y cierra las sesiones de ese usuario, salvo la indicada.
export function cambiarPassword(db: BD, cambio: { id: number; password_hash: string; conservar?: string }): void {
  db.transaction(
    (tx) => {
      const cambiados = tx
        .update(usuarios)
        .set({ password_hash: cambio.password_hash })
        .where(eq(usuarios.id, cambio.id))
        .returning({ id: usuarios.id })
        .all()
      if (cambiados.length === 0) throw new ErrorHttp(404, 'Usuario no encontrado')
      const deUsuario = eq(sesiones.usuario_id, cambio.id)
      const filtro =
        cambio.conservar === undefined ? deUsuario : and(deUsuario, ne(sesiones.token_hash, cambio.conservar))
      tx.delete(sesiones).where(filtro).run()
    },
    { behavior: 'immediate' },
  )
}

// eliminarUsuario borra el usuario (y sus sesiones, en cascada). No permite borrar al único administrador.
export function eliminarUsuario(db: BD, id: number): void {
  db.transaction(
    (tx) => {
      const actual = tx.select({ rol: usuarios.rol }).from(usuarios).where(eq(usuarios.id, id)).get()
      if (actual === undefined) return
      if (actual.rol === 'admin' && !hayOtroAdmin(tx, id)) {
        throw new ErrorHttp(409, 'No se puede eliminar al último administrador')
      }
      tx.delete(usuarios).where(eq(usuarios.id, id)).run()
    },
    { behavior: 'immediate' },
  )
}
