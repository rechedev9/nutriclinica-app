import { Elysia, t } from 'elysia'
import type { Contexto } from '../contexto'
import { cerrarCaja, guardarAjustes, leerAjustes, listarCierres, reabrirCaja } from '../datos/caja'
import { estadisticasVentas } from '../datos/estadisticas-ventas'
import {
  anularVenta,
  corregirVenta,
  crearDevolucion,
  crearVenta,
  listarVentas,
  numeroTicket,
  obtenerVenta,
  resumenCaja,
} from '../datos/ventas'
import { diferencias } from '../lib/cambios'
import { aCentimos, aEuros, euros } from '../lib/dinero'
import { ErrorHttp } from '../lib/errores'
import { fechaEs, parseFecha } from '../lib/fechas'
import {
  ajustesEntrada,
  anulacionEntrada,
  cierreEntrada,
  correccionVentaEntrada,
  devolucionEntrada,
  fechaParams,
  idParams,
  periodoQuery,
  ventaEntrada,
} from '../modelos'
import {
  normalizarAjustes,
  normalizarAnulacion,
  normalizarCierre,
  normalizarCorreccionVenta,
  normalizarDevolucion,
  normalizarPeriodo,
  normalizarVenta,
} from '../validacion'
import { anotarAuditoria, crearAcceso } from './acceso'

const HECHO = { ok: true as const }

// Ventas de la tienda, devoluciones, cierre de caja y datos del ticket.
// Anular y devolver lo puede hacer cualquier usuario: queda el motivo y quién lo hizo.
export function moduloVentas(ctx: Contexto) {
  const { db } = ctx
  return new Elysia({ name: 'ventas' })
    .use(crearAcceso(ctx))
    .put(
      '/api/tienda',
      ({ request, body }) => {
        const antes = leerAjustes(db)
        const despues = guardarAjustes(db, normalizarAjustes(body))
        anotarAuditoria(request, {
          pacienteId: null,
          detalle: {
            cambios: diferencias({ antes, despues, campos: Object.keys(despues) }),
            resumen: null,
            registro_id: null,
          },
        })
        return despues
      },
      { admin: true, body: ajustesEntrada },
    )
    .delete(
      '/api/caja/cierres/:id',
      ({ request, params }) => {
        const cierre = reabrirCaja(db, params.id)
        anotarAuditoria(request, {
          pacienteId: null,
          detalle: { cambios: [], resumen: `Caja del ${fechaEs(cierre.fecha)} reabierta`, registro_id: cierre.id },
        })
        return HECHO
      },
      { admin: true, params: idParams },
    )
    .guard({ sesion: true })
    .get('/api/tienda', () => leerAjustes(db))

    .get('/api/ventas', ({ query }) => listarVentas(db, { pacienteId: query.paciente_id ?? null }), {
      query: t.Object({ paciente_id: t.Optional(t.Numeric()) }),
    })
    .get('/api/ventas/estadisticas', ({ query }) => estadisticasVentas(db, normalizarPeriodo(query)), {
      query: periodoQuery,
    })
    .get(
      '/api/ventas/:id',
      ({ params }) => {
        const venta = obtenerVenta(db, params.id)
        if (venta === null) throw new ErrorHttp(404, 'Venta no encontrada')
        return venta
      },
      { params: idParams },
    )
    .post(
      '/api/ventas',
      ({ request, body, usuario, status }) => {
        const ahora = new Date()
        const venta = crearVenta(db, { datos: normalizarVenta(body, ahora), usuario: usuario.usuario, ahora })
        anotarAuditoria(request, {
          pacienteId: venta.paciente_id,
          detalle: {
            cambios: [],
            resumen: `Venta nº ${numeroTicket(venta.id)} de ${euros(venta.total)}`,
            registro_id: venta.id,
          },
        })
        return status(201, { ...HECHO, id: venta.id })
      },
      { body: ventaEntrada },
    )
    .put(
      '/api/ventas/:id',
      ({ request, params, body }) => {
        const datos = normalizarCorreccionVenta(body)
        const { antes, despues } = corregirVenta(db, { id: params.id, datos })
        anotarAuditoria(request, {
          pacienteId: datos.paciente_id ?? antes.paciente_id,
          detalle: {
            cambios: diferencias({ antes, despues, campos: ['paciente_id', 'notas', 'pagos'] }),
            resumen: `Venta nº ${numeroTicket(params.id)}`,
            registro_id: params.id,
          },
        })
        return HECHO
      },
      { params: idParams, body: correccionVentaEntrada },
    )
    .post(
      '/api/ventas/:id/anular',
      ({ request, params, body, usuario }) => {
        const motivo = normalizarAnulacion(body)
        const venta = anularVenta(db, { id: params.id, motivo, usuario: usuario.usuario, ahora: new Date() })
        anotarAuditoria(request, {
          pacienteId: venta.paciente_id,
          detalle: {
            cambios: [],
            resumen: `Venta nº ${numeroTicket(venta.id)} de ${euros(venta.total)} anulada: ${motivo}`,
            registro_id: venta.id,
          },
        })
        return HECHO
      },
      { params: idParams, body: anulacionEntrada },
    )
    .post(
      '/api/ventas/:id/devoluciones',
      ({ request, params, body, usuario, status }) => {
        const datos = normalizarDevolucion(body)
        const devolucion = crearDevolucion(db, {
          ventaId: params.id,
          datos,
          usuario: usuario.usuario,
          ahora: new Date(),
        })
        anotarAuditoria(request, {
          pacienteId: devolucion.paciente_id,
          detalle: {
            cambios: [],
            resumen:
              `Devolución de ${euros(devolucion.importe)} (${datos.metodo_reembolso}) ` +
              `de la venta nº ${numeroTicket(params.id)}: ${datos.motivo}`,
            registro_id: params.id,
          },
        })
        return status(201, { ...HECHO, id: devolucion.id, importe: devolucion.importe })
      },
      { params: idParams, body: devolucionEntrada },
    )

    .get(
      '/api/caja/dia/:fecha',
      ({ params }) => {
        const dia = parseFecha(params.fecha)
        if (dia === null) throw new ErrorHttp(400, 'La fecha no es válida')
        return resumenCaja(db, dia)
      },
      { params: fechaParams },
    )
    .get('/api/caja/cierres', () => listarCierres(db))
    .post(
      '/api/caja/cierres',
      ({ request, body, usuario, status }) => {
        const ahora = new Date()
        const cierre = cerrarCaja(db, { datos: normalizarCierre(body, ahora), usuario: usuario.usuario, ahora })
        const descuadre = aEuros(aCentimos(cierre.efectivo_contado) - aCentimos(cierre.efectivo_esperado))
        const cuadre = descuadre === 0 ? 'cuadra' : `descuadre de ${euros(descuadre)}`
        anotarAuditoria(request, {
          pacienteId: null,
          detalle: {
            cambios: [],
            resumen: `Cierre de caja del ${fechaEs(cierre.fecha)}: ${euros(cierre.total_ventas)} en ventas, ${cuadre}`,
            registro_id: cierre.id,
          },
        })
        return status(201, cierre)
      },
      { body: cierreEntrada },
    )
}
