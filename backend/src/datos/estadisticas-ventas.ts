import { and, asc, eq, gte, inArray, lte } from 'drizzle-orm'
import type { Ejecutor } from '../db/cliente'
import type { METODOS_PAGO } from '../db/esquema'
import {
  pacientes,
  stock_categorias,
  stock_compras,
  stock_compras_lineas,
  stock_devoluciones,
  stock_devoluciones_lineas,
  stock_productos,
  stock_ventas,
  stock_ventas_lineas,
  stock_ventas_pagos,
} from '../db/esquema'
import { aCentimos, aEuros } from '../lib/dinero'
import { agrupar } from './stock'

const MEJORES_CLIENTES = 10

type MetodoCobro = (typeof METODOS_PAGO)[number] | 'sin_indicar'

// Todas las cifras se acumulan en céntimos y se pasan a euros al final.
interface Cifra {
  neto: number
  tickets: number
}

interface PorProducto {
  unidades: number
  neto: number
  coste: number
}

interface PorCliente extends Cifra {
  nombre: string
  ultima: string
}

function sumar(mapa: Map<string, Cifra>, opciones: { clave: string; neto: number }): void {
  const actual = mapa.get(opciones.clave) ?? { neto: 0, tickets: 0 }
  mapa.set(opciones.clave, { neto: actual.neto + opciones.neto, tickets: actual.tickets + 1 })
}

function unidades(cantidad: number): number {
  return Math.round(cantidad * 1000) / 1000
}

// Hora en que se cobró, si consta y es del mismo día de la venta (las registradas con otra fecha no la tienen).
function horaDe(venta: { fecha: string | null; creado: string | null }): number | null {
  const creado = venta.creado ?? ''
  if (venta.fecha === null || !creado.startsWith(`${venta.fecha} `)) return null
  const hora = Number(creado.slice(11, 13))
  return Number.isInteger(hora) && hora >= 0 && hora < 24 ? hora : null
}

// Coste por producto, con la misma regla que el Análisis de tienda (costesPorProducto):
// el coste de la ficha y, si no tiene, el precio de su última compra.
function costesDe(db: Ejecutor, productos: { id: number; precio_coste: number }[]): Map<number, number> {
  const costes = new Map<number, number>()
  const ultimas = db
    .select({ producto_id: stock_compras_lineas.producto_id, precio: stock_compras_lineas.precio_unitario })
    .from(stock_compras_lineas)
    .innerJoin(stock_compras, eq(stock_compras.id, stock_compras_lineas.compra_id))
    .where(
      inArray(
        stock_compras_lineas.producto_id,
        productos.map((p) => p.id),
      ),
    )
    .orderBy(asc(stock_compras.fecha), asc(stock_compras.id), asc(stock_compras_lineas.id))
    .all()
  for (const c of ultimas) costes.set(c.producto_id, c.precio)
  for (const p of productos) if (p.precio_coste > 0) costes.set(p.id, p.precio_coste)
  return costes
}

