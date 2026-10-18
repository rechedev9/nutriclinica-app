import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { fechaLocal } from '../src/lib/fechas'
import { clienteAdmin, crearCliente, crearEntorno, mensajeDe } from './apoyo'
import type { Cliente, Entorno } from './apoyo'

let entorno: Entorno
let api: Cliente
const hoy = fechaLocal(new Date())
const MARZO = { desde: '2026-03-01', hasta: '2026-03-31' }

async function vender(cuerpo: Parameters<typeof api.ventas.post>[0]): Promise<number> {
  const respuesta = await api.ventas.post(cuerpo)
  if (respuesta.data === null) throw new Error(`venta rechazada: ${JSON.stringify(mensajeDe(respuesta))}`)
  return respuesta.data.id
}

async function lineaDe(ventaId: number): Promise<number> {
  return (await api.ventas({ id: ventaId }).get()).data?.lineas[0]?.id ?? 0
}

async function devolver(opciones: { ventaId: number; cantidad: number }) {
  await api.ventas({ id: opciones.ventaId }).devoluciones.post({
    motivo: 'No le gusta',
    metodo_reembolso: 'efectivo',
    lineas: [{ venta_linea_id: await lineaDe(opciones.ventaId), cantidad: opciones.cantidad, reingresa: true }],
  })
}

async function estadisticas(periodo: { desde: string; hasta: string }) {
  const { data } = await api.ventas.estadisticas.get({ query: periodo })
  if (data === null) throw new Error('sin estadísticas')
  return data
}

// Hoy: una venta con descuentos y cliente, una anulada, una devuelta en parte y otra devuelta entera.
// Marzo: una venta antigua (sin hora de cobro) con una devolución hecha hoy.
beforeAll(async () => {
  entorno = await crearEntorno()
  api = (await clienteAdmin(entorno.app)).api
  const categoria = (await api.stock.categorias.post({ nombre: 'Proteínas' })).data?.id ?? 0
  const whey =
    (await api.stock.productos.post({ nombre: 'Whey', precio_coste: 18, precio_venta: 30, categoria_id: categoria }))
      .data?.id ?? 0
  // Sin coste en la ficha: vale el precio de su última compra.
  const barrita =
    (await api.stock.productos.post({ nombre: 'Barrita', precio_coste: 0, precio_venta: 2.5 })).data?.id ?? 0
  await api.stock.compras.post({
    fecha: '2026-01-10',
    lineas: [{ producto_id: whey, cantidad: 10, precio_unitario: 17 }],
  })
  await api.stock.compras.post({
    fecha: '2026-01-10',
    lineas: [{ producto_id: barrita, cantidad: 10, precio_unitario: 0.8 }],
  })
  await api.stock.compras.post({
    fecha: '2026-02-10',
    lineas: [{ producto_id: barrita, cantidad: 10, precio_unitario: 1 }],
  })
  const lucia = (await api.pacientes.post({ nombre: 'Lucía Pardo' })).data?.id ?? 0

  await vender({
    paciente_id: lucia,
    lineas: [
      { producto_id: whey, cantidad: 2, precio_unitario: 30, descuento: 6 },
      { producto_id: barrita, cantidad: 4, precio_unitario: 2.5 },
    ],
    descuento_total: 6.4,
    pagos: [
      { metodo: 'tarjeta', importe: 50 },
      { metodo: 'efectivo', importe: 7.6 },
    ],
  })
  const anulada = await vender({
    lineas: [{ producto_id: whey, cantidad: 1, precio_unitario: 30 }],
    pagos: [{ metodo: 'efectivo', importe: 30 }],
  })
  await api.ventas({ id: anulada }).anular.post({ motivo: 'Cobro duplicado' })
  const parcial = await vender({
    paciente_id: lucia,
    lineas: [{ producto_id: barrita, cantidad: 3, precio_unitario: 2.5 }],
    pagos: [{ metodo: 'bizum', importe: 7.5 }],
  })
  await devolver({ ventaId: parcial, cantidad: 1 })
  const entera = await vender({
    lineas: [{ producto_id: barrita, cantidad: 2, precio_unitario: 2.5 }],
    pagos: [{ metodo: 'efectivo', importe: 5 }],
  })
  await devolver({ ventaId: entera, cantidad: 2 })

  const antigua = await vender({
    fecha: '2026-03-03',
    lineas: [{ producto_id: barrita, cantidad: 4, precio_unitario: 2.5 }],
    pagos: [{ metodo: 'tarjeta', importe: 10 }],
  })
  await devolver({ ventaId: antigua, cantidad: 1 })
})
afterAll(() => entorno.limpiar())

