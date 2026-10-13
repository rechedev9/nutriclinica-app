import type { Paciente, PacienteInput } from '@/types'

type Campo =
  | 'fecha_nac'
  | 'sexo'
  | 'dni'
  | 'grupo_sanguineo'
  | 'telefono'
  | 'email'
  | 'peso'
  | 'talla'
  | 'objetivo'
  | 'actividad_fisica'
  | 'intolerancias'
  | 'patologias'

const ETIQUETAS: readonly { campo: Campo; etiqueta: string }[] = [
  { campo: 'dni', etiqueta: 'DNI / NIF' },
  { campo: 'sexo', etiqueta: 'sexo' },
  { campo: 'fecha_nac', etiqueta: 'fecha de nacimiento' },
  { campo: 'grupo_sanguineo', etiqueta: 'grupo sanguíneo' },
  { campo: 'telefono', etiqueta: 'teléfono' },
  { campo: 'email', etiqueta: 'email' },
  { campo: 'peso', etiqueta: 'peso inicial' },
  { campo: 'talla', etiqueta: 'talla' },
  { campo: 'objetivo', etiqueta: 'objetivo' },
  { campo: 'actividad_fisica', etiqueta: 'actividad física' },
  { campo: 'intolerancias', etiqueta: 'intolerancias' },
  { campo: 'patologias', etiqueta: 'patologías' },
]

function vacio(valor: string | number | null | undefined): boolean {
  if (valor === null || valor === undefined) return true
  return typeof valor === 'string' && valor.trim() === ''
}

export function camposSinRellenar(p: Pick<Paciente, Campo>): string[] {
  return ETIQUETAS.filter(({ campo }) => vacio(p[campo])).map(({ etiqueta }) => etiqueta)
}

export function cuerpoConConsentimiento(p: Paciente): PacienteInput {
  return {
    nombre: p.nombre,
    fecha_nac: p.fecha_nac,
    sexo: p.sexo,
    grupo_sanguineo: p.grupo_sanguineo,
    dni: p.dni,
    telefono: p.telefono,
    email: p.email,
    peso: p.peso,
    talla: p.talla,
    objetivo: p.objetivo,
    actividad_fisica: p.actividad_fisica,
    intolerancias: p.intolerancias,
    patologias: p.patologias,
    notas: p.notas,
    consentimiento: 1,
  }
}
