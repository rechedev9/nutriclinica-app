import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import ExcelJS from 'exceljs'
import { fechaLocal, sumarDias } from '../src/lib/fechas'
import { CLAVE_ADMIN, clienteAdmin, crearCliente, crearEntorno, mensajeDe } from './apoyo'
import type { Cliente, Entorno } from './apoyo'

// PNG mínimo válido (1x1): basta la cabecera para que se detecte como imagen.
const PNG = Uint8Array.from(
  atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='),
  (c) => c.charCodeAt(0),
)

let entorno: Entorno
let api: Cliente
let cookie = ''
beforeAll(async () => {
  entorno = await crearEntorno()
  api = (await clienteAdmin(entorno.app)).api
  // Segunda sesión, para las peticiones que no pasan por Eden (descargas, rutas crudas).
  const login = await crearCliente(entorno.app).login.post({ usuario: 'admin', password: CLAVE_ADMIN })
  cookie = login.response.headers.getSetCookie()[0]?.split(';')[0] ?? ''
})
afterAll(() => entorno.limpiar())

function pedir(ruta: string, opciones: RequestInit = {}): Promise<Response> {
  const headers = { ...opciones.headers, cookie }
  return Promise.resolve(entorno.app.handle(new Request(`http://localhost${ruta}`, { ...opciones, headers })))
}

async function nuevoPaciente(nombre: string): Promise<number> {
  const { data } = await api.pacientes.post({ nombre })
  if (data === null) throw new Error(`no se pudo crear ${nombre}`)
  return data.id
}

describe('pacientes', () => {
  test('crear, listar, editar y borrar', async () => {
    const creado = await api.pacientes.post({ nombre: '  Zoe Ruiz ', peso: 61.5, talla: 168, consentimiento: 1 })
    expect(creado.status).toBe(201)
    expect(creado.data).toMatchObject({ nombre: 'Zoe Ruiz', peso: 61.5, num_fotos: 0, num_revisiones: 0 })
    expect(creado.data?.consentimiento_fecha).not.toBeNull()
    const id = creado.data?.id ?? 0

    await nuevoPaciente('Álvaro Gil')
    const nombres = ((await api.pacientes.get()).data ?? []).map((p) => p.nombre)
    // Orden alfabético sin distinguir acentos.
    expect(nombres.indexOf('Álvaro Gil')).toBeLessThan(nombres.indexOf('Zoe Ruiz'))

    const editado = await api.pacientes({ id }).put({ nombre: 'Zoe Ruiz', peso: 60 })
    expect(editado.data).toMatchObject({ id, peso: 60 })
    expect((await api.pacientes({ id: 9999 }).put({ nombre: 'Nadie' })).status).toBe(404)

    expect((await api.pacientes({ id }).delete()).data).toEqual({ ok: true })
    expect(((await api.pacientes.get()).data ?? []).some((p) => p.id === id)).toBe(false)
  })

  test('valida el nombre y los rangos clínicos', async () => {
    const casos = [
      [{ nombre: '   ' }, 'El nombre es obligatorio'],
      [{ nombre: 'Ana', peso: 600 }, 'El peso debe estar entre 1 y 500 kg'],
      [{ nombre: 'Ana', talla: 10 }, 'La talla debe estar entre 30 y 260 cm'],
      [{ nombre: 'Ana', fecha_nac: '2999-01-01' }, 'La fecha de nacimiento no es válida'],
    ] as const
    for (const [cuerpo, mensaje] of casos) {
      const respuesta = await api.pacientes.post(cuerpo)
      expect(respuesta.status).toBe(400)
      expect(mensajeDe(respuesta)).toEqual({ error: mensaje })
    }
  })

  test('un id no numérico o un cuerpo mal tipado dan 400', async () => {
    const malId = await pedir('/api/pacientes/abc', { method: 'DELETE' })
    expect(malId.status).toBe(400)
    expect(await malId.json()).toEqual({ error: 'id inválido' })
    const malCuerpo = await pedir('/api/pacientes', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ nombre: 'Ana', peso: 'mucho' }),
    })
    expect(malCuerpo.status).toBe(400)
    expect(await malCuerpo.json()).toEqual({ error: 'Datos no válidos' })
    const roto = await pedir('/api/pacientes', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{mal',
    })
    expect(roto.status).toBe(400)
    expect(await roto.json()).toEqual({ error: 'JSON inválido' })
    expect((await pedir('/api/no-existe')).status).toBe(404)
  })
})

