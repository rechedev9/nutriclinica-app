import { fmtMoneda } from '@/lib/format/moneda'
import type { LineaVenta, MetodoPago, PagoInput, VentaInput } from '@/types'

// Cálculos de la caja en céntimos enteros, igual que el servidor, para que lo que se ve sea lo que se cobra.

export type TipoDescuento = 'pct' | 'eur'

export interface Descuento {
  tipo: TipoDescuento
  valor: number
}

export interface LineaCarrito {
  producto_id: number
  nombre: string
  unidad: string | null
  cantidad: number
  precio_unitario: number
  descuento: Descuento
  stock: number
}

export const SIN_DESCUENTO: Descuento = { tipo: 'eur', valor: 0 }

export const METODOS: { valor: MetodoPago; etiqueta: string }[] = [
  { valor: 'efectivo', etiqueta: 'Efectivo' },
  { valor: 'tarjeta', etiqueta: 'Tarjeta' },
  { valor: 'bizum', etiqueta: 'Bizum' },
]

export function etiquetaMetodo(metodo: MetodoPago): string {
  return METODOS.find((m) => m.valor === metodo)?.etiqueta ?? metodo
}

const aCentimos = (importe: number) => Math.round(importe * 100)
const aEuros = (centimos: number) => centimos / 100

// Rebaja en céntimos sobre una base, sin pasar de la base ni bajar de cero.
function rebaja(base: number, descuento: Descuento): number {
  const bruta = descuento.tipo === 'pct' ? Math.round((base * descuento.valor) / 100) : aCentimos(descuento.valor)
  return Math.min(base, Math.max(0, bruta))
}

function brutoLinea(linea: LineaCarrito): number {
  return aCentimos(linea.cantidad * linea.precio_unitario)
}

export function importeLinea(linea: LineaCarrito): number {
  const base = brutoLinea(linea)
  return aEuros(base - rebaja(base, linea.descuento))
}

export function totalesCarrito(lineas: LineaCarrito[], descuentoTotal: Descuento) {
  const bruto = lineas.reduce((suma, l) => suma + brutoLinea(l), 0)
  const subtotal = lineas.reduce((suma, l) => suma + aCentimos(importeLinea(l)), 0)
  const rebajaTotal = rebaja(subtotal, descuentoTotal)
  return {
    bruto: aEuros(bruto),
    descuento_lineas: aEuros(bruto - subtotal),
    subtotal: aEuros(subtotal),
    descuento_total: aEuros(rebajaTotal),
    total: aEuros(subtotal - rebajaTotal),
    unidades: lineas.reduce((suma, l) => suma + l.cantidad, 0),
  }
}

function excede(base: number, descuento: Descuento): boolean {
  if (descuento.valor < 0) return true
  if (descuento.tipo === 'pct') return descuento.valor > 100
  return aCentimos(descuento.valor) > base
}

// Primer motivo que impide cobrar, o null si el carrito se puede cobrar.
export function errorCarrito(lineas: LineaCarrito[], descuentoTotal: Descuento): string | null {
  if (lineas.length === 0) return 'Añade algún producto'
  for (const l of lineas) {
    if (!(l.cantidad > 0)) return `La cantidad de «${l.nombre}» debe ser mayor que 0`
    if (!(l.precio_unitario >= 0)) return `El precio de «${l.nombre}» no puede ser negativo`
    if (excede(brutoLinea(l), l.descuento)) return `El descuento de «${l.nombre}» supera su importe`
  }
  const pedidas = new Map<number, number>()
  for (const l of lineas) pedidas.set(l.producto_id, (pedidas.get(l.producto_id) ?? 0) + l.cantidad)
  for (const l of lineas) {
    const pedida = pedidas.get(l.producto_id) ?? 0
    if (pedida > l.stock) {
      const quedan = Math.max(0, l.stock)
      return quedan === 0
        ? `No queda stock de «${l.nombre}»`
        : `Solo ${quedan === 1 ? 'queda 1' : `quedan ${quedan}`} de «${l.nombre}»`
    }
  }
  if (excede(aCentimos(totalesCarrito(lineas, SIN_DESCUENTO).subtotal), descuentoTotal)) {
    return 'El descuento supera el total de la venta'
  }
  return null
}

// Añade una unidad del producto: si ya hay una línea suya al mismo precio, suma a esa línea.
export function anadirProducto(lineas: LineaCarrito[], nueva: Omit<LineaCarrito, 'cantidad' | 'descuento'>) {
  const i = lineas.findIndex((l) => l.producto_id === nueva.producto_id && l.precio_unitario === nueva.precio_unitario)
  if (i === -1) return [...lineas, { ...nueva, cantidad: 1, descuento: SIN_DESCUENTO }]
  return lineas.map((l, j) => (j === i ? { ...l, cantidad: l.cantidad + 1 } : l))
}

