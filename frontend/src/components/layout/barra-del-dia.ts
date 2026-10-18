import type { LinkProps } from '@tanstack/react-router'

export type GrupoPestana = 'dia' | 'resto'

export interface Pestana {
  to: NonNullable<LinkProps['to']>
  label: string
  grupo: GrupoPestana
}

export const PESTANAS_TIENDA = [
  { to: '/stock/almacen', label: 'Almacén', grupo: 'dia' },
  { to: '/stock/pedidos', label: 'Pedidos', grupo: 'dia' },
  { to: '/stock/categorias', label: 'Categorías', grupo: 'resto' },
  { to: '/stock/proveedores', label: 'Proveedores', grupo: 'resto' },
  { to: '/stock/compras', label: 'Compras', grupo: 'dia' },
  { to: '/stock/mermas', label: 'Mermas', grupo: 'resto' },
  { to: '/stock/recuentos', label: 'Recuentos', grupo: 'resto' },
  { to: '/stock/analisis', label: 'Análisis', grupo: 'resto' },
] as const satisfies readonly Pestana[]

export const PESTANAS_VENTAS = [
  { to: '/ventas/caja', label: 'Caja', grupo: 'dia' },
  { to: '/ventas/historial', label: 'Historial', grupo: 'dia' },
  { to: '/ventas/cierre', label: 'Cierre de caja', grupo: 'dia' },
  { to: '/ventas/estadisticas', label: 'Estadísticas', grupo: 'resto' },
  { to: '/ventas/ticket', label: 'Datos del ticket', grupo: 'resto' },
] as const satisfies readonly Pestana[]

export function delDia<T extends { grupo: GrupoPestana }>(pestanas: readonly T[]): T[] {
  return pestanas.filter((p) => p.grupo === 'dia')
}

export function elResto<T extends { grupo: GrupoPestana }>(pestanas: readonly T[]): T[] {
  return pestanas.filter((p) => p.grupo === 'resto')
}

export function etiquetaMas(resto: readonly { to: string; label: string }[], ruta: string): string {
  return resto.find((p) => p.to === ruta)?.label ?? 'Más'
}
