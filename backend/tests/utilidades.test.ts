import { Database } from 'bun:sqlite'
import { describe, expect, test } from 'bun:test'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import diario from '../drizzle/meta/_journal.json'
import { abrirBD } from '../src/db/cliente'
import { stock_productos, usuarios } from '../src/db/esquema'
import { MIGRACIONES } from '../src/db/migraciones'
import { sembrarStock, sembrarUsuarios, usuariosConPasswordInicial } from '../src/db/semilla'
import { listarAlmacen, listarCompras } from '../src/datos/stock'
import { diferencias, leerDetalle } from '../src/lib/cambios'
import { ErrorHttp } from '../src/lib/errores'
import { parseFecha, selloArchivo, sumarDias } from '../src/lib/fechas'
import { extensionImagen } from '../src/lib/imagen'
import { Limitador } from '../src/lib/limitador'
import { carpeta, prefijo } from '../src/lib/naming'
import { rutaSegura } from '../src/lib/rutas'
import { abrirSesion, cerrarSesion, usuarioDeSesion } from '../src/sesiones'
import { validarPassword } from '../src/validacion'

describe('naming', () => {
  // Estos nombres DEBEN coincidir con las carpetas de fotos que ya existen en disco.
  test('prefijo', () => {
    expect(prefijo('Laura Sanchez Moreno')).toBe('laura_sanchez_moreno')
    expect(prefijo('Rafael Pascual Morcillo')).toBe('rafael_pascual_morcillo')
    expect(prefijo('José Pérez Gómez')).toBe('jose_perez_gomez')
    expect(prefijo('  Ana   María  ')).toBe('ana_maria')
    expect(prefijo('Núñez')).toBe('nunez')
  })

  test('carpeta', () => {
    expect(carpeta('Laura Sanchez Moreno')).toBe('LauraSanchezMoreno')
    expect(carpeta('Rafael Pascual Morcillo')).toBe('RafaelPascualMorcillo')
    expect(carpeta('José Pérez Gómez')).toBe('JosePerezGomez')
    expect(carpeta('ANA maría')).toBe('AnaMaria')
    expect(carpeta('Núñez')).toBe('Nunez')
  })
})

describe('rutaSegura', () => {
  const base = resolve('fotos-de-prueba')

  test('acepta rutas dentro de la carpeta', () => {
    expect(rutaSegura(base, 'AnaMaria/ana_1.png')).toBe(resolve(base, 'AnaMaria', 'ana_1.png'))
    expect(rutaSegura(base, 'AnaMaria\\ana_1.png')).toBe(resolve(base, 'AnaMaria', 'ana_1.png'))
  })

  test('rechaza todo lo que intenta salir', () => {
    const malas = ['', '/', '..', '../secreto', 'a/../../b', 'C:\\Windows\\win.ini', 'C:/x', 'a\0b', '..\\..\\x']
    for (const ruta of malas) expect(rutaSegura(base, ruta)).toBeNull()
  })
})

describe('limitador', () => {
  test('corta al superar el máximo y se recupera al pasar la ventana', () => {
    const limitador = new Limitador(3, 1000)
    expect([1, 2, 3, 4].map((i) => limitador.permite('ip', i))).toEqual([true, true, true, false])
    expect(limitador.permite('otra', 5)).toBe(true)
    expect(limitador.permite('ip', 900)).toBe(false)
    expect(limitador.permite('ip', 1002)).toBe(true)
  })
})

describe('fechas e imágenes', () => {
  test('parseFecha solo acepta días reales', () => {
    expect(parseFecha('2026-02-28')).toBe('2026-02-28')
    expect(parseFecha('2026-02-28T10:00:00')).toBe('2026-02-28')
    expect(parseFecha('2026-02-30')).toBeNull()
    expect(parseFecha('28/02/2026')).toBeNull()
    expect(sumarDias('2026-12-31', 1)).toBe('2027-01-01')
    expect(selloArchivo(new Date(2026, 0, 5, 9, 7, 3))).toBe('20260105_090703')
  })

  test('extensionImagen mira los bytes, no el nombre', () => {
    expect(extensionImagen(Uint8Array.of(0xff, 0xd8, 0xff, 0xe0))).toBe('.jpg')
    expect(extensionImagen(Uint8Array.of(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a))).toBe('.png')
    expect(extensionImagen(new TextEncoder().encode('RIFF1234WEBPVP8 '))).toBe('.webp')
    expect(extensionImagen(new TextEncoder().encode('<svg onload="x">'))).toBeNull()
    expect(extensionImagen(new Uint8Array())).toBeNull()
  })

  test('la contraseña exige 8 caracteres', () => {
    expect(() => validarPassword('1234567')).toThrow(ErrorHttp)
    expect(() => validarPassword('12345678')).not.toThrow()
  })
})

