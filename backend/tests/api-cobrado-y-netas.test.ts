import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { fechaLocal, sumarDias } from '../src/lib/fechas'
import { clienteAdmin, crearEntorno, mensajeDe } from './apoyo'
import type { Cliente, Entorno } from './apoyo'

// Inicio cuenta lo cobrado en caja (la devolución resta el día en que se hace) y Estadísticas
// las ventas netas (la devolución resta de la venta original). Las dos reglas conviven a propósito.

let entorno: Entorno
let api: Cliente
const hoy = fechaLocal(new Date())
const diaVenta = sumarDias(hoy, -10)

async function vender(opciones: { fecha: string; productoId: number; cantidad: number; precio: number }) {
  const importe = opciones.cantidad * opciones.precio
  const respuesta = await api.ventas.post({
    fecha: opciones.fecha,
    lineas: [{ producto_id: opciones.productoId, cantidad: opciones.cantidad, precio_unitario: opciones.precio }],
    pagos: [{ metodo: 'tarjeta', importe }],
  })
  if (respuesta.data === null) throw new Error(`venta rechazada: ${JSON.stringify(mensajeDe(respuesta))}`)
  return respuesta.data.id
}

async function inicio() {
  const { data } = await api.inicio.resumen.get()
  if (data === null) throw new Error('sin resumen')
  return data
}

async function caja(fecha: string) {
  const { data } = await api.caja.dia({ fecha }).get()
  if (data === null) throw new Error(`sin caja del ${fecha}`)
  return data
}

async function netas(periodo: { desde: string; hasta: string }) {
  const { data } = await api.ventas.estadisticas.get({ query: periodo })
  if (data === null) throw new Error('sin estadísticas')
  return data.resumen.neto
}

// Hace diez días se venden 2 x 20 €; hoy, 1 x 15 € y se devuelve una unidad de la venta antigua.
beforeAll(async () => {
  entorno = await crearEntorno()
  api = (await clienteAdmin(entorno.app)).api
  const producto = (await api.stock.productos.post({ nombre: 'Creatina', precio_coste: 5, precio_venta: 20 })).data
  if (producto === null) throw new Error('sin producto')
  await api.stock.compras.post({
    fecha: sumarDias(hoy, -30),
    lineas: [{ producto_id: producto.id, cantidad: 10, precio_unitario: 5 }],
  })
  const antigua = await vender({ fecha: diaVenta, productoId: producto.id, cantidad: 2, precio: 20 })
  await vender({ fecha: hoy, productoId: producto.id, cantidad: 1, precio: 15 })
  const linea = (await api.ventas({ id: antigua }).get()).data?.lineas[0]?.id ?? 0
  const devolucion = await api.ventas({ id: antigua }).devoluciones.post({
    motivo: 'No la quiere',
    metodo_reembolso: 'efectivo',
    lineas: [{ venta_linea_id: linea, cantidad: 1, reingresa: true }],
  })
  if (devolucion.data === null) throw new Error(`devolución rechazada: ${JSON.stringify(mensajeDe(devolucion))}`)
})
afterAll(() => entorno.limpiar())

describe('Cobrado en caja (Inicio) frente a ventas netas (Estadísticas)', () => {
  test('Inicio resta la devolución el día en que se hace, como el cierre de caja', async () => {
    const dias = (await inicio()).dias
    expect(dias).toEqual([
      { fecha: diaVenta, num_ventas: 1, ventas: 40, devoluciones: 0 },
      { fecha: hoy, num_ventas: 1, ventas: 15, devoluciones: 20 },
    ])
    for (const d of dias) {
      const c = await caja(d.fecha)
      expect({ ventas: c.total_ventas, devoluciones: c.total_devoluciones }).toEqual({
        ventas: d.ventas,
        devoluciones: d.devoluciones,
      })
    }
    expect((await caja(hoy)).total_neto).toBe(-5)
  })

  test('Estadísticas resta la devolución de la venta original', async () => {
    expect(await netas({ desde: hoy, hasta: hoy })).toBe(15)
    expect(await netas({ desde: diaVenta, hasta: diaVenta })).toBe(20)
  })

  test('si el periodo incluye la venta y su devolución, las dos cifras coinciden', async () => {
    const cobrado = (await inicio()).dias.reduce((suma, d) => suma + d.ventas - d.devoluciones, 0)
    expect(cobrado).toBe(35)
    expect(await netas({ desde: diaVenta, hasta: hoy })).toBe(35)
  })
})
