import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { clienteAdmin, crearEntorno, mensajeDe } from './apoyo'
import type { Cliente, Entorno } from './apoyo'

let entorno: Entorno
let api: Cliente
let proveedor_id = 0
beforeAll(async () => {
  entorno = await crearEntorno()
  api = (await clienteAdmin(entorno.app)).api
  proveedor_id = (await api.stock.proveedores.post({ nombre: 'Distribuciones Norte' })).data?.id ?? 0
})
afterAll(() => entorno.limpiar())

async function nuevoProducto(nombre: string): Promise<number> {
  const { data } = await api.stock.productos.post({ nombre, precio_coste: 10, precio_venta: 20 })
  if (data === null) throw new Error(`no se pudo crear ${nombre}`)
  return data.id
}

async function stockDe(id: number): Promise<number | undefined> {
  const almacen = (await api.stock.almacen.get()).data ?? []
  return almacen.find((p) => p.id === id)?.stock_actual
}

async function pedidoDe(id: number) {
  const pedidos = (await api.stock.pedidos.get()).data ?? []
  const pedido = pedidos.find((p) => p.id === id)
  if (pedido === undefined) throw new Error(`no aparece el pedido ${id}`)
  return pedido
}

async function pedir(lineas: { producto_id: number; cantidad: number; precio_unitario: number }[]): Promise<number> {
  const { data } = await api.stock.pedidos.post({ proveedor_id, lineas })
  if (data === null) throw new Error('no se pudo crear el pedido')
  return data.id
}

