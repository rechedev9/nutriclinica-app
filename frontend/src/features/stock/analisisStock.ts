interface LineaConProducto {
  producto_id: number
  cantidad: number
  precio_unitario: number
}

interface ConFechaYLineas {
  fecha: string | null
  lineas: LineaConProducto[]
}

interface ProductoConCoste {
  id: number
  precio_coste: number
  stock_actual: number
}

export interface MargenVendido {
  margen: number
  ingresos: number
  lineasSinCoste: number
}

// Coste por producto: el actual del almacén y, si no está, el de su última compra.
export function costesPorProducto({
  almacen,
  compras,
}: {
  almacen: ProductoConCoste[]
  compras: ConFechaYLineas[]
}): Map<number, number> {
  const costes = new Map<number, number>()
  const ordenadas = compras.toSorted((a, b) => (a.fecha ?? '').localeCompare(b.fecha ?? ''))
  for (const c of ordenadas) {
    for (const l of c.lineas) costes.set(l.producto_id, l.precio_unitario)
  }
  for (const p of almacen) {
    if (p.precio_coste > 0) costes.set(p.id, p.precio_coste)
  }
  return costes
}

// Suma por línea vendida de (precio de venta menos coste) por cantidad.
export function margenDeLoVendido({
  ventas,
  costes,
}: {
  ventas: ConFechaYLineas[]
  costes: Map<number, number>
}): MargenVendido {
  let margen = 0
  let ingresos = 0
  let lineasSinCoste = 0
  for (const v of ventas) {
    for (const l of v.lineas) {
      const coste = costes.get(l.producto_id)
      if (coste === undefined) {
        lineasSinCoste += 1
        continue
      }
      margen += (l.precio_unitario - coste) * l.cantidad
      ingresos += l.precio_unitario * l.cantidad
    }
  }
  return { margen, ingresos, lineasSinCoste }
}

// Valor del género que sigue en el almacén, a coste.
export function valorAlmacen(almacen: ProductoConCoste[]): number {
  return almacen.reduce((suma, p) => suma + Math.max(p.stock_actual, 0) * p.precio_coste, 0)
}

export function flujoDeCaja({ ingresos, gastos }: { ingresos: number; gastos: number }): number {
  return ingresos - gastos
}

export function porcentaje({ parte, total }: { parte: number; total: number }): number | null {
  return total > 0 ? (parte / total) * 100 : null
}

// Importe compacto para los ejes: 850 €, 1,2 k €, 3 M €.
export function monedaCompacta(n: number): string {
  const abs = Math.abs(n)
  const signo = n < 0 ? '-' : ''
  if (abs >= 1_000_000) return `${signo}${corto(abs / 1_000_000)} M €`
  if (abs >= 1000) return `${signo}${corto(abs / 1000)} k €`
  return `${signo}${corto(abs)} €`
}

export function clavesMes({ hasta, cantidad }: { hasta: Date; cantidad: number }): string[] {
  return Array.from({ length: cantidad }, (_, i) => {
    const d = new Date(hasta.getFullYear(), hasta.getMonth() - (cantidad - 1 - i), 1)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })
}

// Últimos 12 meses sin los vacíos del principio; deja al menos 6 para que el gráfico no parezca roto.
export function mesesPorDefecto({ hoy, conActividad }: { hoy: Date; conActividad: ReadonlySet<string> }): string[] {
  const todos = clavesMes({ hasta: hoy, cantidad: 12 })
  const primero = todos.findIndex((m) => conActividad.has(m))
  const inicio = primero === -1 ? 6 : Math.min(primero, 6)
  return todos.slice(inicio)
}

function corto(x: number): string {
  return String(Math.round(x * 10) / 10).replace('.', ',')
}
