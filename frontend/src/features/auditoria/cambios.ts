import { fmtFecha } from '@/lib/format/fecha'

export type ValorCambio = string | number | null

export interface CambioCampo {
  campo: string
  antes: ValorCambio
  despues: ValorCambio
}

interface Etiqueta {
  nombre: string
  unidad?: string
  tipo?: 'fecha' | 'si-no'
}

const PLIEGUES: [string, string][] = [
  ['pl_bicipital', 'Pliegue bicipital'],
  ['pl_tricipital', 'Pliegue tricipital'],
  ['pl_subescapular', 'Pliegue subescapular'],
  ['pl_supraespinal', 'Pliegue supraespinal'],
  ['pl_supracrestal', 'Pliegue supracrestal'],
  ['pl_abdominal', 'Pliegue abdominal'],
  ['pl_muslo_int', 'Pliegue de muslo interno'],
  ['pl_pierna_med', 'Pliegue de pierna medial'],
]

const PERIMETROS: [string, string][] = [
  ['per_antebrazo', 'Perímetro de antebrazo'],
  ['per_brazo_rel', 'Perímetro de brazo relajado'],
  ['per_brazo_cont', 'Perímetro de brazo contraído'],
  ['per_hombros', 'Perímetro de hombros'],
  ['per_pecho', 'Perímetro de pecho'],
  ['per_cintura', 'Perímetro de cintura'],
  ['per_caderas', 'Perímetro de caderas'],
  ['per_muslo', 'Perímetro de muslo'],
  ['per_muslo_cont', 'Perímetro de muslo contraído'],
  ['per_gemelo', 'Perímetro de gemelo'],
]

// Campos de la ficha del cliente y de las revisiones, con el nombre que ve quien revisa.
const ETIQUETAS_CAMPO: Record<string, Etiqueta> = {
  nombre: { nombre: 'Nombre' },
  fecha_nac: { nombre: 'Fecha de nacimiento', tipo: 'fecha' },
  sexo: { nombre: 'Sexo' },
  dni: { nombre: 'DNI / NIF' },
  telefono: { nombre: 'Teléfono' },
  email: { nombre: 'Email' },
  objetivo: { nombre: 'Objetivo' },
  actividad_fisica: { nombre: 'Actividad física' },
  intolerancias: { nombre: 'Intolerancias / alergias' },
  patologias: { nombre: 'Patologías' },
  notas: { nombre: 'Notas' },
  peso: { nombre: 'Peso', unidad: 'kg' },
  talla: { nombre: 'Talla', unidad: 'cm' },
  envergadura: { nombre: 'Envergadura', unidad: 'cm' },
  grupo_sanguineo: { nombre: 'Grupo sanguíneo' },
  consentimiento: { nombre: 'Consentimiento RGPD', tipo: 'si-no' },
  consentimiento_fecha: { nombre: 'Fecha del consentimiento', tipo: 'fecha' },
  fecha: { nombre: 'Fecha', tipo: 'fecha' },
  ...Object.fromEntries(PLIEGUES.map(([clave, nombre]) => [clave, { nombre, unidad: 'mm' }])),
  ...Object.fromEntries(PERIMETROS.map(([clave, nombre]) => [clave, { nombre, unidad: 'cm' }])),
}

const MAX_TEXTO = 60

export function etiquetaCampo(campo: string): string {
  return ETIQUETAS_CAMPO[campo]?.nombre ?? campo
}

// formatearValor escribe un valor como lo leería una persona: coma decimal, unidad y «sin dato» si falta.
export function formatearValor(campo: string, valor: ValorCambio): string {
  if (valor === null || valor === '') return 'sin dato'
  const etiqueta = ETIQUETAS_CAMPO[campo]
  if (etiqueta?.tipo === 'si-no') return valor === 1 || valor === '1' ? 'Sí' : 'No'
  if (etiqueta?.tipo === 'fecha' && typeof valor === 'string') return fmtFecha(valor)
  if (typeof valor === 'number') {
    const texto = String(valor).replace('.', ',')
    return etiqueta?.unidad ? `${texto} ${etiqueta.unidad}` : texto
  }
  return valor.length > MAX_TEXTO ? `${valor.slice(0, MAX_TEXTO).trimEnd()}…` : valor
}

// describirCambio: «Peso: 78,5 kg → 77,9 kg».
export function describirCambio(cambio: CambioCampo): string {
  const { campo, antes, despues } = cambio
  return `${etiquetaCampo(campo)}: ${formatearValor(campo, antes)} → ${formatearValor(campo, despues)}`
}
