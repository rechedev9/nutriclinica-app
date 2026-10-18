import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { eq } from 'drizzle-orm'
import { stock_ventas_pagos } from '../src/db/esquema'
import { repartir } from '../src/lib/dinero'
import { fechaLocal, sumarDias } from '../src/lib/fechas'
import { clienteAdmin, clienteUsuario, crearEntorno, mensajeDe } from './apoyo'
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

async function productoConStock(opciones: { nombre: string; precio: number; unidades: number; iva?: number }) {
  const { data } = await api.stock.productos.post({
    nombre: opciones.nombre,
    precio_coste: 1,
    precio_venta: opciones.precio,
    iva: opciones.iva ?? 10,
  })
  if (data === null) throw new Error(`no se pudo crear ${opciones.nombre}`)
  await api.stock.compras.post({ lineas: [{ producto_id: data.id, cantidad: opciones.unidades, precio_unitario: 1 }] })
  return data.id
}

async function stockDe(id: number) {
  const almacen = (await api.stock.almacen.get()).data ?? []
  return almacen.find((p) => p.id === id)?.stock_actual
}

async function venta(id: number) {
  const { data } = await api.ventas({ id }).get()
  if (data === null) throw new Error(`no existe la venta ${id}`)
  return data
}

async function vender(cuerpo: Parameters<typeof api.ventas.post>[0]): Promise<number> {
  const respuesta = await api.ventas.post(cuerpo)
  if (respuesta.data === null) throw new Error(`venta rechazada: ${JSON.stringify(mensajeDe(respuesta))}`)
  return respuesta.data.id
}

// Con fondo de caja: si hoy se ha devuelto más efectivo del cobrado, el neto es negativo.
async function cerrar(fecha: string) {
  const resumen = (await api.caja.dia({ fecha }).get()).data
  return api.caja.cierres.post({ fecha, fondo_inicial: 100, efectivo_contado: 100 + (resumen?.neto.efectivo ?? 0) })
}

describe('reparto de céntimos', () => {
  test('el resto mayor reparte exacto y en proporción', () => {
    expect(repartir(100, [1, 1, 1])).toEqual([34, 33, 33])
    expect(repartir(500, [1000, 3000])).toEqual([125, 375])
    expect(repartir(7, [0, 0])).toEqual([0, 0])
  })
})

