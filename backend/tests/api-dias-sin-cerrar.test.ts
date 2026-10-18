import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { stock_devoluciones, stock_ventas } from '../src/db/esquema'
import { fechaLocal, sumarDias } from '../src/lib/fechas'
import { clienteAdmin, crearEntorno, mensajeDe } from './apoyo'
import type { Cliente, Entorno } from './apoyo'

let entorno: Entorno
let api: Cliente
beforeAll(async () => {
  entorno = await crearEntorno()
  api = (await clienteAdmin(entorno.app)).api
})
afterAll(() => entorno.limpiar())

const hoy = fechaLocal(new Date())
const haceDias = (n: number) => sumarDias(hoy, -n)

async function producto(): Promise<number> {
  const { data } = await api.stock.productos.post({
    nombre: 'Barrita aviso',
    precio_coste: 1,
    precio_venta: 2.5,
  })
  if (data === null) throw new Error('no se pudo crear el producto')
  await api.stock.compras.post({
    fecha: haceDias(200),
    lineas: [{ producto_id: data.id, cantidad: 100, precio_unitario: 1 }],
  })
  return data.id
}

async function vender(fecha: string, productoId: number): Promise<number> {
  const respuesta = await api.ventas.post({
    fecha,
    paciente_id: null,
    lineas: [{ producto_id: productoId, cantidad: 1, precio_unitario: 2.5 }],
    pagos: [{ metodo: 'tarjeta', importe: 2.5 }],
  })
  if (respuesta.data === null) throw new Error(`venta rechazada: ${JSON.stringify(mensajeDe(respuesta))}`)
  return respuesta.data.id
}

async function lista() {
  const inicio = await api.inicio.resumen.get()
  const dia = await api.caja.dia({ fecha: hoy }).get()
  if (inicio.data === null || dia.data === null) throw new Error('sin resumen de caja')
  expect(dia.data.sin_cerrar).toEqual(inicio.data.caja.sin_cerrar)
  return inicio.data.caja
}

describe('días sin cerrar', () => {
  test('Inicio y el cierre cuentan la misma ventana', async () => {
    const id = await producto()
    await vender(haceDias(45), id)
    await vender(haceDias(31), id)
    await vender(haceDias(30), id)
    await vender(haceDias(20), id)
    await vender(haceDias(5), id)
    const deHoy = await vender(hoy, id)

    expect(await lista()).toEqual({ cerrada_hoy: false, sin_cerrar: [] })

    const primerCierre = await api.caja.cierres.post({ fecha: haceDias(10), efectivo_contado: 0 })
    expect(primerCierre.status).toBe(201)
    expect((await lista()).sin_cerrar).toEqual([haceDias(5)])

    const cierreAntiguo = await api.caja.cierres.post({ fecha: haceDias(40), efectivo_contado: 0 })
    expect(cierreAntiguo.status).toBe(201)
    expect((await lista()).sin_cerrar).toEqual([haceDias(5), haceDias(20), haceDias(30)])

    entorno.db
      .insert(stock_ventas)
      .values({ fecha: haceDias(4), total: 1, estado: 'anulada' })
      .run()
    entorno.db
      .insert(stock_devoluciones)
      .values({
        venta_id: deHoy,
        fecha: haceDias(2),
        motivo: 'Cambio',
        metodo_reembolso: 'efectivo',
        importe: 1,
      })
      .run()

    const caja = await lista()
    expect(caja.cerrada_hoy).toBe(false)
    expect(caja.sin_cerrar).toEqual([haceDias(2), haceDias(5), haceDias(20), haceDias(30)])
  })
})
