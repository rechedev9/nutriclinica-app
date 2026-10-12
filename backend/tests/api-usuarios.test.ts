import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { CLAVE_ADMIN, clienteAdmin, crearCliente, crearEntorno, mensajeDe } from './apoyo'
import type { Cliente, Entorno } from './apoyo'

let entorno: Entorno
let api: Cliente
beforeAll(async () => {
  entorno = await crearEntorno()
  api = (await clienteAdmin(entorno.app)).api
})
afterAll(() => entorno.limpiar())

describe('usuarios', () => {
  test('listar no expone el hash de la contraseña', async () => {
    const lista = (await api.usuarios.get()).data ?? []
    expect(lista.map((u) => u.usuario)).toEqual(['admin', 'ana'])
    expect(Object.keys(lista[0] ?? {}).sort()).toEqual(['creado', 'id', 'rol', 'usuario'])
  })

  test('crear valida los datos y el nombre es único', async () => {
    const casos = [
      [{ usuario: '', password: 'una-clave-larga' }, 400, 'Usuario y contraseña son obligatorios'],
      [{ usuario: 'eva', password: 'corta' }, 400, 'La contraseña debe tener al menos 8 caracteres'],
      [{ usuario: 'eva', password: 'una-clave-larga', rol: 'jefe' }, 400, 'El rol no es válido'],
      [{ usuario: 'ana', password: 'una-clave-larga' }, 409, 'Ese nombre de usuario ya existe'],
    ] as const
    for (const [cuerpo, estado, mensaje] of casos) {
      const respuesta = await api.usuarios.post(cuerpo)
      expect(respuesta.status).toBe(estado)
      expect(mensajeDe(respuesta)).toEqual({ error: mensaje })
    }
    const creada = await api.usuarios.post({ usuario: ' eva ', password: 'una-clave-larga' })
    expect(creada.status).toBe(201)
    expect(creada.data).toMatchObject({ usuario: 'eva', rol: 'user' })
    const eva = crearCliente(entorno.app)
    expect((await eva.login.post({ usuario: 'eva', password: 'una-clave-larga' })).status).toBe(200)
  })

  test('siempre queda al menos un administrador', async () => {
    const yo = (await api.me.get()).data?.id ?? 0
    const propia = await api.usuarios({ id: yo }).delete()
    expect(propia.status).toBe(400)
    expect(mensajeDe(propia)).toEqual({ error: 'No puedes eliminar tu propia cuenta' })

    const degradado = await api.usuarios({ id: yo }).put({ usuario: 'admin', rol: 'user' })
    expect(degradado.status).toBe(409)
    expect(mensajeDe(degradado)).toEqual({ error: 'Debe quedar al menos un administrador' })

    // Con un segundo administrador, el primero ya se puede degradar o borrar.
    const otra = await api.usuarios.post({ usuario: 'jefa', password: 'una-clave-larga', rol: 'admin' })
    const jefa = crearCliente(entorno.app)
    await jefa.login.post({ usuario: 'jefa', password: 'una-clave-larga' })
    expect((await jefa.usuarios({ id: yo }).put({ usuario: 'admin', rol: 'user' })).status).toBe(200)
    // El cambio de rol se aplica a las sesiones abiertas.
    expect((await api.usuarios.get()).status).toBe(403)
    const ultima = await jefa.usuarios({ id: otra.data?.id ?? 0 }).put({ usuario: 'jefa', rol: 'user' })
    expect(ultima.status).toBe(409)
    expect((await jefa.usuarios({ id: yo }).put({ usuario: 'admin', rol: 'admin' })).status).toBe(200)
    expect((await api.usuarios({ id: otra.data?.id ?? 0 }).delete()).data).toEqual({ ok: true })
    expect((await jefa.me.get()).status).toBe(401)
  })

  test('editar y cambiar la contraseña de otro usuario', async () => {
    const creado = await api.usuarios.post({ usuario: 'luis', password: 'una-clave-larga' })
    const id = creado.data?.id ?? 0
    const luis = crearCliente(entorno.app)
    await luis.login.post({ usuario: 'luis', password: 'una-clave-larga' })

    const repetido = await api.usuarios({ id }).put({ usuario: 'ana', rol: 'user' })
    expect(repetido.status).toBe(409)
    expect((await api.usuarios({ id: 9999 }).put({ usuario: 'nadie', rol: 'user' })).status).toBe(404)
    expect((await api.usuarios({ id }).put({ usuario: 'luis2', rol: 'user' })).data).toMatchObject({ usuario: 'luis2' })

    expect((await api.usuarios({ id }).password.post({ password: 'corta' })).status).toBe(400)
    expect((await api.usuarios({ id: 9999 }).password.post({ password: 'otra-clave-larga' })).status).toBe(404)
    expect((await api.usuarios({ id }).password.post({ password: 'otra-clave-larga' })).data).toEqual({ ok: true })
    // El cambio cierra las sesiones del usuario afectado, no la del administrador.
    expect((await luis.me.get()).status).toBe(401)
    expect((await api.me.get()).status).toBe(200)
    expect((await luis.login.post({ usuario: 'luis2', password: 'otra-clave-larga' })).status).toBe(200)
    expect((await crearCliente(entorno.app).login.post({ usuario: 'admin', password: CLAVE_ADMIN })).status).toBe(200)
  })
})