describe('cobro', () => {
  test('descuento por línea y al total, pago mixto y cambio', async () => {
    const whey = await productoConStock({ nombre: 'Whey 1 kg', precio: 30, unidades: 10, iva: 10 })
    const barrita = await productoConStock({ nombre: 'Barrita', precio: 2.5, unidades: 20, iva: 21 })
    const id = await vender({
      lineas: [
        { producto_id: whey, cantidad: 2, precio_unitario: 30, descuento: 6 },
        { producto_id: barrita, cantidad: 4, precio_unitario: 2.5 },
      ],
      descuento_total: 6.4,
      pagos: [
        { metodo: 'tarjeta', importe: 50 },
        { metodo: 'efectivo', importe: 7.6 },
      ],
      entregado: 10,
    })
    const v = await venta(id)
    // 54 + 10 = 64 brutos; 6,40 € se reparten 5,40 / 1,00.
    expect(v.total).toBe(57.6)
    expect(v.lineas.map((l) => [l.descuento, l.importe, l.iva])).toEqual([
      [11.4, 48.6, 10],
      [1, 9, 21],
    ])
    expect(v.pagos).toEqual([
      { metodo: 'efectivo', importe: 7.6 },
      { metodo: 'tarjeta', importe: 50 },
    ])
    expect(v).toMatchObject({ numero: `V-${String(id).padStart(6, '0')}`, entregado: 10, usuario: 'admin' })
    expect(v.situacion).toBe('completada')
    expect(await stockDe(whey)).toBe(8)
  })

  test('errores de cobro claros', async () => {
    const id = await productoConStock({ nombre: 'Creatina', precio: 20, unidades: 5 })
    const linea = { producto_id: id, cantidad: 1, precio_unitario: 20 }
    const casos: [Parameters<typeof api.ventas.post>[0], number, string][] = [
      [{ lineas: [linea] }, 400, 'Indica cómo ha pagado el cliente'],
      [
        { lineas: [linea], pagos: [{ metodo: 'tarjeta', importe: 15 }] },
        400,
        'Los pagos suman 15,00 € y el total es 20,00 €',
      ],
      [{ lineas: [linea], pagos: [{ metodo: 'cheque', importe: 20 }] }, 400, 'El método de pago no es válido'],
      [{ lineas: [linea], descuento_total: 25, pagos: [] }, 400, 'El descuento no puede superar el total de la venta'],
      [{ lineas: [{ ...linea, descuento: 21 }] }, 400, 'El descuento de una línea no puede superar su importe'],
      [
        { lineas: [linea], pagos: [{ metodo: 'efectivo', importe: 20 }], entregado: 10 },
        400,
        'El efectivo entregado no cubre el pago en efectivo',
      ],
      [
        { fecha: sumarDias(hoy(), 3), lineas: [linea], pagos: [{ metodo: 'efectivo', importe: 20 }] },
        400,
        'La fecha no puede ser futura',
      ],
      [
        { lineas: [{ ...linea, cantidad: 6 }], pagos: [{ metodo: 'bizum', importe: 120 }] },
        409,
        'Stock insuficiente de «Creatina»: quedan 5',
      ],
    ]
    for (const [cuerpo, estado, error] of casos) {
      const respuesta = await api.ventas.post(cuerpo)
      expect(respuesta.status).toBe(estado)
      expect(mensajeDe(respuesta)).toEqual({ error })
    }
    expect(await stockDe(id)).toBe(5)
  })

  test('el IVA del ticket es el del producto al vender, aunque cambie después', async () => {
    const id = await productoConStock({ nombre: 'Vitamina D', precio: 8, unidades: 3, iva: 10 })
    const ventaId = await vender({
      lineas: [{ producto_id: id, cantidad: 1, precio_unitario: 8 }],
      pagos: [{ metodo: 'bizum', importe: 8 }],
    })
    await api.stock.productos({ id }).put({ nombre: 'Vitamina D', precio_venta: 8, iva: 21 })
    expect((await venta(ventaId)).lineas[0]?.iva).toBe(10)
    expect(mensajeDe(await api.stock.productos({ id }).put({ nombre: 'Vitamina D', iva: 7 }))).toEqual({
      error: 'El IVA debe ser 0, 4, 10 o 21 %',
    })
  })

  test('el código de barras es único entre productos activos', async () => {
    const uno = await api.stock.productos.post({ nombre: 'Omega 3', codigo_barras: ' 8412345678905 ' })
    expect(uno.data?.codigo_barras).toBe('8412345678905')
    const dos = await api.stock.productos.post({ nombre: 'Omega 6', codigo_barras: '8412345678905' })
    expect(dos.status).toBe(409)
    expect(mensajeDe(dos)).toEqual({ error: 'El código de barras ya es de «Omega 3»' })
    await api.stock.productos({ id: uno.data?.id ?? 0 }).delete()
    expect((await api.stock.productos.post({ nombre: 'Omega 6', codigo_barras: '8412345678905' })).status).toBe(201)
  })
})

