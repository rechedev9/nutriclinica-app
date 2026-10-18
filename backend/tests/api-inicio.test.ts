import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { inicioDelPulso } from '../src/datos/inicio'
import { fechaLocal, sumarDias } from '../src/lib/fechas'
import { clienteAdmin, crearCliente, crearEntorno, mensajeDe } from './apoyo'
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

async function producto(nombre: string, precio: number): Promise<number> {
  const { data } = await api.stock.productos.post({ nombre, precio_coste: 1, precio_venta: precio })
  if (data === null) throw new Error(`no se pudo crear ${nombre}`)
  await api.stock.compras.post({
    fecha: haceDias(200),
    lineas: [{ producto_id: data.id, cantidad: 100, precio_unitario: 1 }],
  })
  return data.id
}

async function cliente(nombre: string): Promise<number> {
  const { data } = await api.pacientes.post({ nombre })
  if (data === null) throw new Error(`no se pudo crear ${nombre}`)
  return data.id
}

async function vender(opciones: { fecha: string; productoId: number; precio: number; pacienteId?: number }) {
  const respuesta = await api.ventas.post({
    fecha: opciones.fecha,
    paciente_id: opciones.pacienteId ?? null,
    lineas: [{ producto_id: opciones.productoId, cantidad: 1, precio_unitario: opciones.precio }],
    pagos: [{ metodo: 'tarjeta', importe: opciones.precio }],
  })
  if (respuesta.data === null) throw new Error(`venta rechazada: ${JSON.stringify(mensajeDe(respuesta))}`)
  return respuesta.data.id
}

async function resumen() {
  const { data } = await api.inicio.resumen.get()
  if (data === null) throw new Error('sin resumen')
  return data
}

describe('inicioDelPulso', () => {
  test('el día 1 del mes pasado, que es anterior al lunes de la semana pasada', () => {
    expect(inicioDelPulso('2026-10-18')).toBe('2026-09-01')
    expect(inicioDelPulso('2026-03-02')).toBe('2026-02-01')
    expect(inicioDelPulso('2027-01-04')).toBe('2026-12-01')
  })
})

describe('GET /api/inicio/resumen', () => {
  test('exige sesión', async () => {
    const anonimo = crearCliente(entorno.app)
    expect((await anonimo.inicio.resumen.get()).status).toBe(401)
  })

  test('sin datos', async () => {
    const r = await resumen()
    expect(r.hoy).toBe(hoy)
    expect(r.dias).toEqual([])
    expect(r.caja).toEqual({ cerrada_hoy: false, sin_cerrar: [] })
    expect(r.ultimas_compras).toEqual([])
    expect(r.habitos).toEqual([])
  })

  test('ventas por día, compras por cliente, hábitos y caja', async () => {
    const proteina = await producto('Proteína', 49.9)
    const barrita = await producto('Barrita', 2.5)
    const maria = await cliente('María')
    const pedro = await cliente('Pedro')

    // María compra proteína cada 30 días; Pedro solo una vez y la devuelve.
    for (const dias of [60, 30]) {
      await vender({ fecha: haceDias(dias), productoId: proteina, precio: 49.9, pacienteId: maria })
    }
    await vender({ fecha: haceDias(3), productoId: barrita, precio: 2.5 })
    await vender({ fecha: haceDias(2), productoId: barrita, precio: 2.5 })
    const devuelta = await vender({ fecha: haceDias(2), productoId: proteina, precio: 49.9, pacienteId: pedro })
    await vender({ fecha: haceDias(1), productoId: barrita, precio: 2.5, pacienteId: pedro })
    await vender({ fecha: haceDias(1), productoId: proteina, precio: 49.9, pacienteId: pedro })
    const anulada = await vender({ fecha: hoy, productoId: barrita, precio: 2.5 })
    await vender({ fecha: hoy, productoId: barrita, precio: 2.5 })
    await api.ventas({ id: anulada }).anular.post({ motivo: 'Error' })
    const venta = (await api.ventas({ id: devuelta }).get()).data
    const linea = venta?.lineas[0]?.id ?? 0
    await api.ventas({ id: devuelta }).devoluciones.post({
      motivo: 'No le sentó bien',
      metodo_reembolso: 'tarjeta',
      lineas: [{ venta_linea_id: linea, cantidad: 1, reingresa: false }],
    })

    const r = await resumen()
    const enRango = r.dias.filter((d) => d.fecha >= haceDias(3))
    // La devolución cuenta hoy (el día en que se hace) y la venta anulada no cuenta.
    expect(enRango).toEqual([
      { fecha: haceDias(3), num_ventas: 1, ventas: 2.5, devoluciones: 0 },
      { fecha: haceDias(2), num_ventas: 2, ventas: 52.4, devoluciones: 0 },
      { fecha: haceDias(1), num_ventas: 2, ventas: 52.4, devoluciones: 0 },
      { fecha: hoy, num_ventas: 1, ventas: 2.5, devoluciones: 49.9 },
    ])

    expect(r.ultimas_compras.toSorted((a, b) => a.paciente_id - b.paciente_id)).toEqual([
      { paciente_id: maria, fecha: haceDias(30) },
      { paciente_id: pedro, fecha: haceDias(1) },
    ])
    expect(r.ultimas_ventas_producto).toContainEqual({ producto_id: barrita, fecha: hoy })

    // Pedro compró proteína dos días, pero devolvió una: no hay hábito.
    expect(r.habitos).toEqual([
      {
        paciente_id: maria,
        paciente_nombre: 'María',
        producto_id: proteina,
        producto_nombre: 'Proteína',
        fechas: [haceDias(60), haceDias(30)],
      },
    ])

    // Sin cierres no se avisa; tras cerrar un día, los posteriores con movimiento quedan pendientes.
    expect(r.caja.sin_cerrar).toEqual([])
    const cierre = await api.caja.cierres.post({ fecha: haceDias(3), efectivo_contado: 0 })
    expect(cierre.status).toBe(201)
    expect((await resumen()).caja.sin_cerrar).toEqual([haceDias(1), haceDias(2)])

    await api.caja.cierres.post({ fecha: hoy, efectivo_contado: 0 })
    expect((await resumen()).caja.cerrada_hoy).toBe(true)
  })
})
