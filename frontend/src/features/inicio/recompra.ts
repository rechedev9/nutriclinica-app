import { diasDesde } from '@/lib/format/fecha'
import { fechaDeTexto } from './calculos'

// Un intervalo menor no indica un hábito sino dos compras seguidas (p. ej., una para un amigo).
const INTERVALO_MINIMO = 14
// Se avisa unos días antes de que se acabe y se deja de avisar pasado el triple del intervalo:
// a esas alturas el cliente ya no repite y lo recoge la agenda como riesgo de baja.
const DIAS_ANTES = 3
const VECES_INTERVALO = 3

// Días en que un cliente compró un producto (GET /api/inicio/resumen, ya ordenados).
interface Habito {
  paciente_id: number
  paciente_nombre: string
  producto_id: number
  producto_nombre: string
  fechas: string[]
}

export interface ProductoRecompra {
  producto_id: number
  producto_nombre: string
  intervalo: number
  dias: number
}

export interface Recompra {
  paciente_id: number
  paciente_nombre: string
  productos: ProductoRecompra[]
  // Días de más respecto al intervalo habitual del producto que más se ha pasado.
  retraso: number
}

// Cada cuántos días suele comprarlo: la media de los huecos entre compras.
export function intervaloHabitual(fechas: readonly string[]): number | null {
  const primera = fechas.at(0)
  const ultima = fechas.at(-1)
  if (primera === undefined || ultima === undefined || fechas.length < 2) return null
  const total = diasDesde(primera, fechaDeTexto(ultima)) ?? 0
  return Math.max(INTERVALO_MINIMO, Math.round(total / (fechas.length - 1)))
}

function productoATiempo(habito: Habito, hoy: Date): ProductoRecompra | null {
  const intervalo = intervaloHabitual(habito.fechas)
  const dias = diasDesde(habito.fechas.at(-1), hoy)
  if (intervalo === null || dias === null) return null
  if (dias < intervalo - DIAS_ANTES || dias > intervalo * VECES_INTERVALO) return null
  return { producto_id: habito.producto_id, producto_nombre: habito.producto_nombre, intervalo, dias }
}

// Clientes a los que se les está acabando algo que compran con regularidad, uno por cliente
// y del más retrasado al menos.
export function oportunidadesRecompra(habitos: readonly Habito[], hoy: Date): Recompra[] {
  const porCliente = new Map<number, Recompra>()
  for (const habito of habitos) {
    const producto = productoATiempo(habito, hoy)
    if (producto === null) continue
    const retraso = producto.dias - producto.intervalo
    const existente = porCliente.get(habito.paciente_id)
    if (existente === undefined) {
      porCliente.set(habito.paciente_id, {
        paciente_id: habito.paciente_id,
        paciente_nombre: habito.paciente_nombre,
        productos: [producto],
        retraso,
      })
      continue
    }
    existente.productos.push(producto)
    existente.retraso = Math.max(existente.retraso, retraso)
  }
  return [...porCliente.values()]
    .map((r) => ({ ...r, productos: r.productos.toSorted((a, b) => b.dias - b.intervalo - (a.dias - a.intervalo)) }))
    .toSorted((a, b) => b.retraso - a.retraso || a.paciente_nombre.localeCompare(b.paciente_nombre, 'es'))
}
