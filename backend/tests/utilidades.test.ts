import { describe, expect, test } from 'bun:test'
import { resolve } from 'node:path'
import diario from '../drizzle/meta/_journal.json'
import { abrirBD } from '../src/db/cliente'
import { stock_productos, usuarios } from '../src/db/esquema'
import { MIGRACIONES } from '../src/db/migraciones'
import { sembrarStock, sembrarUsuarios, usuariosConPasswordInicial } from '../src/db/semilla'
import { listarAlmacen, listarCompras } from '../src/datos/stock'
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

  test('la semilla crea usuarios y stock una sola vez', async () => {
    const db = abrirBD(':memory:')
    await sembrarUsuarios(db)
    await sembrarUsuarios(db)
    expect(db.select().from(usuarios).all().map((u) => `${u.usuario}:${u.rol}`)).toEqual(['admin:admin', 'Jose:user'])
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
      .sort((a, b) => a - b)
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