describe('estadísticas de ventas', () => {
  test('resumen sin anuladas, descontando lo devuelto y con el margen sobre el coste', async () => {
    const e = await estadisticas({ desde: hoy, hasta: hoy })
    expect(e.resumen).toEqual({
      neto: 62.6,
      tickets: 2,
      ticket_medio: 31.3,
      unidades: 8,
      // Whey 48,60 - 2 × 18; Barrita (9 + 5) - 6 × 1.
      margen: 20.6,
      ingresos_con_coste: 62.6,
      lineas_sin_coste: 0,
      vendido: 70.1,
      devuelto: 7.5,
      num_devoluciones: 2,
      bruto: 75,
      descuentos: 12.4,
      num_anuladas: 1,
      importe_anuladas: 30,
    })
    expect(e.por_dia).toEqual([{ fecha: hoy, neto: 62.6, tickets: 2 }])
    expect(e.por_hora).toEqual([{ hora: expect.any(Number), neto: 62.6, tickets: 2 }])
    expect(e.sin_hora).toBe(0)
  })

  test('cobros por método, productos y clientes', async () => {
    const e = await estadisticas({ desde: hoy, hasta: hoy })
    expect(e.metodos).toEqual({ efectivo: 12.6, tarjeta: 50, bizum: 7.5, sin_indicar: 0 })
    expect(e.productos).toEqual([
      {
        producto_id: expect.any(Number),
        nombre: 'Whey',
        categoria: 'Proteínas',
        unidades: 2,
        neto: 48.6,
        margen: 12.6,
      },
      { producto_id: expect.any(Number), nombre: 'Barrita', categoria: null, unidades: 6, neto: 14, margen: 8 },
    ])
    expect(e.clientes.con_cliente).toEqual({ neto: 62.6, tickets: 2 })
    expect(e.clientes.anonimas).toEqual({ neto: 0, tickets: 0 })
    expect(e.clientes.mejores).toEqual([
      { paciente_id: expect.any(Number), nombre: 'Lucía Pardo', ultima: hoy, neto: 62.6, tickets: 2 },
    ])
  })

  test('una devolución de hoy rebaja la venta original de marzo', async () => {
    const e = await estadisticas(MARZO)
    expect(e.resumen).toMatchObject({ neto: 7.5, tickets: 1, unidades: 3, vendido: 10, devuelto: 2.5 })
    expect(e.por_dia).toEqual([{ fecha: '2026-03-03', neto: 7.5, tickets: 1 }])
    // Registrada hoy con fecha de marzo: la hora de cobro no es la de la venta.
    expect(e.por_hora).toEqual([])
    expect(e.sin_hora).toBe(1)
    expect(e.clientes.anonimas).toEqual({ neto: 7.5, tickets: 1 })
  })

  test('periodo sin ventas', async () => {
    const e = await estadisticas({ desde: '2025-01-01', hasta: '2025-01-31' })
    expect(e.resumen).toMatchObject({ neto: 0, tickets: 0, ticket_medio: 0, margen: 0 })
    expect(e.productos).toEqual([])
    expect(e.clientes.mejores).toEqual([])
  })

  test('valida el periodo y exige sesión', async () => {
    const casos: [{ desde?: string; hasta?: string }, string][] = [
      [{ hasta: hoy }, 'La fecha de inicio no es válida'],
      [{ desde: hoy, hasta: '2026-02-30' }, 'La fecha de fin no es válida'],
      [{ desde: '2026-03-10', hasta: '2026-03-01' }, 'La fecha de inicio no puede ser posterior a la de fin'],
    ]
    for (const [query, error] of casos) {
      const respuesta = await api.ventas.estadisticas.get({ query })
      expect(respuesta.status).toBe(400)
      expect(mensajeDe(respuesta)).toEqual({ error })
    }
    const anonimo = crearCliente(entorno.app)
    expect((await anonimo.ventas.estadisticas.get({ query: MARZO })).status).toBe(401)
  })
})
