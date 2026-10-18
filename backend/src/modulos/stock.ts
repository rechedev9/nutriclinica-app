import { Elysia } from 'elysia'
import type { Contexto } from '../contexto'
import { crearRecuento, listarRecuentos, movimientosDeProducto } from '../datos/inventario'
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
  darDeBajaProducto,
  eliminarCategoria,
  eliminarCompra,
  eliminarMerma,
  eliminarProveedor,
  listarAlmacen,
  listarCategorias,
  listarCompras,
  listarMermas,
  listarProductos,
  listarProveedores,
} from '../datos/stock'
import {
  categoriaEntrada,
  compraEntrada,
  idParams,
  mermaEntrada,
  productoEntrada,
  proveedorEntrada,
  recuentoEntrada,
} from '../modelos'
import {
  normalizarCategoria,
  normalizarCompra,
  normalizarMerma,
  normalizarProducto,
  normalizarProveedor,
  normalizarRecuento,
} from '../validacion'
import { anotarAuditoria, crearAcceso } from './acceso'

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
    .get('/productos/:id/movimientos', ({ params }) => movimientosDeProducto(db, params.id), { params: idParams })

    .get('/categorias', () => listarCategorias(db))
    .post('/categorias', ({ body, status }) => status(201, crearCategoria(db, normalizarCategoria(body.nombre))), {
      body: categoriaEntrada,
    })
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
    .put('/proveedores/:id', ({ params, body }) => actualizarProveedor(db, params.id, normalizarProveedor(body)), {
      params: idParams,
      body: proveedorEntrada,
    })
    .delete(
      '/proveedores/:id',
      ({ params }) => {
        eliminarProveedor(db, params.id)
        return HECHO
      },
      { params: idParams },
    )

    .get('/compras', () => listarCompras(db))
    .post('/compras', ({ body, status }) => status(201, { ...HECHO, id: crearCompra(db, normalizarCompra(body)) }), {
      body: compraEntrada,
    })
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

    .get('/mermas', () => listarMermas(db))
    .post('/mermas', ({ body, status }) => status(201, { ...HECHO, id: crearMerma(db, normalizarMerma(body)) }), {
      body: mermaEntrada,
    })
    .delete(
      '/mermas/:id',
      ({ params }) => {
        eliminarMerma(db, params.id)
        return HECHO
      },
      { params: idParams },
    )

    .get('/recuentos', () => listarRecuentos(db))
    .post(
      '/recuentos',
      ({ request, body, usuario, status }) => {
        const datos = normalizarRecuento(body)
        const recuento = crearRecuento(db, { datos, usuario: usuario.usuario, ahora: new Date() })
        const ajustes = recuento.lineas.filter((l) => l.diferencia !== 0)
        anotarAuditoria(request, {
          pacienteId: null,
          detalle: {
            // Cada producto con diferencia queda como un cambio: del stock esperado a lo contado.
            cambios: ajustes.map((l) => ({ campo: `«${l.nombre}»`, antes: l.esperado, despues: l.contado })),
            resumen: `Recuento de ${recuento.lineas.length} producto(s), ${ajustes.length} con diferencia: ${datos.motivo}`,
            registro_id: recuento.id,
          },
        })
        return status(201, {
          ...HECHO,
          id: recuento.id,
          lineas: recuento.lineas.map((l) => ({
            producto_id: l.producto_id,
            esperado: l.esperado,
            contado: l.contado,
            diferencia: l.diferencia,
          })),
        })
      },
      { body: recuentoEntrada },
    )
}