describe('anulación', () => {
  test('cualquier usuario anula una venta de hoy con motivo; repone el stock', async () => {
    const id = await productoConStock({ nombre: 'Glutamina', precio: 15, unidades: 4 })
    const ventaId = await vender({
      lineas: [{ producto_id: id, cantidad: 2, precio_unitario: 15 }],
      pagos: [{ metodo: 'tarjeta', importe: 30 }],
    })
    expect(await stockDe(id)).toBe(2)

    const sinMotivo = await ana.ventas({ id: ventaId }).anular.post({ motivo: '  ' })
    expect(mensajeDe(sinMotivo)).toEqual({ error: 'Indica el motivo de la anulación' })
    expect((await ana.ventas({ id: ventaId }).anular.post({ motivo: 'Cobro duplicado' })).data).toEqual({ ok: true })
    expect(await stockDe(id)).toBe(4)
    const v = await venta(ventaId)
    expect(v).toMatchObject({
      estado: 'anulada',
      situacion: 'anulada',
      anulacion_motivo: 'Cobro duplicado',
      anulacion_usuario: 'ana',
    })

    const otraVez = await api.ventas({ id: ventaId }).anular.post({ motivo: 'x' })
    expect(otraVez.status).toBe(409)
    expect(mensajeDe(otraVez)).toEqual({ error: 'La venta ya está anulada' })
    expect((await api.ventas({ id: ventaId }).put({ pagos: [] })).status).toBe(409)
    expect(
      (await api.ventas({ id: ventaId }).devoluciones.post({ motivo: 'x', metodo_reembolso: 'tarjeta', lineas: [] }))
        .status,
    ).toBe(400)
    expect((await api.ventas({ id: 9999 }).anular.post({ motivo: 'x' })).status).toBe(404)
  })

  test('una venta de otro día o con devoluciones no se anula', async () => {
    const id = await productoConStock({ nombre: 'ZMA', precio: 10, unidades: 5 })
    const pasada = await vender({
      fecha: '2026-01-15',
      lineas: [{ producto_id: id, cantidad: 1, precio_unitario: 10 }],
      pagos: [{ metodo: 'efectivo', importe: 10 }],
    })
    expect(mensajeDe(await api.ventas({ id: pasada }).anular.post({ motivo: 'Error' }))).toEqual({
      error: 'Solo se pueden anular las ventas de hoy. Para una venta de otro día, registra una devolución',
    })
    const deHoy = await vender({
      lineas: [{ producto_id: id, cantidad: 2, precio_unitario: 10 }],
      pagos: [{ metodo: 'efectivo', importe: 20 }],
    })
    const lineaId = (await venta(deHoy)).lineas[0]?.id ?? 0
    await api.ventas({ id: deHoy }).devoluciones.post({
      motivo: 'No le gusta',
      metodo_reembolso: 'efectivo',
      lineas: [{ venta_linea_id: lineaId, cantidad: 1 }],
    })
    expect(mensajeDe(await api.ventas({ id: deHoy }).anular.post({ motivo: 'Error' }))).toEqual({
      error: 'La venta ya tiene devoluciones: registra otra devolución en lugar de anularla',
    })
  })
})

