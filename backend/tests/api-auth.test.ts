import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { CLAVE_ADMIN, CLAVE_USUARIO, clienteAdmin, clienteUsuario, crearCliente, crearEntorno, mensajeDe } from './apoyo'
import type { Entorno } from './apoyo'

let entorno: Entorno
beforeAll(async () => {
  entorno = await crearEntorno()
})
afterAll(() => entorno.limpiar())

describe('sesión', () => {
  test('estado es público y lleva las cabeceras de seguridad', async () => {
    const { data, response } = await crearCliente(entorno.app).estado.get()
    expect(data).toEqual({ estado: 'abierto' })
    expect(response.headers.get('x-frame-options')).toBe('DENY')
    expect(response.headers.get('content-security-policy')).toContain("frame-ancestors 'none'")
  })

  test('sin sesión la API responde 401', async () => {
    const api = crearCliente(entorno.app)
    const me = await api.me.get()
    expect(me.status).toBe(401)
    expect(mensajeDe(me)).toEqual({ error: 'No autenticado' })
    expect((await api.pacientes.get()).status).toBe(401)
    expect((await api.usuarios.get()).status).toBe(401)
  })

  test('login correcto abre sesión y logout la cierra', async () => {
    const api = crearCliente(entorno.app)
    const login = await api.login.post({ usuario: 'admin', password: CLAVE_ADMIN })
    expect(login.data).toEqual({ ok: true, usuario: 'admin', rol: 'admin' })
    const cookie = login.response.headers.getSetCookie().join(';')
    expect(cookie).toContain('HttpOnly')
    expect(cookie).toContain('SameSite=Strict')
    expect(cookie).not.toContain('Secure')

    const me = await api.me.get()
    expect(me.data).toMatchObject({ usuario: 'admin', rol: 'admin' })

    expect((await api.logout.post()).data).toEqual({ ok: true })
    expect((await api.me.get()).status).toBe(401)
  })

  test('login incorrecto da 401 con el mismo mensaje exista o no el usuario', async () => {
    const api = crearCliente(entorno.app)
    const mala = await api.login.post({ usuario: 'admin', password: 'no-es-esta' })
    const nadie = await api.login.post({ usuario: 'nadie', password: 'no-es-esta' })
    expect(mala.status).toBe(401)
    expect(nadie.status).toBe(401)
    expect(mensajeDe(mala)).toEqual({ error: 'Usuario o contraseña incorrectos' })
    expect(mensajeDe(nadie)).toEqual(mensajeDe(mala))
    expect((await api.login.post({ usuario: 'admin', password: '' })).status).toBe(401)
  })

  test('un usuario normal no entra en las rutas de administrador', async () => {
    const { api } = await clienteUsuario(entorno.app)
    const lista = await api.usuarios.get()
    expect(lista.status).toBe(403)
    expect(mensajeDe(lista)).toEqual({ error: 'Requiere rol administrador' })
    expect((await api.auditoria.get({ query: {} })).status).toBe(403)
    expect((await api.pacientes.get()).status).toBe(200)
  })

  test('cambiar la contraseña propia exige la actual y la política mínima', async () => {
    const { api } = await clienteUsuario(entorno.app)
    const corta = await api.me.password.post({ actual: CLAVE_USUARIO, nueva: 'corta' })
    expect(corta.status).toBe(400)
    expect(mensajeDe(corta)).toEqual({ error: 'La contraseña debe tener al menos 8 caracteres' })
    const erronea = await api.me.password.post({ actual: 'otra-distinta', nueva: 'nueva-clave-1' })
    expect(erronea.status).toBe(403)

    const { api: otraSesion } = await clienteUsuario(entorno.app)
    const cambio = await api.me.password.post({ actual: CLAVE_USUARIO, nueva: 'nueva-clave-1' })
    expect(cambio.data).toEqual({ ok: true })
    // La sesión que hizo el cambio sigue viva; las demás del usuario se cierran.
    expect((await api.me.get()).status).toBe(200)
    expect((await otraSesion.me.get()).status).toBe(401)
    const nuevo = crearCliente(entorno.app)
    expect((await nuevo.login.post({ usuario: 'ana', password: CLAVE_USUARIO })).status).toBe(401)
    expect((await nuevo.login.post({ usuario: 'ana', password: 'nueva-clave-1' })).status).toBe(200)
  })
})

describe('auditoría y límite de intentos', () => {
  test('anota accesos, salidas y mutaciones, no las lecturas', async () => {
    const { app, limpiar } = await crearEntorno()
    const { api } = await clienteAdmin(app)
    await api.pacientes.get()
    await api.pacientes.post({ nombre: 'Laura Sánchez' })
    await api.pacientes.post({ nombre: '' })
    await crearCliente(app).login.post({ usuario: 'admin', password: 'no-es-esta' })
    await api['exportar-excel'].get({ query: {} })
    await api.logout.post()
    const { api: lector } = await clienteAdmin(app)
    // La auditoría se escribe tras responder: se cede el turno antes de leerla.
    await Bun.sleep(20)
    const { data } = await lector.auditoria.get({ query: {} })
    const filas = (data ?? []).map((f) => `${f.usuario}|${f.metodo}|${f.ruta}|${f.estado}`)
    expect(filas).toEqual([
      'admin|Acceso|/api/login|200',
      'admin|Salida|/api/logout|200',
      'admin|GET|/api/exportar-excel|200',
      '|Acceso|/api/login|401',
      'admin|POST|/api/pacientes|400',
      'admin|POST|/api/pacientes|201',
      'admin|Acceso|/api/login|200',
    ])
    await limpiar()
  })

  test('el límite de intentos de login responde 429', async () => {
    const { app, limpiar } = await crearEntorno()
    const api = crearCliente(app)
    const estados: number[] = []
    for (let i = 0; i < 11; i++) {
      estados.push((await api.login.post({ usuario: 'nadie', password: 'x' })).status)
    }
    expect(estados.slice(0, 10).every((e) => e === 401)).toBe(true)
    expect(estados[10]).toBe(429)
    await limpiar()
  })
})
