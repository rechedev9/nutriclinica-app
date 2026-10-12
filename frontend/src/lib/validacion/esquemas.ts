import { z } from 'zod'
import { PLIEGUES, PERIMETROS } from '@/types'

// Los formularios trabajan con cadenas; un campo vacío siempre es válido (opcional).

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

export function fechaLocal(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function esFechaReal(s: string): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s)
  if (!m) return false
  const [, a = '', me = '', d = ''] = m
  const f = new Date(Number(a), Number(me) - 1, Number(d))
  return f.getFullYear() === Number(a) && f.getMonth() === Number(me) - 1 && f.getDate() === Number(d)
}

export function numeroEnRango(min: number, max: number, mensaje: string, exclusivoMin = false) {
  return z.string().refine((s) => {
    if (s.trim() === '') return true
    const n = Number(s)
    if (!Number.isFinite(n)) return false
    return (exclusivoMin ? n > min : n >= min) && n <= max
  }, mensaje)
}

const nombreObligatorio = z.string().trim().min(1, 'Obligatorio')

const fechaNacimiento = z.string().refine((s) => {
  if (s.trim() === '') return true
  return esFechaReal(s) && s >= '1900-01-01' && s <= fechaLocal(new Date())
}, 'La fecha de nacimiento no es válida')

export const esquemaPaciente = z.object({
  nombre: nombreObligatorio,
  fecha_nac: fechaNacimiento,
  sexo: z.string(),
  grupo_sanguineo: z.string(),
  dni: z.string(),
  telefono: z.string(),
  email: z.string(),
  peso: numeroEnRango(1, 500, 'El peso debe estar entre 1 y 500 kg'),
  talla: numeroEnRango(30, 260, 'La talla debe estar entre 30 y 260 cm'),
  objetivo: z.string(),
  actividad_fisica: z.string(),
  intolerancias: z.string(),
  patologias: z.string(),
  notas: z.string(),
  consentimiento: z.boolean(),
})

const MSG_PLIEGUES = 'Los pliegues deben estar entre 0 y 100 mm'
const MSG_PERIMETROS = 'Los perímetros deben estar entre 0 y 300 cm'

const CLAVES_MEDIDA = ['peso', 'envergadura', ...PLIEGUES.map((m) => m.key), ...PERIMETROS.map((m) => m.key)]

export function esquemaRevision() {
  const forma: Record<string, z.ZodTypeAny> = {
    fecha: z
      .string()
      .min(1, 'Obligatorio')
      .refine((s) => {
        if (s === '') return true
        const manana = new Date()
        manana.setDate(manana.getDate() + 1)
        return esFechaReal(s) && s <= fechaLocal(manana)
      }, 'La fecha de la revisión no puede ser futura'),
    peso: numeroEnRango(1, 500, 'El peso debe estar entre 1 y 500 kg'),
    envergadura: numeroEnRango(30, 300, 'La envergadura debe estar entre 30 y 300 cm'),
    notas: z.string(),
  }
  for (const m of PLIEGUES) forma[m.key] = numeroEnRango(0, 100, MSG_PLIEGUES, true)
  for (const m of PERIMETROS) forma[m.key] = numeroEnRango(0, 300, MSG_PERIMETROS, true)
  return z.object(forma).superRefine((v, ctx) => {
    const hayMedida = CLAVES_MEDIDA.some((k) => {
      const x = v[k]
      return typeof x === 'string' && x.trim() !== ''
    })
    const hayNota = typeof v.notas === 'string' && v.notas.trim() !== ''
    if (!hayMedida && !hayNota) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['notas'],
        message: 'La revisión debe incluir al menos una medida o una nota',
      })
    }
  })
}

// Producto: precios y stock mínimo no negativos.
export const esquemaProducto = z.object({
  nombre: nombreObligatorio,
  categoria_id: z.string(),
  proveedor_id: z.string(),
  precio_coste: numeroEnRango(0, Number.MAX_SAFE_INTEGER, 'El precio no puede ser negativo'),
  precio_venta: numeroEnRango(0, Number.MAX_SAFE_INTEGER, 'El precio no puede ser negativo'),
  unidad: z.string(),
  stock_minimo: numeroEnRango(0, Number.MAX_SAFE_INTEGER, 'El stock mínimo no puede ser negativo'),
})

export const esquemaNombre = z.object({ nombre: nombreObligatorio })

export const esquemaProveedor = z.object({
  nombre: nombreObligatorio,
  telefono: z.string(),
  email: z.string(),
  notas: z.string(),
})