export function sumaPagos(pagos: PagoInput[]): number {
  return aEuros(pagos.reduce((suma, p) => suma + aCentimos(p.importe), 0))
}

export function efectivoDe(pagos: PagoInput[]): number {
  return aEuros(pagos.filter((p) => p.metodo === 'efectivo').reduce((suma, p) => suma + aCentimos(p.importe), 0))
}

export function cambio(entregado: number, efectivo: number): number {
  return aEuros(Math.max(0, aCentimos(entregado) - aCentimos(efectivo)))
}

export function errorPagos(pagos: PagoInput[], total: number): string | null {
  if (aCentimos(total) === 0) return null
  if (pagos.length === 0) return 'Indica cómo paga el cliente'
  if (pagos.some((p) => !(p.importe > 0))) return 'Cada pago debe ser mayor que 0'
  const diferencia = aCentimos(total) - aCentimos(sumaPagos(pagos))
  if (diferencia > 0) return `Faltan ${fmtMoneda(aEuros(diferencia))} por cobrar`
  if (diferencia < 0) return `Los pagos pasan del total en ${fmtMoneda(aEuros(-diferencia))}`
  return null
}

// Importes de billete que suelen entregar los clientes, por encima del total.
export function entregasRapidas(total: number): number[] {
  const centimos = aCentimos(total)
  if (centimos <= 0) return []
  const billetes = [500, 1000, 2000, 5000, 10000]
  const redondeos = billetes.map((b) => Math.ceil(centimos / b) * b)
  return [...new Set([centimos, ...redondeos])]
    .filter((c) => c >= centimos)
    .toSorted((a, b) => a - b)
    .slice(0, 4)
    .map(aEuros)
}

export function aVentaInput(opciones: {
  lineas: LineaCarrito[]
  descuentoTotal: Descuento
  pacienteId: number | null
  notas: string
  pagos: PagoInput[]
  entregado: number | null
}): VentaInput {
  const { lineas, descuentoTotal, pacienteId, notas, pagos, entregado } = opciones
  const efectivo = efectivoDe(pagos)
  return {
    paciente_id: pacienteId,
    notas: notas.trim() === '' ? null : notas.trim(),
    lineas: lineas.map((l) => ({
      producto_id: l.producto_id,
      cantidad: l.cantidad,
      precio_unitario: l.precio_unitario,
      descuento: aEuros(rebaja(brutoLinea(l), l.descuento)),
    })),
    descuento_total: totalesCarrito(lineas, descuentoTotal).descuento_total,
    pagos: pagos.filter((p) => p.importe > 0),
    entregado: efectivo > 0 && entregado !== null ? entregado : null,
  }
}

// --- Ticket y devoluciones ---

// Desglose del IVA incluido en los importes, por tipo.
export function desgloseIva(lineas: Pick<LineaVenta, 'importe' | 'iva'>[]) {
  const porTipo = new Map<number, number>()
  for (const l of lineas) porTipo.set(l.iva, (porTipo.get(l.iva) ?? 0) + aCentimos(l.importe))
  return [...porTipo.entries()]
    .toSorted(([a], [b]) => a - b)
    .map(([iva, total]) => {
      const base = Math.round(total / (1 + iva / 100))
      return { iva, base: aEuros(base), cuota: aEuros(total - base), total: aEuros(total) }
    })
}

// Lo que se reembolsa por devolver `cantidad` unidades de una línea (misma regla que el servidor).
export function importeDevolucion(linea: LineaVenta, opciones: { cantidad: number; reembolsado: number }): number {
  const quedan = linea.cantidad - linea.devuelto
  if (opciones.cantidad <= 0 || quedan <= 0) return 0
  const neto = aCentimos(linea.importe)
  if (opciones.cantidad >= quedan) return aEuros(neto - aCentimos(opciones.reembolsado))
  return aEuros(Math.round((neto * opciones.cantidad) / linea.cantidad))
}

// Importe ya reembolsado de cada línea de la venta.
export function reembolsadoPorLinea(devoluciones: { lineas: { venta_linea_id: number; importe: number }[] }[]) {
  const mapa = new Map<number, number>()
  for (const d of devoluciones) {
    for (const l of d.lineas)
      mapa.set(l.venta_linea_id, aEuros(aCentimos(mapa.get(l.venta_linea_id) ?? 0) + aCentimos(l.importe)))
  }
  return mapa
}

export function sumarImportes(importes: number[]): number {
  return aEuros(importes.reduce((suma, i) => suma + aCentimos(i), 0))
}

// Importe escrito por el usuario (admite coma decimal): null si está vacío, NaN si no es un número.
export function leerImporte(texto: string): number | null {
  const limpio = texto.trim().replace(',', '.')
  if (limpio === '') return null
  return Number(limpio)
}

// Texto inicial de un campo de importe, con coma decimal como lo escribiría el usuario.
export function importeEditable(importe: number): string {
  return importe.toFixed(2).replace('.', ',')
}
