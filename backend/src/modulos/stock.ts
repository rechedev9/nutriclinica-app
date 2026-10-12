import { Elysia } from 'elysia'
import type { Contexto } from '../contexto'
import {
  actualizarCategoria,
  actualizarCompra,
  actualizarProducto,
  actualizarProveedor,
  crearCategoria,
  crearCompra,
  crearMerma,
  crearProducto,
  crearProveedor,
  crearVenta,
  darDeBajaProducto,
  eliminarCategoria,
  eliminarCompra,
  eliminarMerma,
  eliminarProveedor,
  eliminarVenta,
  listarAlmacen,
  listarCategorias,
  listarCompras,
  listarMermas,
  listarProductos,
  listarProveedores,
  listarVentas,
} from '../datos/stock'
import {
  categoriaEntrada,
  compraEntrada,
  idParams,
  mermaEntrada,
  productoEntrada,
  proveedorEntrada,
  ventaEntrada,
} from '../modelos'
import {
  normalizarCategoria,
  normalizarCompra,
  normalizarMerma,
  normalizarProducto,
  normalizarProveedor,
  normalizarVenta,
} from '../validacion'
import { crearAcceso } from './acceso'

const HECHO = { ok: true as const }

export function moduloStock(ctx: Contexto) {
  const { db } = ctx
  return new Elysia({ name: 'stock', prefix: '/api/stock' })
    .use(crearAcceso(ctx))
    .guard({ sesion: true })
    .get('/almacen', () => listarAlmacen(db))

    .get('/productos', () => listarProductos(db))
    .post('/productos', ({ body, status }) => status(201, crearProducto(db, normalizarProducto(body))), {
      body: productoEntrada,
    })
    .put('/productos/:id', ({ params, body }) => actualizarProducto(db, params.id, normalizarProducto(body)), {
      params: idParams,
      body: productoEntrada,
    })
    .delete(
      '/productos/:id',
      ({ params }) => {
        darDeBajaProducto(db, params.id)
        return HECHO
      },
      { params: idParams },
    )

    .get('/categorias', () => listarCategorias(db))
    .post(
      '/categorias',
      ({ body, status }) => status(201, crearCategoria(db, normalizarCategoria(body.nombre))),
      { body: categoriaEntrada },
    )
    .put(
      '/categorias/:id',
      ({ params, body }) => actualizarCategoria(db, params.id, normalizarCategoria(body.nombre)),
      { params: idParams, body: categoriaEntrada },
    )
    .delete(
      '/categorias/:id',
      ({ params }) => {
        eliminarCategoria(db, params.id)
        return HECHO
      },
      { params: idParams },
    )

    .get('/proveedores', () => listarProveedores(db))
    .post('/proveedores', ({ body, status }) => status(201, crearProveedor(db, normalizarProveedor(body))), {
      body: proveedorEntrada,
    })
    .put(
      '/proveedores/:id',
      ({ params, body }) => actualizarProveedor(db, params.id, normalizarProveedor(body)),
      { params: idParams, body: proveedorEntrada },
    )
    .delete(
      '/proveedores/:id',
      ({ params }) => {
        eliminarProveedor(db, params.id)
        return HECHO
      },
      { params: idParams },
    )

    .get('/compras', () => listarCompras(db))
    .post(
      '/compras',
      ({ body, status }) => status(201, { ...HECHO, id: crearCompra(db, normalizarCompra(body)) }),
      { body: compraEntrada },
    )
    .put(
      '/compras/:id',
      ({ params, body }) => {
        actualizarCompra(db, params.id, normalizarCompra(body))
        return HECHO
      },
      { params: idParams, body: compraEntrada },
    )
    .delete(
      '/compras/:id',
      ({ params }) => {
        eliminarCompra(db, params.id)
        return HECHO
      },
      { params: idParams },
    )

    .get('/ventas', () => listarVentas(db))
    .post(
      '/ventas',
      ({ body, status }) => status(201, { ...HECHO, id: crearVenta(db, normalizarVenta(body)) }),
      { body: ventaEntrada },
    )
    .delete(
      '/ventas/:id',
      ({ params }) => {
        eliminarVenta(db, params.id)
        return HECHO
      },
      { params: idParams },
    )

    .get('/mermas', () => listarMermas(db))
    .post(
      '/mermas',
      ({ body, status }) => status(201, { ...HECHO, id: crearMerma(db, normalizarMerma(body)) }),
      { body: mermaEntrada },
    )
    .delete(
      '/mermas/:id',
      ({ params }) => {
        eliminarMerma(db, params.id)
        return HECHO
      },
      { params: idParams },
    )
}
