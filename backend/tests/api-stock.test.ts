import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { clienteAdmin, crearEntorno, mensajeDe } from './apoyo'
import type { Cliente, Entorno } from './apoyo'

let entorno: Entorno
let api: Cliente
beforeAll(async () => {
  entorno = await crearEntorno()
  api = (await clienteAdmin(entorno.app)).api
})
afterAll(() => entorno.limpiar())

async function nuevoProducto(nombre: string): Promise<number> {
  const { data } = await api.stock.productos.post({ nombre, precio_coste: 2, precio_venta: 3 })
  if (data === null) throw new Error(`no se pudo crear ${nombre}`)
  return data.id
}

async function stockDe(id: number): Promise<number | undefined> {
  const almacen = (await api.stock.almacen.get()).data ?? []
  return almacen.find((p) => p.id === id)?.stock_actual
}

async function comprar(producto_id: number, cantidad: number): Promise<number> {
  const { data } = await api.stock.compras.post({ lineas: [{ producto_id, cantidad, precio_unitario: 2 }] })
  if (data === null) throw new Error('no se pudo crear la compra')
  return data.id
}

describe('catálogo', () => {
  test('categorías: nombre único sin distinguir mayúsculas y no se borran en uso', async () => {
    const creada = await api.stock.categorias.post({ nombre: ' Proteínas ' })
    expect(creada.status).toBe(201)
    expect(creada.data).toMatchObject({ nombre: 'Proteínas' })
    const categoria_id = creada.data?.id ?? 0

    const duplicada = await api.stock.categorias.post({ nombre: 'proteínas' })
    expect(duplicada.status).toBe(409)
    expect(mensajeDe(duplicada)).toEqual({ error: 'Ya existe una categoría con ese nombre' })
    expect((await api.stock.categorias.post({ nombre: '  ' })).status).toBe(400)

    const whey = await api.stock.productos.post({ nombre: 'Whey', categoria_id })
    const enUso = await api.stock.categorias({ id: categoria_id }).delete()
    expect(enUso.status).toBe(409)
    expect(mensajeDe(enUso)).toEqual({ error: 'No se puede eliminar: hay productos que usan esta categoría' })

    // Un producto dado de baja ya no se ve en la interfaz: no puede retener la categoría.
    await api.stock.productos({ id: whey.data?.id ?? 0 }).delete()
    expect((await api.stock.categorias({ id: categoria_id }).delete()).data).toEqual({ ok: true })

    const libre = await api.stock.categorias.post({ nombre: 'Vitaminas' })
    expect((await api.stock.categorias({ id: libre.data?.id ?? 0 }).delete()).data).toEqual({ ok: true })
  })

  test('productos: validación, edición y baja lógica', async () => {
    const sinNombre = await api.stock.productos.post({ nombre: '' })
    expect(mensajeDe(sinNombre)).toEqual({ error: 'El nombre es obligatorio' })
    const negativo = await api.stock.productos.post({ nombre: 'Creatina', precio_venta: -1 })
    expect(mensajeDe(negativo)).toEqual({ error: 'El precio no puede ser negativo' })

    const id = await nuevoProducto('Creatina')
    const editado = await api.stock.productos({ id }).put({ nombre: 'Creatina 500 g', precio_venta: 12.9 })
    expect(editado.data).toMatchObject({ id, nombre: 'Creatina 500 g', precio_venta: 12.9 })
    expect((await api.stock.productos({ id: 9999 }).put({ nombre: 'Nada' })).status).toBe(404)

    await api.stock.productos({ id }).delete()
    expect(await stockDe(id)).toBeUndefined()
    const fantasma = await api.ventas.post({ lineas: [{ producto_id: id, cantidad: 1 }] })
    expect(fantasma.status).toBe(400)
    expect(mensajeDe(fantasma)).toEqual({ error: 'El producto no existe o está dado de baja' })
  })

  test('proveedores: no se borran si tienen productos o compras', async () => {
    const proveedor = await api.stock.proveedores.post({ nombre: 'HSN Store', email: 'pedidos@hsn.es' })
    expect(proveedor.status).toBe(201)
    const proveedor_id = proveedor.data?.id ?? 0
    const producto_id = await nuevoProducto('Omega 3')
    await api.stock.compras.post({ proveedor_id, lineas: [{ producto_id, cantidad: 1, precio_unitario: 1 }] })

    const enUso = await api.stock.proveedores({ id: proveedor_id }).delete()
    expect(enUso.status).toBe(409)
    expect(mensajeDe(enUso)).toEqual({ error: 'No se puede eliminar: hay productos o compras de este proveedor' })
    expect((await api.stock.proveedores({ id: 9999 }).put({ nombre: 'Nadie' })).status).toBe(404)

    const otro = await api.stock.proveedores.post({ nombre: 'Amix' })
    const otro_id = otro.data?.id ?? 0
    const baja = await api.stock.productos.post({ nombre: 'Barrita', proveedor_id: otro_id })
    expect((await api.stock.proveedores({ id: otro_id }).delete()).status).toBe(409)
    await api.stock.productos({ id: baja.data?.id ?? 0 }).delete()
    expect((await api.stock.proveedores({ id: otro_id }).delete()).data).toEqual({ ok: true })
  })
})

