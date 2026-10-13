import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { audit_log } from '../src/db/esquema'
import { clienteAdmin, clienteUsuario, crearCliente, crearEntorno } from './apoyo'
import type { Cliente, Entorno } from './apoyo'

// PNG mínimo válido (1x1): basta la cabecera para que se detecte como imagen.
const PNG = Uint8Array.from(
  atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='),
  (c) => c.charCodeAt(0),
)

let entorno: Entorno
let api: Cliente
beforeAll(async () => {
  entorno = await crearEntorno()
  api = (await clienteAdmin(entorno.app)).api
})
afterAll(() => entorno.limpiar())

async function historial(id: number) {
  // La auditoría se escribe tras responder: se cede el turno antes de leerla.
  await Bun.sleep(20)
  const { data } = await api.pacientes({ id }).historial.get()
  return data ?? []
}

async function nuevoCliente(nombre: string): Promise<number> {
  const { data } = await api.pacientes.post({ nombre, peso: 78.5 })
  if (data === null) throw new Error('no se pudo crear')
  return data.id
}

describe('historial de un cliente', () => {
  test('editar la ficha registra los campos cambiados con su valor anterior y nuevo', async () => {
    const id = await nuevoCliente('Marta Vega')
    await api.pacientes({ id }).put({ nombre: 'Marta Vega', peso: 77.9, telefono: '600' })
    const [ultima] = await historial(id)
    expect(ultima?.usuario).toBe('admin')
    expect(ultima?.paciente_id).toBe(id)
    expect(ultima?.detalle?.cambios).toEqual([
      { campo: 'telefono', antes: null, despues: '600' },
      { campo: 'peso', antes: 78.5, despues: 77.9 },
    ])
  })

  test('editar una revisión registra los campos cambiados', async () => {
    const id = await nuevoCliente('Lucas Pon')
    const creada = await api.pacientes({ id }).revisiones.post({ fecha: '2026-03-01', peso: 80, talla: 175 })
    const revisionId = creada.data?.id ?? 0
    await api.revisiones({ id: revisionId }).put({ fecha: '2026-03-01', peso: 79.2, talla: 175 })
    const entradas = await historial(id)
    expect(entradas[1]?.detalle?.resumen).toBe('Revisión del 2026-03-01')
    expect(entradas[0]?.detalle?.cambios).toEqual([{ campo: 'peso', antes: 80, despues: 79.2 }])
  })

  test('borrar una revisión deja su resumen', async () => {
    const id = await nuevoCliente('Irene Sola')
    const creada = await api.pacientes({ id }).revisiones.post({ fecha: '2026-04-10', peso: 60 })
    await api.revisiones({ id: creada.data?.id ?? 0 }).delete()
    const [ultima] = await historial(id)
    expect(ultima?.metodo).toBe('DELETE')
    expect(ultima?.detalle?.resumen).toBe('Revisión del 2026-04-10')
  })

  test('la traza sobrevive al borrado del cliente y guarda su resumen', async () => {
    const id = await nuevoCliente('Borrado Uno')
    await api.pacientes({ id }).revisiones.post({ fecha: '2026-04-10', peso: 60 })
    await api.pacientes({ id }).delete()
    const [ultima] = await historial(id)
    expect(ultima?.detalle?.resumen).toBe('Cliente «Borrado Uno», 1 revisión y 0 fotos')
  })

  test('no incluye entradas de otro cliente', async () => {
    const a = await nuevoCliente('Cliente A')
    const b = await nuevoCliente('Cliente B')
    await api.pacientes({ id: b }).put({ nombre: 'Cliente B', peso: 70 })
    const entradasA = await historial(a)
    expect(entradasA.every((e) => e.paciente_id === a)).toBe(true)
    expect(entradasA.some((e) => e.detalle?.resumen?.includes('Cliente B'))).toBe(false)
  })

  test('subir y borrar una foto queda en el historial de su cliente', async () => {
    const id = await nuevoCliente('Nora Gil')
    const subida = await api.pacientes({ id }).fotos.post({ foto: new File([PNG], 'frente.png'), nota: 'Frente' })
    const fotoId = subida.data?.id ?? 0
    const [alta] = await historial(id)
    expect(alta?.metodo).toBe('POST')
    expect(alta?.detalle).toEqual({ cambios: [], resumen: 'Foto de progreso: Frente', registro_id: fotoId })
    await api.fotos({ id: fotoId }).delete()
    const [baja] = await historial(id)
    expect(baja?.metodo).toBe('DELETE')
    expect(baja?.paciente_id).toBe(id)
    expect(baja?.detalle?.resumen).toMatch(/^Foto del \d{4}-\d{2}-\d{2}: Frente$/)
  })

  test('una edición rechazada no entra en el historial', async () => {
    const id = await nuevoCliente('Pablo Ruiz')
    const antes = await historial(id)
    expect((await api.pacientes({ id }).put({ nombre: 'Pablo Ruiz', peso: 9999 })).status).toBe(400)
    expect((await api.pacientes({ id }).revisiones.post({ fecha: '2999-01-01', peso: 70 })).status).toBe(400)
    expect(await historial(id)).toEqual(antes)
  })

  test('guardar sin cambios no inventa diferencias', async () => {
    const id = await nuevoCliente('Sara Lema')
    await api.pacientes({ id }).put({ nombre: 'Sara Lema', peso: 78.5 })
    const [ultima] = await historial(id)
    expect(ultima?.metodo).toBe('PUT')
    expect(ultima?.detalle?.cambios).toEqual([])
  })

  test('las contraseñas no llegan nunca a la traza', async () => {
    const clave = 'clave-que-no-debe-verse'
    const creado = await api.usuarios.post({ usuario: 'temporal', password: clave })
    await api.usuarios({ id: creado.data?.id ?? 0 }).password.post({ password: `${clave}-2` })
    await crearCliente(entorno.app).login.post({ usuario: 'temporal', password: 'incorrecta-del-todo' })
    await Bun.sleep(20)
    const filas = entorno.db.select().from(audit_log).all()
    const deUsuarios = filas.filter((f) => f.ruta.startsWith('/api/usuarios') || f.ruta === '/api/login')
    expect(deUsuarios.length).toBeGreaterThanOrEqual(3)
    expect(deUsuarios.every((f) => f.detalle === null && f.paciente_id === null)).toBe(true)
    expect(JSON.stringify(filas)).not.toContain('clave-que-no-debe-verse')
    expect(JSON.stringify(filas)).not.toContain('incorrecta-del-todo')
  })

  test('exige sesión y lo puede leer un usuario sin rol de administrador', async () => {
    const id = await nuevoCliente('Cliente C')
    const anonimo = crearCliente(entorno.app)
    expect((await anonimo.pacientes({ id }).historial.get()).status).toBe(401)
    const { api: ana } = await clienteUsuario(entorno.app)
    expect((await ana.pacientes({ id }).historial.get()).status).toBe(200)
  })

  test('la auditoría general también devuelve cliente y detalle', async () => {
    const id = await nuevoCliente('Cliente D')
    await Bun.sleep(20)
    const { data } = await api.auditoria.get({ query: {} })
    const entrada = (data ?? []).find((e) => e.paciente_id === id)
    expect(entrada?.detalle?.resumen).toBe('Cliente «Cliente D»')
  })
})
