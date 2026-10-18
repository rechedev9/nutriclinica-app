import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { eq } from 'drizzle-orm'
import { audit_log, stock_recuentos } from '../src/db/esquema'
import { fechaLocal } from '../src/lib/fechas'
import { clienteAdmin, clienteUsuario, crearCliente, crearEntorno, mensajeDe } from './apoyo'
import type { Cliente, Entorno } from './apoyo'

let entorno: Entorno
let api: Cliente
let ana: Cliente
beforeAll(async () => {
  entorno = await crearEntorno()
  api = (await clienteAdmin(entorno.app)).api
  ana = (await clienteUsuario(entorno.app)).api
})
afterAll(() => entorno.limpiar())

const hoy = () => fechaLocal(new Date())

async function nuevoProducto(nombre: string, stock_minimo = 0): Promise<number> {
  const { data } = await api.stock.productos.post({ nombre, precio_coste: 2, precio_venta: 5, stock_minimo })
  if (data === null) throw new Error(`no se pudo crear ${nombre}`)
  return data.id
}

async function comprar(opciones: { producto_id: number; cantidad: number; fecha?: string }): Promise<number> {
  const { producto_id, cantidad, fecha } = opciones
  const { data } = await api.stock.compras.post({ fecha, lineas: [{ producto_id, cantidad, precio_unitario: 2 }] })
  if (data === null) throw new Error('no se pudo crear la compra')
  return data.id
}

async function stockDe(id: number): Promise<number | undefined> {
  const almacen = (await api.stock.almacen.get()).data ?? []
  return almacen.find((p) => p.id === id)?.stock_actual
}

async function vender(opciones: { producto_id: number; cantidad: number; fecha?: string }): Promise<number> {
  const { producto_id, cantidad, fecha } = opciones
  const respuesta = await api.ventas.post({
    fecha,
    lineas: [{ producto_id, cantidad, precio_unitario: 5 }],
    pagos: [{ metodo: 'tarjeta', importe: cantidad * 5 }],
  })
  if (respuesta.data === null) throw new Error(`venta rechazada: ${JSON.stringify(mensajeDe(respuesta))}`)
  return respuesta.data.id
}

async function movimientos(id: number) {
  const { data } = await api.stock.productos({ id }).movimientos.get()
  if (data === null) throw new Error(`sin movimientos de ${id}`)
  return data
}

