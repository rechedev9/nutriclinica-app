import type { Treaty } from '@elysiajs/eden'
import type { servidor } from '@/lib/api/client'

// Tipos derivados de las respuestas del backend (Eden): la fuente de verdad es la API.
export type Paciente = Treaty.Data<typeof servidor.pacientes.get>[number]

export type Sexo = 'Hombre' | 'Mujer' | 'Otro'

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
