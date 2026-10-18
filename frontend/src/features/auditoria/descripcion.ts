import { diasDesde, fmtFechaCorta } from '@/lib/format/fecha'

// Traduce lo que guarda el registro (método y ruta de la API) a un texto que entiende quien lo revisa.

export type TipoAccion = 'alta' | 'edicion' | 'borrado' | 'exportacion' | 'sesion'

export const ETIQUETA_ACCION: Record<TipoAccion, string> = {
  alta: 'Alta',
  edicion: 'Edición',
  borrado: 'Borrado',
  exportacion: 'Exportación',
  sesion: 'Sesión',
}

// Colores de la etiqueta de cada tipo de acción, con tokens del tema.
export const COLOR_ACCION: Record<TipoAccion, string> = {
  alta: 'bg-success/10 text-success',
  edicion: 'bg-primary-light text-primary',
  borrado: 'bg-danger/10 text-danger',
  exportacion: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  sesion: 'bg-surface-2 text-ink-muted',
}

const TIPOS: Record<string, TipoAccion> = {
  POST: 'alta',
  PUT: 'edicion',
  DELETE: 'borrado',
  GET: 'exportacion',
  Acceso: 'sesion',
  Salida: 'sesion',
}

// El id de la ruta es de un paciente («paciente») o del propio recurso («propio»).
type Regla = [patron: RegExp, recurso: string, id?: 'paciente' | 'propio']

const REGLAS: Regla[] = [
  [/^\/api\/login$/, 'Inicio de sesión'],
  [/^\/api\/logout$/, 'Cierre de sesión'],
  [/^\/api\/me\/password$/, 'Contraseña propia'],
  [/^\/api\/pacientes$/, 'Ficha de cliente'],
  [/^\/api\/pacientes\/(\d+)$/, 'Ficha', 'paciente'],
  [/^\/api\/pacientes\/(\d+)\/revisiones$/, 'Revisión', 'paciente'],
  [/^\/api\/pacientes\/(\d+)\/fotos$/, 'Fotos', 'paciente'],
  [/^\/api\/revisiones\/(\d+)$/, 'Revisión', 'propio'],
  [/^\/api\/fotos\/(\d+)$/, 'Foto', 'propio'],
  [/^\/api\/exportar-excel$/, 'Excel de clientes'],
  [/^\/api\/exportar-revision\/(\d+)$/, 'Excel de la revisión', 'propio'],
  [/^\/api\/stock\/productos(?:\/(\d+))?$/, 'Producto', 'propio'],
  [/^\/api\/stock\/categorias(?:\/(\d+))?$/, 'Categoría', 'propio'],
  [/^\/api\/stock\/proveedores(?:\/(\d+))?$/, 'Proveedor', 'propio'],
  [/^\/api\/stock\/compras(?:\/(\d+))?$/, 'Compra', 'propio'],
  [/^\/api\/stock\/ventas(?:\/(\d+))?$/, 'Venta', 'propio'],
  [/^\/api\/stock\/mermas(?:\/(\d+))?$/, 'Merma', 'propio'],
  [/^\/api\/stock\/recuentos$/, 'Recuento de inventario'],
  [/^\/api\/ventas\/(\d+)\/anular$/, 'Anulación de la venta', 'propio'],
  [/^\/api\/ventas\/(\d+)\/devoluciones$/, 'Devolución de la venta', 'propio'],
  [/^\/api\/ventas(?:\/(\d+))?$/, 'Venta', 'propio'],
  [/^\/api\/caja\/cierres(?:\/(\d+))?$/, 'Cierre de caja', 'propio'],
  [/^\/api\/tienda$/, 'Datos del ticket'],
  [/^\/api\/usuarios\/(\d+)\/password$/, 'Contraseña del usuario', 'propio'],
  [/^\/api\/usuarios(?:\/(\d+))?$/, 'Usuario', 'propio'],
]

export function tipoAccion(metodo: string, ruta: string): TipoAccion | null {
  // Cambiar una contraseña llega como POST, pero modifica un usuario que ya existe.
  if (metodo === 'POST' && ruta.endsWith('/password')) return 'edicion'
  // Anular una venta llega como POST, pero la deja sin efecto.
  if (metodo === 'POST' && ruta.endsWith('/anular')) return 'borrado'
  return TIPOS[metodo] ?? null
}

// describirRuta devuelve el recurso afectado y, si la ruta lo lleva, el paciente al que pertenece.
export function describirRuta(ruta: string): { recurso: string; pacienteId: number | null } {
  for (const [patron, recurso, id] of REGLAS) {
    const coincide = patron.exec(ruta)
    if (!coincide) continue
    const numero = coincide[1]
    if (numero === undefined) return { recurso, pacienteId: null }
    if (id === 'paciente') return { recurso, pacienteId: Number(numero) }
    return { recurso: `${recurso} nº ${numero}`, pacienteId: null }
  }
  return { recurso: ruta, pacienteId: null }
}

const MOTIVOS: Record<number, string> = {
  400: 'datos no válidos',
  401: 'sin sesión',
  403: 'sin permiso',
  404: 'no encontrado',
  409: 'operación no permitida',
  429: 'demasiados intentos',
}

// describirEstado devuelve null si la operación se completó y el motivo si se rechazó.
export function describirEstado(estado: number, ruta: string): string | null {
  if (estado < 400) return null
  if (estado === 401 && ruta === '/api/login') return 'credenciales incorrectas'
  return MOTIVOS[estado] ?? (estado >= 500 ? 'error del servidor' : `error ${estado}`)
}

// «Hoy · 12 oct 2026», «Ayer · ...» o la fecha corta; dia es AAAA-MM-DD.
export function tituloDia(dia: string): string {
  // Con hora local, para que el día no cambie según la zona horaria.
  const fecha = fmtFechaCorta(`${dia}T00:00`)
  const dias = diasDesde(dia)
  if (dias === 0) return `Hoy · ${fecha}`
  if (dias === 1) return `Ayer · ${fecha}`
  return fecha
}

// agruparPorDia conserva el orden de entrada; las entradas sin fecha van bajo la clave vacía.
export function agruparPorDia<T extends { fecha: string | null }>(entradas: readonly T[]): Map<string, T[]> {
  const grupos = new Map<string, T[]>()
  for (const e of entradas) {
    const dia = e.fecha?.slice(0, 10) ?? ''
    const filas = grupos.get(dia)
    if (filas) filas.push(e)
    else grupos.set(dia, [e])
  }
  return grupos
}

// El resumen guarda las fechas como AAAA-MM-DD: se muestran como DD/MM/AAAA.
export function resumenLegible(resumen: string): string {
  return resumen.replace(/\b(\d{4})-(\d{2})-(\d{2})\b/g, '$3/$2/$1')
}

// nombreRecurso: el recurso de la ruta sin su número, para listas que ya son de un cliente.
export function nombreRecurso(ruta: string): string {
  return describirRuta(ruta).recurso.replace(/ nº \d+$/, '')
}