describe('reglas de stock', () => {
  test('el stock es compras menos ventas no anuladas menos mermas', async () => {
    const id = await nuevoProducto('Barrita')
    expect(await stockDe(id)).toBe(0)
    await comprar(id, 10)
    const venta = await api.ventas.post({
      lineas: [{ producto_id: id, cantidad: 3, precio_unitario: 2.5 }],
      pagos: [{ metodo: 'efectivo', importe: 7.5 }],
    })
    expect(venta.status).toBe(201)
    await api.stock.mermas.post({ producto_id: id, cantidad: 2, motivo: 'caducidad' })
    expect(await stockDe(id)).toBe(5)

    const ventas = (await api.ventas.get()).data ?? []
    const registrada = ventas.find((v) => v.id === venta.data?.id)
    expect(registrada?.total).toBe(7.5)
    expect(registrada?.lineas).toHaveLength(1)

    await api.ventas({ id: venta.data?.id ?? 0 }).anular.post({ motivo: 'Error al cobrar' })
    expect(await stockDe(id)).toBe(8)
  })

  test('una venta o una merma no pueden superar las existencias', async () => {
    const id = await nuevoProducto('Isotónica')
    await comprar(id, 4)
    const venta = await api.ventas.post({ lineas: [{ producto_id: id, cantidad: 5 }] })
    expect(venta.status).toBe(409)
    expect(mensajeDe(venta)).toEqual({ error: 'Stock insuficiente de «Isotónica»: quedan 4' })
    // Dos líneas del mismo producto cuentan juntas.
    const partida = await api.ventas.post({
      lineas: [
        { producto_id: id, cantidad: 3 },
        { producto_id: id, cantidad: 2 },
      ],
    })
    expect(partida.status).toBe(409)
    const merma = await api.stock.mermas.post({ producto_id: id, cantidad: 5, motivo: 'caducidad' })
    expect(merma.status).toBe(409)
    expect(await stockDe(id)).toBe(4)
  })

  test('borrar o reducir una compra no puede dejar el stock en negativo', async () => {
    const id = await nuevoProducto('Magnesio')
    const compra = await comprar(id, 6)
    await api.ventas.post({ lineas: [{ producto_id: id, cantidad: 4 }] })

    const borrada = await api.stock.compras({ id: compra }).delete()
    expect(borrada.status).toBe(409)
    expect(mensajeDe(borrada)).toEqual({
      error: 'No se puede modificar la compra: las unidades de «Magnesio» ya se han vendido o dado de baja',
    })
    const reducida = await api.stock.compras({ id: compra }).put({ lineas: [{ producto_id: id, cantidad: 3 }] })
    expect(reducida.status).toBe(409)
    expect(await stockDe(id)).toBe(2)

    const ajustada = await api.stock.compras({ id: compra }).put({ lineas: [{ producto_id: id, cantidad: 5 }] })
    expect(ajustada.data).toEqual({ ok: true })
    expect(await stockDe(id)).toBe(1)
    expect((await api.stock.compras({ id: 9999 }).put({ lineas: [{ producto_id: id, cantidad: 1 }] })).status).toBe(404)
  })

  test('valida las líneas de compra, venta y merma', async () => {
    const id = await nuevoProducto('Zinc')
    const casos: [Parameters<typeof api.stock.compras.post>[0], string][] = [
      [{ lineas: [] }, 'La compra debe tener al menos una línea'],
      [{ lineas: [{ cantidad: 1 }] }, 'El producto es obligatorio'],
      [{ lineas: [{ producto_id: id, cantidad: 0 }] }, 'La cantidad debe ser mayor que 0'],
      [{ lineas: [{ producto_id: id, cantidad: 1, precio_unitario: -2 }] }, 'El precio no puede ser negativo'],
      [{ lineas: [{ producto_id: 9999, cantidad: 1 }] }, 'El producto no existe o está dado de baja'],
    ]
    for (const [cuerpo, mensaje] of casos) {
      const respuesta = await api.stock.compras.post(cuerpo)
      expect(respuesta.status).toBe(400)
      expect(mensajeDe(respuesta)).toEqual({ error: mensaje })
    }
    const sinLineas = await api.ventas.post({})
    expect(mensajeDe(sinLineas)).toEqual({ error: 'La venta debe tener al menos una línea' })
    const motivo = await api.stock.mermas.post({ producto_id: id, cantidad: 1, motivo: 'porque sí' })
    expect(mensajeDe(motivo)).toEqual({ error: 'El motivo de la merma no es válido' })
  })

  test('las compras devuelven sus líneas y el total calculado', async () => {
    const id = await nuevoProducto('Colágeno')
    const { data } = await api.stock.compras.post({
      fecha: '2026-02-10',
      notas: 'Pedido febrero',
      lineas: [
        { producto_id: id, cantidad: 6, precio_unitario: 16.5 },
        { producto_id: id, cantidad: 1, precio_unitario: 0.3 },
      ],
    })
    const compras = (await api.stock.compras.get()).data ?? []
    const compra = compras.find((c) => c.id === data?.id)
    expect(compra).toMatchObject({ fecha: '2026-02-10', notas: 'Pedido febrero', total: 99.3 })
    expect(compra?.lineas.map((l) => l.cantidad)).toEqual([6, 1])
  })
})
