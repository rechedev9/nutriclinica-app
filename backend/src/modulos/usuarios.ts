import { Elysia, t } from 'elysia'
import type { Contexto } from '../contexto'
import { listarAuditoria } from '../datos/auditoria'
import { actualizarUsuario, cambiarPassword, crearUsuario, eliminarUsuario, listarUsuarios } from '../datos/usuarios'
import { ErrorHttp } from '../lib/errores'
import { hashPassword } from '../lib/password'
import { idParams, passwordEntrada, usuarioEdicionEntrada, usuarioNuevoEntrada } from '../modelos'
import { normalizarRol, validarPassword } from '../validacion'
import { crearAcceso } from './acceso'

// Usuarios y registro de auditoría: todo exige rol administrador.
export function moduloUsuarios(ctx: Contexto) {
  const { db } = ctx
  return new Elysia({ name: 'usuarios' })
    .use(crearAcceso(ctx))
    .guard({ admin: true })
    .get(
      '/api/auditoria',
      ({ query }) => {
        const limite = Number.parseInt(query.limite ?? '', 10)
        return listarAuditoria(db, Number.isNaN(limite) ? 200 : limite)
      },
      { query: t.Object({ limite: t.Optional(t.String()) }) },
    )
    .get('/api/usuarios', () => listarUsuarios(db))
    .post(
      '/api/usuarios',
      async ({ body, status }) => {
        const usuario = (body.usuario ?? '').trim()
        const password = body.password ?? ''
        if (usuario === '' || password === '') {
          throw new ErrorHttp(400, 'Usuario y contraseña son obligatorios')
        }
        validarPassword(password)
        const rol = normalizarRol(body.rol)
        return status(201, crearUsuario(db, { usuario, password_hash: await hashPassword(password), rol }))
      },
      { body: usuarioNuevoEntrada },
    )
    .put(
      '/api/usuarios/:id',
      ({ params, body }) => {
        const usuario = (body.usuario ?? '').trim()
        if (usuario === '') throw new ErrorHttp(400, 'El usuario es obligatorio')
        return actualizarUsuario(db, params.id, { usuario, rol: normalizarRol(body.rol) })
      },
      { params: idParams, body: usuarioEdicionEntrada },
    )
    .delete(
      '/api/usuarios/:id',
      ({ params, usuario }) => {
        if (usuario.id === params.id) throw new ErrorHttp(400, 'No puedes eliminar tu propia cuenta')
        eliminarUsuario(db, params.id)
        return { ok: true as const }
      },
      { params: idParams },
    )
    .post(
      '/api/usuarios/:id/password',
      async ({ params, body, usuario }) => {
        const password = body.password ?? ''
        validarPassword(password)
        // Si el administrador cambia la suya, conserva su sesión actual.
        const conservar = usuario.id === params.id ? usuario.token_hash : undefined
        cambiarPassword(db, { id: params.id, password_hash: await hashPassword(password), conservar })
        return { ok: true as const }
      },
      { params: idParams, body: passwordEntrada },
    )
}