describe('devoluciones', () => {
  test('parcial: reembolsa la parte proporcional y decide si vuelve al almacén', async () => {
    const id = await productoConStock({ nombre: 'Proteína vegana', precio: 10, unidades: 10 })
    const ventaId = await vender({
      fecha: '2026-02-01',
      lineas: [{ producto_id: id, cantidad: 3, precio_unitario: 10 }],
      descuento_total: 1,
      pagos: [{ metodo: 'tarjeta', importe: 29 }],
    })
    const lineaId = (await venta(ventaId)).lineas[0]?.id ?? 0
    expect(await stockDe(id)).toBe(7)

    const primera = await ana.ventas({ id: ventaId }).devoluciones.post({
      motivo: 'Le sienta mal',
      metodo_reembolso: 'efectivo',
      lineas: [{ venta_linea_id: lineaId, cantidad: 1, reingresa: true }],
    })
    expect(primera.data).toMatchObject({ ok: true, importe: 9.67 })
    expect(await stockDe(id)).toBe(8)

    // El bote abierto no vuelve a la venta.
    const segunda = await api.ventas({ id: ventaId }).devoluciones.post({
      motivo: 'Abierto',
      metodo_reembolso: 'tarjeta',
      lineas: [{ venta_linea_id: lineaId, cantidad: 1, reingresa: false }],
    })
    expect(segunda.data?.importe).toBe(9.67)
    expect(await stockDe(id)).toBe(8)
    expect((await venta(ventaId)).situacion).toBe('devuelta_parcial')

    const demasiado = await api.ventas({ id: ventaId }).devoluciones.post({
      motivo: 'x',
      metodo_reembolso: 'tarjeta',
      lineas: [{ venta_linea_id: lineaId, cantidad: 2 }],
    })
    expect(demasiado.status).toBe(409)
    expect(mensajeDe(demasiado)).toEqual({ error: 'Solo queda 1 unidad de «Proteína vegana» por devolver' })

    // La última unidad se lleva el resto, y el total devuelto coincide con lo cobrado.
    const ultima = await api.ventas({ id: ventaId }).devoluciones.post({
      motivo: 'Todo',
      metodo_reembolso: 'tarjeta',
      lineas: [{ venta_linea_id: lineaId, cantidad: 1 }],
    })
    expect(ultima.data?.importe).toBe(9.66)
    const v = await venta(ventaId)
    expect(v.situacion).toBe('devuelta')
    expect(v.total_devuelto).toBe(29)
    expect(v.devoluciones.map((d) => [d.usuario, d.metodo_reembolso])).toEqual([
      ['ana', 'efectivo'],
      ['admin', 'tarjeta'],
      ['admin', 'tarjeta'],
    ])
  })

  test('valida motivo, método y líneas', async () => {
    const id = await productoConStock({ nombre: 'Cafeína', precio: 6, unidades: 2 })
    const ventaId = await vender({
      lineas: [{ producto_id: id, cantidad: 1, precio_unitario: 6 }],
      pagos: [{ metodo: 'bizum', importe: 6 }],
    })
    const lineaId = (await venta(ventaId)).lineas[0]?.id ?? 0
    const casos: [Parameters<ReturnType<typeof api.ventas>['devoluciones']['post']>[0], string][] = [
      [
        { metodo_reembolso: 'bizum', lineas: [{ venta_linea_id: lineaId, cantidad: 1 }] },
        'Indica el motivo de la devolución',
      ],
      [{ motivo: 'x', lineas: [{ venta_linea_id: lineaId, cantidad: 1 }] }, 'Indica cómo se devuelve el dinero'],
      [{ motivo: 'x', metodo_reembolso: 'bizum', lineas: [] }, 'La devolución debe tener al menos una línea'],
      [
        { motivo: 'x', metodo_reembolso: 'bizum', lineas: [{ venta_linea_id: 9999, cantidad: 1 }] },
        'La línea no pertenece a esta venta',
      ],
    ]
    for (const [cuerpo, error] of casos) {
      expect(mensajeDe(await api.ventas({ id: ventaId }).devoluciones.post(cuerpo))).toEqual({ error })
    }
  })
})

describe('corrección', () => {
  test('cambia cliente, notas y forma de pago y lo deja en la auditoría', async () => {
    const id = await productoConStock({ nombre: 'Electrolitos', precio: 12, unidades: 3 })
    const cliente = await api.pacientes.post({ nombre: 'Raúl Soto' })
    const clienteId = cliente.data?.id ?? 0
    const ventaId = await vender({
      lineas: [{ producto_id: id, cantidad: 1, precio_unitario: 12 }],
      pagos: [{ metodo: 'efectivo', importe: 12 }],
      entregado: 20,
    })

    const mal = await api
      .ventas({ id: ventaId })
      .put({ paciente_id: clienteId, pagos: [{ metodo: 'tarjeta', importe: 10 }] })
    expect(mensajeDe(mal)).toEqual({ error: 'Los pagos suman 10,00 € y el total es 12,00 €' })
    await api
      .ventas({ id: ventaId })
      .put({ paciente_id: clienteId, notas: 'Pagó con tarjeta', pagos: [{ metodo: 'tarjeta', importe: 12 }] })
    const v = await venta(ventaId)
    expect(v).toMatchObject({
      paciente_id: clienteId,
      paciente_nombre: 'Raúl Soto',
      notas: 'Pagó con tarjeta',
      entregado: null,
    })
    expect(v.pagos).toEqual([{ metodo: 'tarjeta', importe: 12 }])

    const compras = (await api.ventas.get({ query: { paciente_id: clienteId } })).data ?? []
    expect(compras.map((c) => c.id)).toEqual([ventaId])

    await Bun.sleep(20)
    const auditoria = (await api.auditoria.get({ query: {} })).data ?? []
    const ultima = auditoria.find((e) => e.metodo === 'PUT' && e.ruta === `/api/ventas/${ventaId}`)
    expect(ultima?.paciente_id).toBe(clienteId)
    expect(ultima?.detalle?.cambios).toEqual([
      { campo: 'paciente_id', antes: null, despues: clienteId },
      { campo: 'notas', antes: null, despues: 'Pagó con tarjeta' },
      { campo: 'pagos', antes: 'efectivo 12,00 €', despues: 'tarjeta 12,00 €' },
    ])
  })

  test('las ventas antiguas sin forma de pago pueden seguir sin ella', async () => {
    const id = await productoConStock({ nombre: 'Melatonina', precio: 5, unidades: 2 })
    const ventaId = await vender({
      lineas: [{ producto_id: id, cantidad: 1, precio_unitario: 5 }],
      pagos: [{ metodo: 'efectivo', importe: 5 }],
    })
    // Simula una venta migrada: sin pagos guardados.
    entorno.db.delete(stock_ventas_pagos).where(eq(stock_ventas_pagos.venta_id, ventaId)).run()
    expect((await api.ventas({ id: ventaId }).put({ notas: 'Antigua' })).data).toEqual({ ok: true })
    expect((await venta(ventaId)).pagos).toEqual([])
  })
})

