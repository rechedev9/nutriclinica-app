export type Sexo = 'Hombre' | 'Mujer' | 'Otro'

export interface Paciente {
  id: number
  nombre: string
  fecha_nac: string | null
  sexo: Sexo | null
  dni: string | null
  telefono: string | null
  email: string | null
  objetivo: string | null
  actividad_fisica: string | null
  intolerancias: string | null
  patologias: string | null
  notas: string | null
  peso: number | null
  talla: number | null
  grupo_sanguineo: string | null
  creado: string | null
  consentimiento: number
  consentimiento_fecha: string | null
  num_fotos: number
  num_revisiones: number
}

export interface PacienteInput {
  nombre: string
  fecha_nac?: string | null
  sexo?: string | null
  dni?: string | null
  telefono?: string | null
  email?: string | null
  objetivo?: string | null
  actividad_fisica?: string | null
  intolerancias?: string | null
  patologias?: string | null
  notas?: string | null
  peso?: number | null
  talla?: number | null
  grupo_sanguineo?: string | null
  consentimiento?: number
}