describe('detalle de la auditoría', () => {
  test('diferencias lista solo los campos pedidos que cambian', () => {
    const antes = { nombre: 'Ana', peso: 70, telefono: null, id: 1 }
    const despues = { nombre: 'Ana', peso: 69.5, telefono: '600', id: 2 }
    expect(diferencias({ antes, despues, campos: ['nombre', 'peso', 'telefono'] })).toEqual([
      { campo: 'peso', antes: 70, despues: 69.5 },
      { campo: 'telefono', antes: null, despues: '600' },
    ])
    expect(diferencias({ antes, despues: antes, campos: ['nombre', 'peso', 'telefono', 'id'] })).toEqual([])
  })

  test('diferencias trata un campo ausente como nulo y no confunde 0 con vacío', () => {
    expect(diferencias({ antes: {}, despues: { notas: null }, campos: ['notas'] })).toEqual([])
    expect(diferencias({ antes: {}, despues: { activo: 0 }, campos: ['activo'] })).toEqual([
      { campo: 'activo', antes: null, despues: 0 },
    ])
    expect(diferencias({ antes: { notas: '' }, despues: { notas: null }, campos: ['notas'] })).toEqual([
      { campo: 'notas', antes: '', despues: null },
    ])
  })

  test('leerDetalle devuelve null si el texto no es un objeto JSON', () => {
    expect(leerDetalle(null)).toBeNull()
    expect(leerDetalle('')).toBeNull()
    expect(leerDetalle('{mal')).toBeNull()
    expect(leerDetalle('[1, 2]')).toBeNull()
    expect(leerDetalle('"texto"')).toBeNull()
  })

  test('leerDetalle descarta lo que no tiene la forma esperada', () => {
    const texto = JSON.stringify({
      cambios: [
        { campo: 'peso', antes: 80, despues: 79 },
        { campo: 'sin-despues', antes: 1 },
        { campo: 7, antes: 1, despues: 2 },
        { campo: 'objeto', antes: {}, despues: 2 },
        'suelto',
      ],
      resumen: 12,
      registro_id: '5',
      extra: true,
    })
    expect(leerDetalle(texto)).toEqual({
      cambios: [{ campo: 'peso', antes: 80, despues: 79 }],
      resumen: null,
      registro_id: null,
    })
    expect(leerDetalle('{}')).toEqual({ cambios: [], resumen: null, registro_id: null })
    expect(leerDetalle('{"cambios":"no","resumen":"Foto","registro_id":3}')).toEqual({
      cambios: [],
      resumen: 'Foto',
      registro_id: 3,
    })
  })
})