describe('recuento de inventario', () => {
  test('valida motivo, líneas y productos', async () => {
    const id = await nuevoProducto('Cafeína')
    const casos: [Parameters<typeof api.stock.recuentos.post>[0], string][] = [
      [{ motivo: 'Mensual', lineas: [] }, 'El recuento debe tener al menos un producto'],
      [{ motivo: '  ', lineas: [{ producto_id: id, contado: 1 }] }, 'Indica el motivo del recuento'],
      [{ motivo: 'Mensual', lineas: [{ producto_id: id }] }, 'Indica las unidades contadas'],
      [
        { motivo: 'Mensual', lineas: [{ producto_id: id, contado: -1 }] },
        'Las unidades contadas no pueden ser negativas',
      ],
      [{ motivo: 'Mensual', lineas: [{ contado: 1 }] }, 'El producto es obligatorio'],
      [
        {
          motivo: 'Mensual',
          lineas: [
            { producto_id: id, contado: 1 },
            { producto_id: id, contado: 2 },
          ],
        },
        'Un producto aparece dos veces en el recuento',
      ],
      [{ motivo: 'Mensual', lineas: [{ producto_id: 9999, contado: 1 }] }, 'El producto no existe o está dado de baja'],
    ]
    for (const [cuerpo, error] of casos) {
      const respuesta = await api.stock.recuentos.post(cuerpo)
      expect(respuesta.status).toBe(400)
      expect(mensajeDe(respuesta)).toEqual({ error })
    }
    expect((await crearCliente(entorno.app).stock.recuentos.post({ motivo: 'x', lineas: [] })).status).toBe(401)
  })

  test('registra la diferencia como ajuste y el stock pasa a ser lo contado', async () => {
    const id = await nuevoProducto('Whey chocolate')
    await comprar({ producto_id: id, cantidad: 10 })
    await api.stock.mermas.post({ producto_id: id, cantidad: 1, motivo: 'caducidad' })
    expect(await stockDe(id)).toBe(9)

    const faltan = await ana.stock.recuentos.post({
      motivo: 'Recuento mensual',
      lineas: [{ producto_id: id, contado: 7 }],
    })
    expect(faltan.status).toBe(201)
    expect(faltan.data?.lineas).toEqual([{ producto_id: id, esperado: 9, contado: 7, diferencia: -2 }])
    expect(await stockDe(id)).toBe(7)

    const cuadra = await api.stock.recuentos.post({ motivo: 'Comprobación', lineas: [{ producto_id: id, contado: 7 }] })
    expect(cuadra.data?.lineas[0]?.diferencia).toBe(0)
    const sobran = await api.stock.recuentos.post({
      motivo: 'Apareció una caja',
      lineas: [{ producto_id: id, contado: 7.5 }],
    })
    expect(sobran.data?.lineas[0]?.diferencia).toBe(0.5)
    expect(await stockDe(id)).toBe(7.5)

    const lista = (await api.stock.recuentos.get()).data ?? []
    const [ultimo, , primero] = lista.filter((r) => r.lineas.some((l) => l.producto_id === id))
    expect(ultimo).toMatchObject({ motivo: 'Apareció una caja', usuario: 'admin', fecha: hoy() })
    expect(primero).toMatchObject({ motivo: 'Recuento mensual', usuario: 'ana' })
    expect(primero?.lineas).toEqual([
      expect.objectContaining({ producto_nombre: 'Whey chocolate', esperado: 9, contado: 7, diferencia: -2 }),
    ])
  })

  test('varios productos a la vez, y si uno falla no se guarda ninguno', async () => {
    const a = await nuevoProducto('Barritas')
    const b = await nuevoProducto('Shaker')
    const deBaja = await nuevoProducto('Producto retirado')
    await comprar({ producto_id: a, cantidad: 12 })
    await api.stock.productos({ id: deBaja }).delete()

    const antes = entorno.db.select().from(stock_recuentos).all().length
    const fallido = await api.stock.recuentos.post({
      motivo: 'Inventario',
      lineas: [
        { producto_id: a, contado: 10 },
        { producto_id: deBaja, contado: 1 },
      ],
    })
    expect(fallido.status).toBe(400)
    expect(entorno.db.select().from(stock_recuentos).all().length).toBe(antes)
    expect(await stockDe(a)).toBe(12)

    const bien = await api.stock.recuentos.post({
      motivo: 'Inventario',
      notas: 'Fin de trimestre',
      lineas: [
        { producto_id: a, contado: 10 },
        { producto_id: b, contado: 3 },
      ],
    })
    expect(bien.data?.lineas.map((l) => l.diferencia)).toEqual([-2, 3])
    expect([await stockDe(a), await stockDe(b)]).toEqual([10, 3])
  })

  test('el ajuste cuenta en las reglas de stock', async () => {
    const id = await nuevoProducto('Creatina', 2)
    const compraId = await comprar({ producto_id: id, cantidad: 5 })
    await api.stock.recuentos.post({ motivo: 'Rotura sin registrar', lineas: [{ producto_id: id, contado: 2 }] })

    const venta = await api.ventas.post({
      lineas: [{ producto_id: id, cantidad: 3, precio_unitario: 5 }],
      pagos: [{ metodo: 'tarjeta', importe: 15 }],
    })
    expect(venta.status).toBe(409)
    expect(mensajeDe(venta)).toEqual({ error: 'Stock insuficiente de «Creatina»: quedan 2' })
    expect((await api.stock.mermas.post({ producto_id: id, cantidad: 3, motivo: 'caducidad' })).status).toBe(409)
    // Las 5 compradas ya no están: borrar la compra dejaría el stock en -3.
    expect((await api.stock.compras({ id: compraId }).delete()).status).toBe(409)

    await api.stock.recuentos.post({ motivo: 'Inventario', lineas: [{ producto_id: id, contado: 0 }] })
    const fila = ((await api.stock.almacen.get()).data ?? []).find((p) => p.id === id)
    expect(fila).toMatchObject({ stock_actual: 0, stock_minimo: 2 })
  })

  test('queda en la auditoría lo esperado y lo contado de cada producto con diferencia', async () => {
    const a = await nuevoProducto('Omega 3')
    const b = await nuevoProducto('Magnesio')
    await comprar({ producto_id: a, cantidad: 4 })
    await comprar({ producto_id: b, cantidad: 6 })
    const { data } = await api.stock.recuentos.post({
      motivo: 'Inventario anual',
      lineas: [
        { producto_id: a, contado: 3 },
        { producto_id: b, contado: 6 },
      ],
    })
    await Bun.sleep(20)
    const fila = entorno.db.select().from(audit_log).where(eq(audit_log.ruta, '/api/stock/recuentos')).all().at(-1)
    expect(fila).toMatchObject({ metodo: 'POST', estado: 201, usuario: 'admin', paciente_id: null })
    expect(JSON.parse(fila?.detalle ?? 'null')).toEqual({
      cambios: [{ campo: '«Omega 3»', antes: 4, despues: 3 }],
      resumen: 'Recuento de 2 producto(s), 1 con diferencia: Inventario anual',
      registro_id: data?.id ?? 0,
    })
  })
})

