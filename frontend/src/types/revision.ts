import type { Treaty } from '@elysiajs/eden'
import type { servidor } from '@/lib/api/client'

// Tipos derivados de las respuestas del backend (Eden): la fuente de verdad es la API.
export type Revision = Treaty.Data<ReturnType<typeof servidor.pacientes>['revisiones']['get']>[number]

export type RevisionInput = Omit<Revision, 'id' | 'paciente_id'>

// Columnas de medida de una revisión: pliegues (pl_) y perímetros (per_), todas numéricas.
export type ClaveMedida = Extract<keyof Revision, `pl_${string}` | `per_${string}`>

// Definición de medidas (pliegues y perímetros) para formularios y gráficos.
export interface MedidaDef {
  key: ClaveMedida
  label: string
  short: string
  unit: 'mm' | 'cm'
  color: string
  grupo: 'pliegue' | 'perimetro'
}

export const PLIEGUES: MedidaDef[] = [
  { key: 'pl_bicipital', label: 'Pl. Bicipital', short: 'Bicipital', unit: 'mm', color: '#3b82f6', grupo: 'pliegue' },
  {
    key: 'pl_tricipital',
    label: 'Pl. Tricipital',
    short: 'Tricipital',
    unit: 'mm',
    color: '#f97316',
    grupo: 'pliegue',
  },
  {
    key: 'pl_subescapular',
    label: 'Pl. Subescapular',
    short: 'Subescapular',
    unit: 'mm',
    color: '#a855f7',
    grupo: 'pliegue',
  },
  {
    key: 'pl_supraespinal',
    label: 'Pl. Supraespinal',
    short: 'Supraespinal',
    unit: 'mm',
    color: '#22c55e',
    grupo: 'pliegue',
  },
  {
    key: 'pl_supracrestal',
    label: 'Pl. Supracrestal',
    short: 'Supracrestal',
    unit: 'mm',
    color: '#14b8a6',
    grupo: 'pliegue',
  },
  { key: 'pl_abdominal', label: 'Pl. Abdominal', short: 'Abdominal', unit: 'mm', color: '#ec4899', grupo: 'pliegue' },
  { key: 'pl_muslo_int', label: 'Pl. Muslo int.', short: 'Muslo int.', unit: 'mm', color: '#f59e0b', grupo: 'pliegue' },
  {
    key: 'pl_pierna_med',
    label: 'Pl. Pierna med.',
    short: 'Pierna med.',
    unit: 'mm',
    color: '#6366f1',
    grupo: 'pliegue',
  },
]

export const PERIMETROS: MedidaDef[] = [
  {
    key: 'per_antebrazo',
    label: 'Per. Antebrazo',
    short: 'Antebrazo',
    unit: 'cm',
    color: '#0ea5e9',
    grupo: 'perimetro',
  },
  {
    key: 'per_brazo_rel',
    label: 'Per. Brazo relaj.',
    short: 'Brazo relaj.',
    unit: 'cm',
    color: '#8b5cf6',
    grupo: 'perimetro',
  },
  {
    key: 'per_brazo_cont',
    label: 'Per. Brazo cont.',
    short: 'Brazo cont.',
    unit: 'cm',
    color: '#d946ef',
    grupo: 'perimetro',
  },
  { key: 'per_hombros', label: 'Per. Hombros', short: 'Hombros', unit: 'cm', color: '#f43f5e', grupo: 'perimetro' },
  { key: 'per_pecho', label: 'Per. Pecho', short: 'Pecho', unit: 'cm', color: '#10b981', grupo: 'perimetro' },
  { key: 'per_cintura', label: 'Per. Cintura', short: 'Cintura', unit: 'cm', color: '#0f7b92', grupo: 'perimetro' },
  { key: 'per_caderas', label: 'Per. Caderas', short: 'Caderas', unit: 'cm', color: '#f59e0b', grupo: 'perimetro' },
  { key: 'per_muslo', label: 'Per. Muslo', short: 'Muslo', unit: 'cm', color: '#6366f1', grupo: 'perimetro' },
  {
    key: 'per_muslo_cont',
    label: 'Per. Muslo cont.',
    short: 'Muslo cont.',
    unit: 'cm',
    color: '#84cc16',
    grupo: 'perimetro',
  },
  { key: 'per_gemelo', label: 'Per. Gemelo', short: 'Gemelo', unit: 'cm', color: '#ec4899', grupo: 'perimetro' },
]

export const ALL_MEDIDAS: MedidaDef[] = [...PLIEGUES, ...PERIMETROS]