// Agregados de las ventas entre dos días (incluidos). Usa la definición de venta neta de
// frontend/src/features/ventas/netas.ts: sin anuladas ni devueltas enteras, y lo devuelto
// se descuenta de la venta original aunque la devolución sea de otro día.
export function estadisticasVentas(db: Ejecutor, periodo: { desde: string; hasta: string }) {
  const enPeriodo = and(gte(stock_ventas.fecha, periodo.desde), lte(stock_ventas.fecha, periodo.hasta))
  const ventas = db
    .select({
      id: stock_ventas.id,
      fecha: stock_ventas.fecha,
      creado: stock_ventas.creado,
      paciente_id: stock_ventas.paciente_id,
      paciente_nombre: pacientes.nombre,
      total: stock_ventas.total,
      estado: stock_ventas.estado,
    })
    .from(stock_ventas)
    .leftJoin(pacientes, eq(pacientes.id, stock_ventas.paciente_id))
    .where(enPeriodo)
    .orderBy(asc(stock_ventas.fecha), asc(stock_ventas.id))
    .all()
  const validas = db
    .select({ id: stock_ventas.id })
    .from(stock_ventas)
    .where(and(enPeriodo, eq(stock_ventas.estado, 'completada')))
  const lineas = db
    .select({
      padre: stock_ventas_lineas.venta_id,
      id: stock_ventas_lineas.id,
      producto_id: stock_ventas_lineas.producto_id,
      cantidad: stock_ventas_lineas.cantidad,
      precio_unitario: stock_ventas_lineas.precio_unitario,
      descuento: stock_ventas_lineas.descuento,
    })
    .from(stock_ventas_lineas)
    .where(inArray(stock_ventas_lineas.venta_id, validas))
    .all()
  const devoluciones = db
    .select({
      devolucion_id: stock_devoluciones_lineas.devolucion_id,
      venta_linea_id: stock_devoluciones_lineas.venta_linea_id,
      cantidad: stock_devoluciones_lineas.cantidad,
      importe: stock_devoluciones_lineas.importe,
    })
    .from(stock_devoluciones_lineas)
    .innerJoin(stock_devoluciones, eq(stock_devoluciones.id, stock_devoluciones_lineas.devolucion_id))
    .where(inArray(stock_devoluciones.venta_id, validas))
    .all()
  const pagos = db
    .select({
      padre: stock_ventas_pagos.venta_id,
      metodo: stock_ventas_pagos.metodo,
      importe: stock_ventas_pagos.importe,
    })
    .from(stock_ventas_pagos)
    .where(inArray(stock_ventas_pagos.venta_id, validas))
    .all()
  const productos = db
    .select({
      id: stock_productos.id,
      nombre: stock_productos.nombre,
      precio_coste: stock_productos.precio_coste,
      categoria: stock_categorias.nombre,
    })
    .from(stock_productos)
    .leftJoin(stock_categorias, eq(stock_categorias.id, stock_productos.categoria_id))
    .where(
      inArray(
        stock_productos.id,
        db
          .select({ id: stock_ventas_lineas.producto_id })
          .from(stock_ventas_lineas)
          .where(inArray(stock_ventas_lineas.venta_id, validas)),
      ),
    )
    .all()
  const costes = costesDe(db, productos)

  const devueltoPorLinea = new Map<number, { cantidad: number; importe: number }>()
  for (const d of devoluciones) {
    const previo = devueltoPorLinea.get(d.venta_linea_id) ?? { cantidad: 0, importe: 0 }
    devueltoPorLinea.set(d.venta_linea_id, {
      cantidad: previo.cantidad + d.cantidad,
      importe: previo.importe + aCentimos(d.importe),
    })
  }
  const ids = ventas.map((v) => v.id)
  const lineasPorVenta = agrupar(ids, lineas)
  const pagosPorVenta = agrupar(ids, pagos)

  const r = {
    vendido: 0,
    devuelto: 0,
    neto: 0,
    tickets: 0,
    unidades: 0,
    bruto: 0,
    descuentos: 0,
    margen: 0,
    ingresosConCoste: 0,
    lineasSinCoste: 0,
    anuladas: 0,
    importeAnuladas: 0,
    sinHora: 0,
  }
  const metodos: Record<MetodoCobro, number> = { efectivo: 0, tarjeta: 0, bizum: 0, sin_indicar: 0 }
  const porDia = new Map<string, Cifra>()
  const porHora = new Map<string, Cifra>()
  const porProducto = new Map<number, PorProducto>()
  const porCliente = new Map<number, PorCliente>()
  const conCliente = { neto: 0, tickets: 0 }
  const anonimas = { neto: 0, tickets: 0 }

  for (const v of ventas) {
    const total = aCentimos(v.total)
    if (v.estado === 'anulada') {
      r.anuladas += 1
      r.importeAnuladas += total
      continue
    }
    const pagosVenta = pagosPorVenta.get(v.id) ?? []
    if (pagosVenta.length === 0) metodos.sin_indicar += total
    for (const p of pagosVenta) metodos[p.metodo] += aCentimos(p.importe)

    let devueltoVenta = 0
    let quedanLineas = false
    for (const l of lineasPorVenta.get(v.id) ?? []) {
      const devuelto = devueltoPorLinea.get(l.id) ?? { cantidad: 0, importe: 0 }
      devueltoVenta += devuelto.importe
      const cantidad = l.cantidad - devuelto.cantidad
      if (cantidad <= 0) continue
      quedanLineas = true
      const neto = aCentimos(l.cantidad * l.precio_unitario) - aCentimos(l.descuento) - devuelto.importe
      const bruto = aCentimos(cantidad * l.precio_unitario)
      r.unidades += cantidad
      r.bruto += bruto
      r.descuentos += bruto - neto
      const coste = costes.get(l.producto_id)
      const costeLinea = coste === undefined ? 0 : aCentimos(coste * cantidad)
      if (coste === undefined) {
        r.lineasSinCoste += 1
      } else {
        r.margen += neto - costeLinea
        r.ingresosConCoste += neto
      }
      const producto = porProducto.get(l.producto_id) ?? { unidades: 0, neto: 0, coste: 0 }
      porProducto.set(l.producto_id, {
        unidades: producto.unidades + cantidad,
        neto: producto.neto + neto,
        coste: producto.coste + costeLinea,
      })
    }
    r.vendido += total
    r.devuelto += devueltoVenta
    // Devuelta entera: no cuenta como ticket, igual que en ventasNetas.
    if (!quedanLineas) continue

    const neto = total - devueltoVenta
    r.neto += neto
    r.tickets += 1
    sumar(porDia, { clave: v.fecha ?? '', neto })
    const hora = horaDe(v)
    if (hora === null) r.sinHora += 1
    else sumar(porHora, { clave: String(hora), neto })
    if (v.paciente_id === null) {
      anonimas.neto += neto
      anonimas.tickets += 1
      continue
    }
    conCliente.neto += neto
    conCliente.tickets += 1
    const cliente = porCliente.get(v.paciente_id)
    porCliente.set(v.paciente_id, {
      nombre: v.paciente_nombre ?? '',
      neto: (cliente?.neto ?? 0) + neto,
      tickets: (cliente?.tickets ?? 0) + 1,
      // Las ventas llegan ordenadas por fecha: la última vista es la más reciente.
      ultima: v.fecha ?? cliente?.ultima ?? '',
    })
  }

  const numDevoluciones = new Set(devoluciones.map((d) => d.devolucion_id)).size
  const cifra = (c: Cifra) => ({ neto: aEuros(c.neto), tickets: c.tickets })
  return {
    desde: periodo.desde,
    hasta: periodo.hasta,
    resumen: {
      neto: aEuros(r.neto),
      tickets: r.tickets,
      ticket_medio: r.tickets > 0 ? aEuros(Math.round(r.neto / r.tickets)) : 0,
      unidades: unidades(r.unidades),
      margen: aEuros(r.margen),
      ingresos_con_coste: aEuros(r.ingresosConCoste),
      lineas_sin_coste: r.lineasSinCoste,
      vendido: aEuros(r.vendido),
      devuelto: aEuros(r.devuelto),
      num_devoluciones: numDevoluciones,
      bruto: aEuros(r.bruto),
      descuentos: aEuros(r.descuentos),
      num_anuladas: r.anuladas,
      importe_anuladas: aEuros(r.importeAnuladas),
    },
    por_dia: [...porDia].map(([fecha, c]) => ({ fecha, ...cifra(c) })),
    por_hora: [...porHora]
      .map(([hora, c]) => ({ hora: Number(hora), ...cifra(c) }))
      .toSorted((a, b) => a.hora - b.hora),
    sin_hora: r.sinHora,
    metodos: {
      efectivo: aEuros(metodos.efectivo),
      tarjeta: aEuros(metodos.tarjeta),
      bizum: aEuros(metodos.bizum),
      sin_indicar: aEuros(metodos.sin_indicar),
    },
    productos: productos
      .flatMap((p) => {
        const cifras = porProducto.get(p.id)
        if (cifras === undefined) return []
        return [
          {
            producto_id: p.id,
            nombre: p.nombre,
            categoria: p.categoria,
            unidades: unidades(cifras.unidades),
            neto: aEuros(cifras.neto),
            margen: costes.has(p.id) ? aEuros(cifras.neto - cifras.coste) : null,
          },
        ]
      })
      .toSorted((a, b) => b.neto - a.neto || a.nombre.localeCompare(b.nombre, 'es')),
    clientes: {
      con_cliente: cifra(conCliente),
      anonimas: cifra(anonimas),
      mejores: [...porCliente]
        .map(([paciente_id, c]) => ({ paciente_id, nombre: c.nombre, ultima: c.ultima, ...cifra(c) }))
        .toSorted((a, b) => b.neto - a.neto || b.tickets - a.tickets)
        .slice(0, MEJORES_CLIENTES),
    },
  }
}
