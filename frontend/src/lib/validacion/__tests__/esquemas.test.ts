import { describe, expect, it } from 'bun:test'
import { PLIEGUES, PERIMETROS } from '@/types'
import { errorLineas } from '../lineas'
import { esquemaPaciente, esquemaProducto, esquemaRevision } from '../esquemas'

const paciente = {
  nombre: 'Ana',
  fecha_nac: '',
  sexo: '',
  grupo_sanguineo: '',
  dni: '',
  telefono: '',
  email: '',
  peso: '',
  talla: '',
  objetivo: '',
  actividad_fisica: '',
  intolerancias: '',
  patologias: '',
  notas: '',
  consentimiento: false,
}

function mensajes(r: { success: boolean; error?: { issues: { message: string }[] } }): string[] {
  return r.error ? r.error.issues.map((i) => i.message) : []
}

describe('esquemaPaciente', () => {
  it('acepta campos opcionales vacíos', () => {
    expect(esquemaPaciente.safeParse(paciente).success).toBe(true)
  })
  it('rechaza nombre con solo espacios', () => {
    expect(esquemaPaciente.safeParse({ ...paciente, nombre: '   ' }).success).toBe(false)
  })
  it('valida peso, talla y fecha de nacimiento', () => {
    const r = esquemaPaciente.safeParse({ ...paciente, peso: '0', talla: '20', fecha_nac: '2999-01-01' })
    expect(mensajes(r)).toEqual([
      'La fecha de nacimiento no es válida',
      'El peso debe estar entre 1 y 500 kg',
      'La talla debe estar entre 30 y 260 cm',
    ])
  })
})

describe('esquemaRevision', () => {
  const vacias = Object.fromEntries([...PLIEGUES, ...PERIMETROS].map((m) => [m.key, '']))
  const base: Record<string, string> = { ...vacias, fecha: '2024-01-10', peso: '', envergadura: '', notas: '' }
  it('exige al menos una medida o una nota', () => {
    expect(mensajes(esquemaRevision().safeParse(base))).toEqual([
      'La revisión debe incluir al menos una medida o una nota',
    ])
    expect(esquemaRevision().safeParse({ ...base, notas: 'ok' }).success).toBe(true)
  })
  it('exige fecha y rechaza pliegues fuera de rango', () => {
    const r = esquemaRevision().safeParse({ ...base, fecha: '', pl_bicipital: '0', notas: 'x' })
    expect(mensajes(r)).toEqual(['Obligatorio', 'Los pliegues deben estar entre 0 y 100 mm'])
  })
})

describe('esquemaProducto', () => {
  it('rechaza precios negativos', () => {
    const r = esquemaProducto.safeParse({
      nombre: 'x',
      categoria_id: '',
      proveedor_id: '',
      precio_coste: '-1',
      precio_venta: '',
      unidad: 'ud',
      stock_minimo: '-2',
    })
    expect(mensajes(r)).toEqual(['El precio no puede ser negativo', 'El stock mínimo no puede ser negativo'])
  })
})

describe('errorLineas', () => {
  it('exige una línea con producto, cantidad > 0 y respeta el stock', () => {
    expect(errorLineas([{ producto_id: 0, cantidad: 1 }])).toBe('Añade al menos una línea con producto')
    expect(errorLineas([{ producto_id: 1, cantidad: 0 }])).toBe('La cantidad debe ser mayor que 0')
    expect(errorLineas([{ producto_id: 1, cantidad: 1, precio_unitario: -1 }])).toBe(
      'El precio no puede ser negativo',
    )
    const stock = new Map([[1, 3]])
    expect(errorLineas([{ producto_id: 1, cantidad: 2 }, { producto_id: 1, cantidad: 2 }], stock)).toBe(
      'Supera el stock disponible (3)',
    )
    expect(errorLineas([{ producto_id: 1, cantidad: 3 }], stock)).toBeNull()
  })
})