describe('revisiones', () => {
  test('crear, listar, editar y borrar', async () => {
    const id = await nuevoPaciente('Marta Soler')
    const creada = await api.pacientes({ id }).revisiones.post({ fecha: '2026-01-10', peso: 70, pl_tricipital: 12 })
    expect(creada.status).toBe(201)
    expect(creada.data).toMatchObject({ paciente_id: id, fecha: '2026-01-10', peso: 70 })
    const revisionId = creada.data?.id ?? 0

    await api.pacientes({ id }).revisiones.post({ fecha: '2026-02-10', peso: 69 })
    const lista = (await api.pacientes({ id }).revisiones.get()).data ?? []
    expect(lista.map((r) => r.fecha)).toEqual(['2026-02-10', '2026-01-10'])
    const paciente = ((await api.pacientes.get()).data ?? []).find((p) => p.id === id)
    expect(paciente?.num_revisiones).toBe(2)

    const editada = await api.revisiones({ id: revisionId }).put({ fecha: '2026-01-11', peso: 70.4 })
    expect(editada.data).toMatchObject({ id: revisionId, fecha: '2026-01-11', peso: 70.4 })
    expect((await api.revisiones({ id: 9999 }).put({ fecha: '2026-01-11', peso: 70 })).status).toBe(404)

    expect((await api.revisiones({ id: revisionId }).delete()).data).toEqual({ ok: true })
    expect(((await api.pacientes({ id }).revisiones.get()).data ?? []).length).toBe(1)
  })

  test('valida fecha, rangos y que haya algún dato', async () => {
    const id = await nuevoPaciente('Pablo Vera')
    const futura = sumarDias(fechaLocal(new Date()), 5)
    const casos = [
      [{ peso: 70 }, 'La fecha de la revisión es obligatoria'],
      [{ fecha: 'ayer', peso: 70 }, 'La fecha de la revisión no es válida'],
      [{ fecha: futura, peso: 70 }, 'La fecha de la revisión no puede ser futura'],
      [{ fecha: '2026-01-10', peso: 0.5 }, 'El peso debe estar entre 1 y 500 kg'],
      [{ fecha: '2026-01-10', pl_tricipital: 150 }, 'Los pliegues deben estar entre 0 y 100 mm'],
      [{ fecha: '2026-01-10' }, 'La revisión debe incluir al menos una medida o una nota'],
    ] as const
    for (const [cuerpo, mensaje] of casos) {
      const respuesta = await api.pacientes({ id }).revisiones.post(cuerpo)
      expect(respuesta.status).toBe(400)
      expect(mensajeDe(respuesta)).toEqual({ error: mensaje })
    }
    const sinPaciente = await api.pacientes({ id: 9999 }).revisiones.post({ fecha: '2026-01-10', peso: 70 })
    expect(sinPaciente.status).toBe(404)
  })
})

describe('fotos', () => {
  test('subir, servir y borrar una foto', async () => {
    const id = await nuevoPaciente('José Pérez Gómez')
    const subida = await api.pacientes({ id }).fotos.post({ foto: new File([PNG], 'frente.PNG'), nota: ' Frente ' })
    expect(subida.status).toBe(201)
    expect(subida.data?.nota).toBe('Frente')
    const filename = subida.data?.filename ?? ''
    expect(filename).toMatch(/^JosePerezGomez\/jose_perez_gomez_\d{8}_\d{6}_[0-9a-f]{6}\.png$/)
    expect(existsSync(join(entorno.fotosDir, filename))).toBe(true)

    const servida = await pedir(`/fotos/${filename}`)
    expect(servida.status).toBe(200)
    expect(new Uint8Array(await servida.arrayBuffer())).toEqual(PNG)
    const sinSesion = await entorno.app.handle(new Request(`http://localhost/fotos/${filename}`))
    expect(sinSesion.status).toBe(401)

    const lista = (await api.pacientes({ id }).fotos.get()).data ?? []
    expect(lista.map((f) => f.filename)).toEqual([filename])
    expect((await api.fotos({ id: subida.data?.id ?? 0 }).delete()).data).toEqual({ ok: true })
    expect(existsSync(join(entorno.fotosDir, filename))).toBe(false)
  })

  test('rechaza lo que no es una imagen y nunca guarda extensiones peligrosas', async () => {
    const id = await nuevoPaciente('Lucía Ramos')
    const texto = await api.pacientes({ id }).fotos.post({ foto: new File(['<script>'], 'hola.png') })
    expect(texto.status).toBe(400)
    expect(mensajeDe(texto)).toEqual({ error: 'El archivo no es una imagen' })
    const disfrazada = await api.pacientes({ id }).fotos.post({ foto: new File([PNG], 'pagina.html') })
    expect(disfrazada.data?.filename).toEndWith('.png')
  })

  test('borrar el paciente borra sus fotos del disco', async () => {
    const id = await nuevoPaciente('Irene Costa')
    const subida = await api.pacientes({ id }).fotos.post({ foto: new File([PNG], 'a.png') })
    const filename = subida.data?.filename ?? ''
    await api.pacientes({ id }).delete()
    expect(existsSync(join(entorno.fotosDir, filename))).toBe(false)
    expect(existsSync(join(entorno.fotosDir, 'IreneCosta'))).toBe(false)
  })

  test('las rutas que intentan salir de la carpeta de fotos no se sirven', async () => {
    for (const ruta of ['..%2F..%2Fbbdd%2Fnutriclinica.db', '%2e%2e/secreto.png', 'C:%5Cwindows%5Cwin.ini', 'no-existe.png']) {
      const respuesta = await pedir(`/fotos/${ruta}`)
      expect([400, 404]).toContain(respuesta.status)
    }
  })
})

describe('exportación a Excel', () => {
  test('exporta pacientes y revisiones', async () => {
    const id = await nuevoPaciente('Exportada Uno')
    await api.pacientes({ id }).revisiones.post({ fecha: '2026-03-01', peso: 66 })
    const todo = await pedir('/api/exportar-excel')
    expect(todo.status).toBe(200)
    expect(todo.headers.get('content-type')).toContain('spreadsheetml')
    expect(todo.headers.get('content-disposition')).toContain('attachment')
    const libro = new ExcelJS.Workbook()
    await libro.xlsx.load(await todo.arrayBuffer())
    expect(libro.worksheets.map((h) => h.name)).toEqual(['Pacientes', 'Revisiones'])
    const nombres = libro.getWorksheet('Pacientes')?.getColumn(2).values ?? []
    expect(nombres).toContain('Exportada Uno')

    expect((await pedir(`/api/exportar-excel?id=${id}`)).status).toBe(200)
    expect((await pedir('/api/exportar-excel?id=9999')).status).toBe(404)
    const revision = ((await api.pacientes({ id }).revisiones.get()).data ?? [])[0]
    expect((await pedir(`/api/exportar-revision/${revision?.id}`)).status).toBe(200)
    expect((await pedir('/api/exportar-revision/9999')).status).toBe(404)
  })
})
