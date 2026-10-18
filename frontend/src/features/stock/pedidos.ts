import { productosEnAlerta } from './estado-almacen'
import type { AlmacenRow, LineaInput, SituacionPedido } from '@/types'

export const SITUACION: Record<SituacionPedido, { etiqueta: string; cls: string }> = {
  pendiente: { etiqueta: 'Pendiente', cls: 'bg-amber-500/10 text-amber-600 dark:text-amber-400' },
  parcial: { etiqueta: 'Llegó una parte', cls: 'bg-primary-light text-primary' },
  recibido: { etiqueta: 'Recibido', cls: 'bg-success/10 text-success' },
  incompleto: { etiqueta: 'Cerrado incompleto', cls: 'bg-surface-2 text-ink-muted' },
  cancelado: { etiqueta: 'Cancelado', cls: 'bg-surface-2 text-ink-muted' },
}

export type FiltroPedidos = 'por_recibir' | 'cerrados' | 'todos'

interface ConSituacion {
  situacion: SituacionPedido
}

interface LineaPedida {
  producto_id: number
  cantidad: number
  recibido: number
}

const redondear = (n: number) => Math.round(n * 1000) / 1000

export function porRecibir(p: ConSituacion): boolean {
  return p.situacion === 'pendiente' || p.situacion === 'parcial'
}

export function pendienteDe(l: { cantidad: number; recibido: number }): number {
  return Math.max(0, redondear(l.cantidad - l.recibido))
}

export function retrasado(p: ConSituacion & { fecha_prevista: string | null }, hoy: string): boolean {
  return porRecibir(p) && p.fecha_prevista !== null && p.fecha_prevista < hoy
}

interface PedidoFiltrable extends ConSituacion {
  id: number
}

// `conservarRecibidos` son pedidos que en esta visita acaban de quedar recibidos y siguen en «Por recibir».
export function filtrarPedidos<T extends PedidoFiltrable>(
  pedidos: readonly T[],
  filtro: FiltroPedidos,
  conservarRecibidos: ReadonlySet<number> = new Set(),
): T[] {
  if (filtro === 'todos') return [...pedidos]
  if (filtro === 'por_recibir') {
    return pedidos.filter((p) => porRecibir(p) || (p.situacion === 'recibido' && conservarRecibidos.has(p.id)))
  }
  return pedidos.filter((p) => !porRecibir(p))
}

export function fechaUltimaRecepcion(fechas: readonly string[]): string | null {
  let ultima: string | null = null
  for (const fecha of fechas) {
    if (ultima === null || fecha > ultima) ultima = fecha
  }
  return ultima
}

// Unidades que aún deben llegar de cada producto en los pedidos por recibir.
export function enCamino(pedidos: readonly (ConSituacion & { lineas: LineaPedida[] })[]): Map<number, number> {
  const cuenta = new Map<number, number>()
  for (const p of pedidos.filter(porRecibir)) {
    for (const l of p.lineas) {
      const falta = pendienteDe(l)
      if (falta > 0) cuenta.set(l.producto_id, redondear((cuenta.get(l.producto_id) ?? 0) + falta))
    }
  }
  return cuenta
}

// Lo que se pide reponer: hasta el doble del mínimo (1 si no tiene), sin contar lo que ya viene en camino.
export function sugerenciasReposicion(opciones: {
  almacen: readonly AlmacenRow[]
  proveedorId: number
  enCamino: Map<number, number>
  excluir: ReadonlySet<number>
}): LineaInput[] {
  return productosEnAlerta(opciones.almacen)
    .filter((p) => p.proveedor_id === opciones.proveedorId && !opciones.excluir.has(p.id))
    .flatMap((p) => {
      const objetivo = Math.max(p.stock_minimo * 2, 1)
      const cantidad = Math.ceil(objetivo - p.stock_actual - (opciones.enCamino.get(p.id) ?? 0))
      return cantidad > 0 ? [{ producto_id: p.id, cantidad, precio_unitario: p.precio_coste }] : []
    })
}

export interface LineaRecepcion {
  producto_id: number
  producto_nombre: string
  unidad: string | null
  pedido: number
  recibido: number
  pendiente: number
  llega: number
  precio_unitario: number
}

// El albarán se propone con todo lo pendiente al precio pedido; se corrige lo que no llegó.
export function lineasRecepcion(
  lineas: readonly (LineaPedida & { producto_nombre: string; unidad: string | null; precio_unitario: number })[],
): LineaRecepcion[] {
  return lineas
    .filter((l) => pendienteDe(l) > 0)
    .map((l) => ({
      producto_id: l.producto_id,
      producto_nombre: l.producto_nombre,
      unidad: l.unidad,
      pedido: l.cantidad,
      recibido: l.recibido,
      pendiente: pendienteDe(l),
      llega: pendienteDe(l),
      precio_unitario: l.precio_unitario,
    }))
}

// Productos que seguirán pendientes después de entrar el albarán, con lo que faltará.
export function quedaPendiente(lineas: readonly LineaRecepcion[]) {
  return lineas.flatMap((l) => {
    const falta = redondear(l.pendiente - l.llega)
    return falta > 0 ? [{ producto_nombre: l.producto_nombre, unidad: l.unidad, falta }] : []
  })
}

export function errorRecepcion(lineas: readonly LineaRecepcion[]): string | null {
  if (lineas.some((l) => !Number.isFinite(l.llega) || l.llega < 0)) return 'Las cantidades no pueden ser negativas'
  if (lineas.some((l) => !Number.isFinite(l.precio_unitario) || l.precio_unitario < 0)) {
    return 'El precio no puede ser negativo'
  }
  if (!lineas.some((l) => l.llega > 0)) return 'Indica qué ha llegado en este albarán'
  return null
}
