import { Elysia, t } from 'elysia'
import type { Contexto } from '../contexto'
import { buscarUsuario, cambiarPassword, hashDeUsuario } from '../datos/usuarios'
import { ErrorHttp } from '../lib/errores'
import { Limitador } from '../lib/limitador'
import { COSTE_BCRYPT, hashPassword } from '../lib/password'
import { loginEntrada, miPasswordEntrada } from '../modelos'
import { COOKIE_SESION, DURACION_SESION_S, abrirSesion, cerrarSesion, usuarioDeSesion } from '../sesiones'
import { validarPassword } from '../validacion'
import { anotarActor, crearAcceso } from './acceso'

const cookieSesion = t.Cookie({ [COOKIE_SESION]: t.Optional(t.String()) })

export function moduloAuth(ctx: Contexto) {
  const { db } = ctx
  // 10 intentos de login por minuto y dirección.
  const limitador = new Limitador(10, 60_000)
  // Hash de relleno: el login tarda lo mismo exista o no el usuario.
  const hashFalso = Bun.password.hashSync('nutriclinica-usuario-inexistente', {
    algorithm: 'bcrypt',
    cost: COSTE_BCRYPT,
  })

  return new Elysia({ name: 'auth' })
    .use(crearAcceso(ctx))
    .get('/api/estado', () => ({ estado: 'abierto' as const }))
    .post(
      '/api/login',
      async ({ body, cookie, request, server }) => {
        const ip = server?.requestIP(request)?.address ?? 'desconocida'
        if (!limitador.permite(ip)) {
          throw new ErrorHttp(429, 'Demasiados intentos, espera un momento e inténtalo de nuevo')
        }
        const password = body.password ?? ''
        const cuenta = buscarUsuario(db, body.usuario ?? '')
        const coincide = await Bun.password.verify(password || ' ', cuenta?.password_hash ?? hashFalso)
        if (cuenta === null || password === '' || !coincide) {
          throw new ErrorHttp(401, 'Usuario o contraseña incorrectos')
        }
        // Cada login abre una sesión con un token nuevo: evita la fijación de sesión.
        cookie[COOKIE_SESION].set({
          value: abrirSesion(db, cuenta.id),
          httpOnly: true,
          sameSite: 'strict',
          secure: ctx.https,
          path: '/',
          maxAge: DURACION_SESION_S,
        })
        anotarActor(request, cuenta.usuario)
        return { ok: true as const, usuario: cuenta.usuario, rol: cuenta.rol }
      },
      { body: loginEntrada, cookie: cookieSesion },
    )
    .post(
      '/api/logout',
      ({ cookie, request }) => {
        const token = cookie[COOKIE_SESION].value
        if (token !== undefined && token !== '') {
          const usuario = usuarioDeSesion(db, token)
          if (usuario !== null) anotarActor(request, usuario.usuario)
          cerrarSesion(db, token)
        }
        cookie[COOKIE_SESION].remove()
        return { ok: true as const }
      },
      { cookie: cookieSesion },
    )
    .get('/api/me', ({ usuario }) => ({ id: usuario.id, usuario: usuario.usuario, rol: usuario.rol }), {
      sesion: true,
    })
    .post(
      '/api/me/password',
      async ({ body, usuario }) => {
        const nueva = body.nueva ?? ''
        validarPassword(nueva)
        const hash = hashDeUsuario(db, usuario.id)
        const coincide = hash !== null && (await Bun.password.verify(body.actual || ' ', hash))
        if (!coincide) throw new ErrorHttp(403, 'La contraseña actual no es correcta')
        cambiarPassword(db, {
          id: usuario.id,
          password_hash: await hashPassword(nueva),
          conservar: usuario.token_hash,
        })
        return { ok: true as const }
      },
      { sesion: true, body: miPasswordEntrada },
    )
}
