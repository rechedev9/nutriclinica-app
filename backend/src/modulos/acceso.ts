import { Elysia } from 'elysia'
import type { Contexto } from '../contexto'
import { ErrorHttp } from '../lib/errores'
import { COOKIE_SESION, usuarioDeSesion } from '../sesiones'

// Quién hizo cada petición, para el registro de auditoría (que se escribe tras responder).
const actores = new WeakMap<Request, string>()

export function anotarActor(request: Request, usuario: string): void {
  actores.set(request, usuario)
}

export function actorDe(request: Request): string {
  return actores.get(request) ?? ''
}

// crearAcceso aporta las macros `sesion` y `admin`: exigen sesión (o rol administrador)
// y dejan el usuario en el contexto de la ruta.
export function crearAcceso(ctx: Contexto) {
  function exigirSesion(request: Request, token: unknown) {
    const usuario = typeof token === 'string' && token !== '' ? usuarioDeSesion(ctx.db, token) : null
    if (usuario === null) throw new ErrorHttp(401, 'No autenticado')
    anotarActor(request, usuario.usuario)
    return usuario
  }

  return new Elysia({ name: 'acceso' }).macro({
    sesion: {
      resolve({ cookie, request }) {
        return { usuario: exigirSesion(request, cookie[COOKIE_SESION]?.value) }
      },
    },
    admin: {
      resolve({ cookie, request }) {
        const usuario = exigirSesion(request, cookie[COOKIE_SESION]?.value)
        if (usuario.rol !== 'admin') throw new ErrorHttp(403, 'Requiere rol administrador')
        return { usuario }
      },
    },
  })
}
