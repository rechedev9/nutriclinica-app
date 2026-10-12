import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { treaty } from '@elysiajs/eden'
import { crearApp } from '../src/app'
import type { App } from '../src/app'
import { abrirBD } from '../src/db/cliente'
import { usuarios } from '../src/db/esquema'
import { hashPassword } from '../src/lib/password'
import { COOKIE_SESION } from '../src/sesiones'

export const CLAVE_ADMIN = 'clave-de-admin'
export const CLAVE_USUARIO = 'clave-de-usuario'

// crearEntorno monta la app sobre una BD en memoria y una carpeta de fotos temporal,
// con un administrador («admin») y un usuario normal («ana»).
export async function crearEntorno() {
  const fotosDir = await mkdtemp(join(tmpdir(), 'nutriclinica-test-'))
  const db = abrirBD(':memory:')
  db.insert(usuarios)
    .values([
      { usuario: 'admin', rol: 'admin', password_hash: await hashPassword(CLAVE_ADMIN) },
      { usuario: 'ana', rol: 'user', password_hash: await hashPassword(CLAVE_USUARIO) },
    ])
    .run()
  const app = crearApp({ db, fotosDir, https: false, spa: null })
  return { app, db, fotosDir, limpiar: () => rm(fotosDir, { recursive: true, force: true }) }
}

export type Entorno = Awaited<ReturnType<typeof crearEntorno>>

// crearCliente devuelve un cliente Eden con su propio tarro de cookies (una sesión).
export function crearCliente(app: App) {
  let cookie = ''
  return treaty(app, {
    // Las fechas viajan como texto AAAA-MM-DD: Eden no debe convertirlas a Date.
    parseDate: false,
    headers: () => (cookie === '' ? {} : { cookie }),
    onResponse(respuesta) {
      const nueva = respuesta.headers.getSetCookie().find((c) => c.startsWith(`${COOKIE_SESION}=`))
      if (nueva !== undefined) cookie = nueva.split(';')[0] ?? ''
    },
  }).api
}

export type Cliente = ReturnType<typeof crearCliente>

// OJO: el cliente Eden es un Proxy y no puede devolverse desde una función async
// (el motor lo trataría como promesa y llamaría a su "then"): por eso se envuelve.
export async function clienteAdmin(app: App): Promise<{ api: Cliente }> {
  const api = crearCliente(app)
  await api.login.post({ usuario: 'admin', password: CLAVE_ADMIN })
  return { api }
}

export async function clienteUsuario(app: App): Promise<{ api: Cliente }> {
  const api = crearCliente(app)
  await api.login.post({ usuario: 'ana', password: CLAVE_USUARIO })
  return { api }
}

// mensajeDe extrae el cuerpo de error ({ error }) de una respuesta de Eden.
export function mensajeDe(respuesta: { error: { value: unknown } | null }): unknown {
  return respuesta.error?.value
}