describe('traza de las ventas de un cliente', () => {
  test('quedan en la auditoría general con su cliente y no en su historial', async () => {
    const id = await productoConStock({ nombre: 'Glutamina', precio: 15, unidades: 5 })
    const clienteId = (await api.pacientes.post({ nombre: 'Lucía Prado' })).data?.id ?? 0
    const linea = [{ producto_id: id, cantidad: 1, precio_unitario: 15 }]
    const pago = [{ metodo: 'efectivo' as const, importe: 15 }]
    const devuelta = await vender({ paciente_id: clienteId, lineas: linea, pagos: pago })
    const corregida = await api.ventas({ id: devuelta }).put({ paciente_id: clienteId, notas: 'Revisada', pagos: pago })
    expect(corregida.data).toEqual({ ok: true })
    const lineaId = (await venta(devuelta)).lineas[0]?.id ?? 0
    await api.ventas({ id: devuelta }).devoluciones.post({
      motivo: 'Caducada',
      metodo_reembolso: 'efectivo',
      lineas: [{ venta_linea_id: lineaId, cantidad: 1 }],
    })
    const anulada = await vender({ paciente_id: clienteId, lineas: linea, pagos: pago })
    await api.ventas({ id: anulada }).anular.post({ motivo: 'Cobro duplicado' })
    await api.pacientes({ id: clienteId }).put({ nombre: 'Lucía Prado', telefono: '611' })
    await Bun.sleep(20)

    const historial = (await api.pacientes({ id: clienteId }).historial.get()).data ?? []
    expect(historial.map((e) => `${e.metodo} ${e.ruta}`)).toEqual([
      `PUT /api/pacientes/${clienteId}`,
      'POST /api/pacientes',
    ])
    const auditoria = (await api.auditoria.get({ query: {} })).data ?? []
    const deVentas = auditoria.filter((e) => e.paciente_id === clienteId && e.ruta.startsWith('/api/ventas'))
    expect(deVentas.map((e) => `${e.metodo} ${e.ruta}`)).toEqual([
      `POST /api/ventas/${anulada}/anular`,
      'POST /api/ventas',
      `POST /api/ventas/${devuelta}/devoluciones`,
      `PUT /api/ventas/${devuelta}`,
      'POST /api/ventas',
    ])
  })
})