describe('pedidos a proveedor', () => {
  test('un pedido no suma stock y se recibe por albaranes', async () => {
    const whey = await nuevoProducto('Whey 1 kg')
    const barritas = await nuevoProducto('Barritas')
    const id = await pedir([
      { producto_id: whey, cantidad: 10, precio_unitario: 18 },
      { producto_id: barritas, cantidad: 24, precio_unitario: 1.5 },
    ])
    const creado = await pedidoDe(id)
    expect(creado).toMatchObject({ numero: `P-${String(id).padStart(6, '0')}`, situacion: 'pendiente', total: 216 })
    expect(creado.usuario).toBe('admin')
    expect(await stockDe(whey)).toBe(0)

    const primero = await api.stock.pedidos({ id }).recepciones.post({
      albaran: 'A-881',
      lineas: [{ producto_id: whey, cantidad: 6, precio_unitario: 18 }],
    })
    expect(primero.status).toBe(201)
    expect(await stockDe(whey)).toBe(6)
    const parcial = await pedidoDe(id)
    expect(parcial.situacion).toBe('parcial')
    expect(parcial.lineas.map((l) => [l.producto_id, l.recibido])).toEqual([
      [whey, 6],
      [barritas, 0],
    ])
    expect(parcial.recepciones).toMatchObject([{ id: primero.data?.id, albaran: 'A-881', total: 108 }])

    // El albarán queda como una compra del proveedor del pedido.
    const compras = (await api.stock.compras.get()).data ?? []
    expect(compras.find((c) => c.id === primero.data?.id)).toMatchObject({
      proveedor_id,
      pedido_id: id,
      pedido_numero: creado.numero,
      albaran: 'A-881',
    })

    await api.stock.pedidos({ id }).recepciones.post({
      albaran: 'A-902',
      lineas: [
        { producto_id: whey, cantidad: 4, precio_unitario: 18 },
        { producto_id: barritas, cantidad: 24, precio_unitario: 1.5 },
      ],
    })
    expect((await pedidoDe(id)).situacion).toBe('recibido')
    expect(await stockDe(barritas)).toBe(24)
    const otro = await api.stock.pedidos({ id }).recepciones.post({
      lineas: [{ producto_id: whey, cantidad: 1, precio_unitario: 18 }],
    })
    expect(otro.status).toBe(409)
    expect(mensajeDe(otro)).toEqual({ error: 'El pedido ya está recibido completo' })

    // Borrar un albarán devuelve el pedido a parcial.
    await api.stock.compras({ id: primero.data?.id ?? 0 }).delete()
    expect((await pedidoDe(id)).situacion).toBe('parcial')
  })

  test('cerrar un pedido incompleto o sin recibir y reabrirlo', async () => {
    const creatina = await nuevoProducto('Creatina')
    const sinNada = await pedir([{ producto_id: creatina, cantidad: 5, precio_unitario: 9 }])
    await api.stock.pedidos({ id: sinNada }).cerrar.post()
    expect((await pedidoDe(sinNada)).situacion).toBe('cancelado')
    const cerrado = await api.stock.pedidos({ id: sinNada }).recepciones.post({
      lineas: [{ producto_id: creatina, cantidad: 5, precio_unitario: 9 }],
    })
    expect(cerrado.status).toBe(409)
    expect(mensajeDe(cerrado)).toEqual({ error: 'El pedido está cerrado: reábrelo para entrar otro albarán' })
    await api.stock.pedidos({ id: sinNada }).reabrir.post()
    expect((await pedidoDe(sinNada)).situacion).toBe('pendiente')

    // Entrar el albarán con «cerrar» da el resto por perdido.
    const corto = await api.stock.pedidos({ id: sinNada }).recepciones.post({
      albaran: 'B-1',
      cerrar: true,
      lineas: [{ producto_id: creatina, cantidad: 3, precio_unitario: 9 }],
    })
    expect(corto.status).toBe(201)
    expect(await pedidoDe(sinNada)).toMatchObject({ estado: 'cerrado', situacion: 'incompleto' })
    expect(await stockDe(creatina)).toBe(3)
  })

  test('validación del pedido y de la recepción', async () => {
    const omega = await nuevoProducto('Omega 3')
    const sinProveedor = await api.stock.pedidos.post({ lineas: [{ producto_id: omega, cantidad: 1 }] })
    expect(mensajeDe(sinProveedor)).toEqual({ error: 'Indica el proveedor del pedido' })
    const sinLineas = await api.stock.pedidos.post({ proveedor_id, lineas: [] })
    expect(mensajeDe(sinLineas)).toEqual({ error: 'El pedido debe tener al menos un producto' })
    const repetido = await api.stock.pedidos.post({
      proveedor_id,
      lineas: [
        { producto_id: omega, cantidad: 1 },
        { producto_id: omega, cantidad: 2 },
      ],
    })
    expect(mensajeDe(repetido)).toEqual({ error: 'Un producto aparece dos veces en el pedido' })
    const futuro = await api.stock.pedidos.post({
      proveedor_id,
      fecha: '2999-01-01',
      lineas: [{ producto_id: omega, cantidad: 1 }],
    })
    expect(mensajeDe(futuro)).toEqual({ error: 'La fecha no puede ser futura' })
    const prevista = await api.stock.pedidos.post({
      proveedor_id,
      fecha: '2026-03-10',
      fecha_prevista: '2026-03-01',
      lineas: [{ producto_id: omega, cantidad: 1 }],
    })
    expect(mensajeDe(prevista)).toEqual({ error: 'La fecha prevista no puede ser anterior a la del pedido' })
    const fantasma = await api.stock.pedidos.post({ proveedor_id: 9999, lineas: [{ producto_id: omega, cantidad: 1 }] })
    expect(mensajeDe(fantasma)).toEqual({ error: 'El proveedor no existe' })

    const id = await pedir([{ producto_id: omega, cantidad: 2, precio_unitario: 7 }])
    const ajeno = await nuevoProducto('Magnesio')
    const fuera = await api.stock.pedidos({ id }).recepciones.post({
      lineas: [{ producto_id: ajeno, cantidad: 1, precio_unitario: 3 }],
    })
    expect(mensajeDe(fuera)).toEqual({ error: 'Un producto del albarán no está en el pedido' })
    const vacio = await api.stock.pedidos({ id }).recepciones.post({ lineas: [] })
    expect(mensajeDe(vacio)).toEqual({ error: 'La recepción debe tener al menos una línea' })
    expect((await api.stock.pedidos({ id: 9999 }).recepciones.post({ lineas: [] })).status).toBe(400)
    const noExiste = await api.stock.pedidos({ id: 9999 }).recepciones.post({
      lineas: [{ producto_id: omega, cantidad: 1 }],
    })
    expect(noExiste.status).toBe(404)
  })

  test('un pedido se edita y se borra solo mientras no tiene albaranes', async () => {
    const zinc = await nuevoProducto('Zinc')
    const id = await pedir([{ producto_id: zinc, cantidad: 3, precio_unitario: 4 }])
    const editado = await api.stock.pedidos({ id }).put({
      proveedor_id,
      fecha_prevista: '2999-12-31',
      notas: 'Llamar antes',
      lineas: [{ producto_id: zinc, cantidad: 6, precio_unitario: 4 }],
    })
    expect(editado.data).toEqual({ ok: true })
    expect(await pedidoDe(id)).toMatchObject({ fecha_prevista: '2999-12-31', notas: 'Llamar antes', total: 24 })

    await api.stock
      .pedidos({ id })
      .recepciones.post({ lineas: [{ producto_id: zinc, cantidad: 2, precio_unitario: 4 }] })
    const tarde = await api.stock.pedidos({ id }).put({ proveedor_id, lineas: [{ producto_id: zinc, cantidad: 1 }] })
    expect(tarde.status).toBe(409)
    expect(mensajeDe(tarde)).toEqual({ error: 'No se puede modificar: el pedido ya tiene albaranes entrados' })
    expect((await api.stock.pedidos({ id }).delete()).status).toBe(409)

    const libre = await pedir([{ producto_id: zinc, cantidad: 1, precio_unitario: 4 }])
    expect((await api.stock.pedidos({ id: libre }).delete()).data).toEqual({ ok: true })
    expect((await api.stock.pedidos({ id: libre }).delete()).status).toBe(404)

    // El proveedor con pedidos no se puede borrar.
    const enUso = await api.stock.proveedores({ id: proveedor_id }).delete()
    expect(mensajeDe(enUso)).toEqual({
      error: 'No se puede eliminar: hay productos, compras o pedidos de este proveedor',
    })
  })

  test('un albarán no se entra dos veces y la compra de un pedido conserva su proveedor', async () => {
    const cafeina = await nuevoProducto('Cafeína')
    const id = await pedir([{ producto_id: cafeina, cantidad: 10, precio_unitario: 2 }])
    const recepcion = await api.stock.pedidos({ id }).recepciones.post({
      albaran: 'ALB-77',
      lineas: [{ producto_id: cafeina, cantidad: 5, precio_unitario: 2 }],
    })
    const repetido = await api.stock.pedidos({ id }).recepciones.post({
      albaran: 'alb-77',
      lineas: [{ producto_id: cafeina, cantidad: 5, precio_unitario: 2 }],
    })
    expect(repetido.status).toBe(409)
    expect(mensajeDe(repetido)).toEqual({ error: 'El albarán alb-77 de este proveedor ya está entrado' })
    const suelta = await api.stock.compras.post({
      proveedor_id,
      albaran: 'ALB-77',
      lineas: [{ producto_id: cafeina, cantidad: 1, precio_unitario: 2 }],
    })
    expect(suelta.status).toBe(409)

    const otroProveedor = (await api.stock.proveedores.post({ nombre: 'Otro' })).data?.id ?? 0
    const compraId = recepcion.data?.id ?? 0
    await api.stock.compras({ id: compraId }).put({
      proveedor_id: otroProveedor,
      albaran: 'ALB-77',
      lineas: [{ producto_id: cafeina, cantidad: 6, precio_unitario: 2 }],
    })
    const compra = ((await api.stock.compras.get()).data ?? []).find((c) => c.id === compraId)
    expect(compra).toMatchObject({ proveedor_id, pedido_id: id, total: 12 })
    expect((await pedidoDe(id)).lineas[0]?.recibido).toBe(6)
  })
})
