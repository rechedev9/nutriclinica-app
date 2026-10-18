import { normaliza } from '@/lib/format/texto'
import { sumarImportes } from './carrito'
import type { MetodoPago, SituacionVenta, Venta } from '@/types'

export interface FiltroVentas {
  desde: string
  hasta: string
  // '' = todos, 'sin' = ventas sin cliente, o el id del cliente.
  cliente: string
  metodo: MetodoPago | 'sin_indicar' | ''
  situacion: SituacionVenta | ''
  texto: string
}

export const SIN_FILTRO: FiltroVentas = { desde: '', hasta: '', cliente: '', metodo: '', situacion: '', texto: '' }

// El número de ticket se busca sin ceros ni guion: «123», «V-123» y «V-000123» encuentran la misma venta.
function numeroBuscado(texto: string): number | null {
  const m = /^v?-?0*(\d+)$/i.exec(texto.trim())
  return m?.[1] === undefined ? null : Number(m[1])
}

function coincideTexto(venta: Venta, texto: string): boolean {
  if (texto.trim() === '') return true
  // Un número se toma como ticket: «9» no debe sacar también los productos de «90 cápsulas».
  const numero = numeroBuscado(texto)
  if (numero !== null) return venta.id === numero
  const buscado = normaliza(texto)
  if (normaliza(venta.paciente_nombre ?? '').includes(buscado)) return true
  return venta.lineas.some((l) => normaliza(l.producto_nombre).includes(buscado))
}

export function filtrarVentas(ventas: readonly Venta[], filtro: FiltroVentas): Venta[] {
  return ventas.filter((v) => {
    const fecha = v.fecha ?? ''
    if (filtro.desde !== '' && fecha < filtro.desde) return false
    if (filtro.hasta !== '' && fecha > filtro.hasta) return false
    if (filtro.cliente === 'sin' && v.paciente_id !== null) return false
    if (filtro.cliente !== '' && filtro.cliente !== 'sin' && v.paciente_id !== Number(filtro.cliente)) return false
    if (filtro.metodo === 'sin_indicar' && v.pagos.length > 0) return false
    if (filtro.metodo !== '' && filtro.metodo !== 'sin_indicar' && !v.pagos.some((p) => p.metodo === filtro.metodo)) {
      return false
    }
    if (filtro.situacion !== '' && v.situacion !== filtro.situacion) return false
    return coincideTexto(v, filtro.texto)
  })
}

// Cifras de un conjunto de ventas: las anuladas no suman y lo devuelto se resta.
export function resumenVentas(ventas: readonly Venta[]) {
  const validas = ventas.filter((v) => v.estado !== 'anulada')
  const anuladas = ventas.filter((v) => v.estado === 'anulada')
  const devuelto = sumarImportes(validas.map((v) => v.total_devuelto))
  return {
    num_ventas: validas.length,
    vendido: sumarImportes(validas.map((v) => v.total)),
    devuelto,
    neto: sumarImportes([...validas.map((v) => v.total), -devuelto]),
    num_anuladas: anuladas.length,
  }
}