describe('cierre de caja', () => {
  test('resume el día por método, descuenta devoluciones y bloquea el día cerrado', async () => {
    const dia = '2026-03-10'
    const id = await productoConStock({ nombre: 'Multivitamínico', precio: 10, unidades: 10 })
    const linea = (cantidad: number) => [{ producto_id: id, cantidad, precio_unitario: 10 }]
    await vender({ fecha: dia, lineas: linea(2), pagos: [{ metodo: 'efectivo', importe: 20 }] })
    await vender({
      fecha: dia,
      lineas: linea(3),
      pagos: [
        { metodo: 'efectivo', importe: 5 },
        { metodo: 'tarjeta', importe: 25 },
      ],
    })

    const resumen = (await api.caja.dia({ fecha: dia }).get()).data
    expect(resumen).toMatchObject({
      num_ventas: 2,
      total_ventas: 50,
      cobrado: { efectivo: 25, tarjeta: 25, bizum: 0, sin_indicar: 0 },
      neto: { efectivo: 25 },
      cierre: null,
    })

    const sinContar = await ana.caja.cierres.post({ fecha: dia })
    expect(mensajeDe(sinContar)).toEqual({ error: 'Indica el efectivo contado' })
    const cierre = await ana.caja.cierres.post({ fecha: dia, fondo_inicial: 100, efectivo_contado: 123 })
    expect(cierre.status).toBe(201)
    expect(cierre.data).toMatchObject({
      efectivo: 25,
      tarjeta: 25,
      efectivo_esperado: 125,
      efectivo_contado: 123,
      usuario: 'ana',
    })
    expect((await ana.caja.cierres.post({ fecha: dia, efectivo_contado: 0 })).status).toBe(409)

    const tarde = await api.ventas.post({ fecha: dia, lineas: linea(1), pagos: [{ metodo: 'bizum', importe: 10 }] })
    expect(mensajeDe(tarde)).toEqual({ error: 'La caja del 10/03/2026 ya está cerrada' })

    // Solo un administrador reabre la caja.
    const cierreId = cierre.data?.id ?? 0
    expect((await ana.caja.cierres({ id: cierreId }).delete()).status).toBe(403)
    expect((await api.caja.cierres({ id: cierreId }).delete()).data).toEqual({ ok: true })
    expect(
      (await api.ventas.post({ fecha: dia, lineas: linea(1), pagos: [{ metodo: 'bizum', importe: 10 }] })).status,
    ).toBe(201)
  })

  test('las devoluciones de hoy restan de la caja de hoy y no se admiten con la caja cerrada', async () => {
    const id = await productoConStock({ nombre: 'Ashwagandha', precio: 14, unidades: 3 })
    const ventaId = await vender({
      fecha: '2026-03-20',
      lineas: [{ producto_id: id, cantidad: 2, precio_unitario: 14 }],
      pagos: [{ metodo: 'efectivo', importe: 28 }],
    })
    const lineaId = (await venta(ventaId)).lineas[0]?.id ?? 0
    const antes = (await api.caja.dia({ fecha: hoy() }).get()).data
    await api.ventas({ id: ventaId }).devoluciones.post({
      motivo: 'Caducado',
      metodo_reembolso: 'efectivo',
      lineas: [{ venta_linea_id: lineaId, cantidad: 1, reingresa: false }],
    })
    const despues = (await api.caja.dia({ fecha: hoy() }).get()).data
    expect((despues?.devuelto.efectivo ?? 0) - (antes?.devuelto.efectivo ?? 0)).toBe(14)
    expect((despues?.neto.efectivo ?? 0) - (antes?.neto.efectivo ?? 0)).toBe(-14)

    expect((await cerrar(hoy())).status).toBe(201)
    const cerrada = await api.ventas({ id: ventaId }).devoluciones.post({
      motivo: 'x',
      metodo_reembolso: 'efectivo',
      lineas: [{ venta_linea_id: lineaId, cantidad: 1 }],
    })
    expect(cerrada.status).toBe(409)
    const cierres = (await api.caja.cierres.get()).data ?? []
    const deHoy = cierres.find((c) => c.fecha === hoy())
    await api.caja.cierres({ id: deHoy?.id ?? 0 }).delete()
  })
})

describe('datos de la tienda', () => {
  test('todos los leen; solo un administrador los cambia', async () => {
    expect((await ana.tienda.get()).data).toMatchObject({ tienda_nombre: '' })
    expect((await ana.tienda.put({ tienda_nombre: 'Tienda Ana' })).status).toBe(403)
    const guardados = await api.tienda.put({
      tienda_nombre: ' NutriShop ',
      tienda_nif: 'B12345678',
      ticket_pie: 'Gracias',
    })
    expect(guardados.data).toEqual({
      tienda_nombre: 'NutriShop',
      tienda_nif: 'B12345678',
      tienda_direccion: '',
      tienda_telefono: '',
      ticket_pie: 'Gracias',
    })
    expect((await ana.tienda.get()).data?.tienda_nombre).toBe('NutriShop')
  })
})