describe('base de datos', () => {
  test('las migraciones embebidas coinciden con el diario de Drizzle', () => {
    const embebidas: string[] = MIGRACIONES.map((m) => m.tag)
    expect(embebidas).toEqual(diario.entries.map((e) => e.tag))
  })

  test('migrar es idempotente y las claves ajenas están activas', () => {
    const db = abrirBD(':memory:')
    const sqlite = db.$client
    expect(sqlite.query('PRAGMA foreign_keys').get()).toEqual({ foreign_keys: 1 })
    const sinCategoria = () => db.insert(stock_productos).values({ nombre: 'X', categoria_id: 99 }).run()
    expect(sinCategoria).toThrow()
  })

  test('la traza por cliente se aplica sobre una base anterior con datos', async () => {
    const carpetaBD = await mkdtemp(join(tmpdir(), 'nutriclinica-migracion-'))
    const ruta = join(carpetaBD, 'previa.db')
    const previa = new Database(ruta, { create: true, strict: true })
    for (const sentencia of (MIGRACIONES[0]?.sql ?? '').split('--> statement-breakpoint')) {
      if (sentencia.trim() !== '') previa.run(sentencia)
    }
    previa.run('CREATE TABLE __migraciones (tag TEXT PRIMARY KEY, aplicada TEXT NOT NULL)')
    previa.run("INSERT INTO __migraciones (tag, aplicada) VALUES ('0000_inicial', '2026-01-01 00:00:00')")
    previa.run("INSERT INTO pacientes (id, nombre, creado) VALUES (1, 'Ana', '2026-01-10 09:00:00')")
    // El id 7 lo ocupó antes otra persona, ya borrada: sus entradas no son de quien lo tiene hoy.
    previa.run("INSERT INTO pacientes (id, nombre, creado) VALUES (7, 'Reusado', '2026-03-01 09:00:00')")
    const entradas = [
      { fecha: '2026-01-10 09:00:01', metodo: 'POST', ruta: '/api/pacientes', estado: 201, esperado: null },
      { fecha: '2026-01-11 10:00:00', metodo: 'PUT', ruta: '/api/pacientes/1', estado: 200, esperado: 1 },
      { fecha: '2026-01-12 10:00:00', metodo: 'POST', ruta: '/api/pacientes/1/revisiones', estado: 201, esperado: 1 },
      { fecha: '2026-01-13 10:00:00', metodo: 'PUT', ruta: '/api/pacientes/1', estado: 400, esperado: null },
      { fecha: '2026-02-01 10:00:00', metodo: 'PUT', ruta: '/api/pacientes/7', estado: 200, esperado: null },
      { fecha: '2026-02-02 10:00:00', metodo: 'DELETE', ruta: '/api/pacientes/7', estado: 200, esperado: null },
      { fecha: '2026-03-02 10:00:00', metodo: 'POST', ruta: '/api/pacientes/7/fotos', estado: 201, esperado: 7 },
      { fecha: '2026-03-03 10:00:00', metodo: 'DELETE', ruta: '/api/pacientes/99', estado: 200, esperado: null },
      { fecha: '2026-03-04 10:00:00', metodo: 'PUT', ruta: '/api/revisiones/1', estado: 200, esperado: null },
      { fecha: '2026-03-05 10:00:00', metodo: 'GET', ruta: '/api/exportar/pacientes', estado: 200, esperado: null },
    ]
    for (const e of entradas) {
      previa.run("INSERT INTO audit_log (fecha, usuario, metodo, ruta, estado) VALUES (?, 'admin', ?, ?, ?)", [
        e.fecha,
        e.metodo,
        e.ruta,
        e.estado,
      ])
    }
    previa.close()

    const sqlite = abrirBD(ruta).$client
    const filas = sqlite
      .query<{ paciente_id: number | null; detalle: string | null }, []>(
        'SELECT paciente_id, detalle FROM audit_log ORDER BY id',
      )
      .all()
    expect(filas.map((f) => f.paciente_id)).toEqual(entradas.map((e) => e.esperado))
    expect(filas.every((f) => f.detalle === null)).toBe(true)
    const aplicadas = sqlite.query<{ tag: string }, []>('SELECT tag FROM __migraciones ORDER BY tag').all()
    expect(aplicadas.map((m) => m.tag)).toEqual(MIGRACIONES.map((m) => m.tag))
    sqlite.close()
    // Abrirla otra vez no repite la migración.
    abrirBD(ruta).$client.close()
    await rm(carpetaBD, { recursive: true, force: true })
  })

  test('la semilla crea usuarios y stock una sola vez', async () => {
    const db = abrirBD(':memory:')
    await sembrarUsuarios(db)
    await sembrarUsuarios(db)
    expect(
      db
        .select()
        .from(usuarios)
        .all()
        .map((u) => `${u.usuario}:${u.rol}`),
    ).toEqual(['admin:admin', 'Jose:user'])
    expect(await usuariosConPasswordInicial(db)).toEqual(['admin', 'Jose'])

    sembrarStock(db)
    sembrarStock(db)
    const almacen = listarAlmacen(db)
    expect(almacen).toHaveLength(20)
    // 10 compradas, 3 vendidas en dos tickets.
    expect(almacen.find((p) => p.nombre === 'Whey Protein Concentrada 1 kg')?.stock_actual).toBe(7)
    // 48 compradas, 6 vendidas y 3 caducadas.
    expect(almacen.find((p) => p.nombre === 'Barrita Proteica Chocolate')?.stock_actual).toBe(39)
    expect(almacen.every((p) => p.stock_actual >= 0)).toBe(true)
    const totales = listarCompras(db)
      .map((c) => c.total)
      .toSorted((a, b) => a - b)
    expect(totales).toEqual([251, 299.4, 303.6, 347, 392.8])
  })

  test('las sesiones caducan y se pueden cerrar', () => {
    const db = abrirBD(':memory:')
    const { id } = db
      .insert(usuarios)
      .values({ usuario: 'ana', rol: 'user', password_hash: 'x' })
      .returning({ id: usuarios.id })
      .get()
    const ahora = new Date(2026, 0, 1, 10).getTime()
    const token = abrirSesion(db, id, ahora)
    expect(token).toMatch(/^[0-9a-f]{64}$/)
    expect(usuarioDeSesion(db, token, ahora)?.usuario).toBe('ana')
    expect(usuarioDeSesion(db, 'otro-token', ahora)).toBeNull()
    expect(usuarioDeSesion(db, token, ahora + 13 * 60 * 60 * 1000)).toBeNull()
    cerrarSesion(db, token)
    expect(usuarioDeSesion(db, token, ahora)).toBeNull()
  })
})