describe('movimientos de un producto', () => {
  test('lista entradas y salidas en orden con el saldo tras cada una', async () => {
    const id = await nuevoProducto('Proteína vainilla')
    await comprar({ producto_id: id, cantidad: 10, fecha: '2026-01-10T09:30' })
    const ventaAntigua = await vender({ producto_id: id, cantidad: 3, fecha: '2026-01-12' })
    await api.stock.mermas.post({ producto_id: id, cantidad: 1, motivo: 'accidente_rotura', fecha: '2026-01-15' })
    // Lo de hoy se registra en el orden en que se muestra si coincide el segundo.
    const ventaHoy = await vender({ producto_id: id, cantidad: 2 })
    await api.ventas({ id: ventaHoy }).anular.post({ motivo: 'Cobro duplicado' })
    const lineaId = (await api.ventas({ id: ventaAntigua }).get()).data?.lineas[0]?.id ?? 0
    await ana.ventas({ id: ventaAntigua }).devoluciones.post({
      motivo: 'No le gusta',
      metodo_reembolso: 'tarjeta',
      lineas: [{ venta_linea_id: lineaId, cantidad: 1, reingresa: true }],
    })
    await api.ventas({ id: ventaAntigua }).devoluciones.post({
      motivo: 'Bote abierto',
      metodo_reembolso: 'tarjeta',
      lineas: [{ venta_linea_id: lineaId, cantidad: 1, reingresa: false }],
    })
    await api.stock.recuentos.post({ motivo: 'Mensual', lineas: [{ producto_id: id, contado: 6 }] })

    const { producto, movimientos: lista } = await movimientos(id)
    expect(producto).toMatchObject({ id, nombre: 'Proteína vainilla', stock_actual: 6 })
    expect(lista.map((m) => [m.tipo, m.cantidad, m.saldo])).toEqual([
      ['compra', 10, 10],
      ['venta', -3, 7],
      ['merma', -1, 6],
      ['venta', -2, 4],
      ['anulacion', 2, 6],
      ['devolucion', 1, 7],
      ['devolucion', 0, 7],
      ['recuento', -1, 6],
    ])
    expect(lista.at(-1)?.saldo).toBe(producto.stock_actual)
    expect(lista[0]).toMatchObject({ fecha: '2026-01-10', momento: '2026-01-10 09:30:00', ticket: null })
    expect(lista[1]).toMatchObject({ fecha: '2026-01-12', ticket: `V-${String(ventaAntigua).padStart(6, '0')}` })
    // Registrada hoy con fecha de enero: la hora de registro no se muestra.
    expect(lista[2]).toMatchObject({ fecha: '2026-01-15', momento: null, detalle: 'accidente_rotura' })
    expect(lista[4]).toMatchObject({ detalle: 'Cobro duplicado', usuario: 'admin' })
    expect(lista[5]).toMatchObject({ fecha: hoy(), detalle: 'No le gusta', usuario: 'ana' })
    expect(lista[7]).toMatchObject({ detalle: 'Mensual', contado: 6, usuario: 'admin' })
  })

  test('producto sin movimientos, inexistente y sin sesión', async () => {
    const id = await nuevoProducto('Sin estrenar')
    expect(await movimientos(id)).toMatchObject({ producto: { stock_actual: 0 }, movimientos: [] })
    const inexistente = await api.stock.productos({ id: 9999 }).movimientos.get()
    expect(inexistente.status).toBe(404)
    expect(mensajeDe(inexistente)).toEqual({ error: 'Producto no encontrado' })
    expect((await crearCliente(entorno.app).stock.productos({ id }).movimientos.get()).status).toBe(401)
  })

  test('un producto dado de baja conserva sus movimientos', async () => {
    const id = await nuevoProducto('Descatalogado')
    await comprar({ producto_id: id, cantidad: 2 })
    await api.stock.productos({ id }).delete()
    const { producto, movimientos: lista } = await movimientos(id)
    expect(producto.activo).toBe(0)
    expect(lista).toHaveLength(1)
  })
})
