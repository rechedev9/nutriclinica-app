import { PERIMETROS, PLIEGUES } from '@/types'
import type { ClaveMedida, Revision } from '@/types'

// El cuarto pliegue de calcGrasaDW es el supracrestal. Supraespinal no entra en la fórmula.
export const PLIEGUES_GRASA = ['pl_bicipital', 'pl_tricipital', 'pl_subescapular', 'pl_supracrestal'] as const

export const PERIMETROS_SERIE_INICIAL = ['per_cintura', 'per_caderas', 'per_muslo', 'per_pecho'] as const

const grasa = new Set<ClaveMedida>(PLIEGUES_GRASA)
const serieInicial = new Set<ClaveMedida>(PERIMETROS_SERIE_INICIAL)

export const plieguesVisibles = PLIEGUES.filter((m) => grasa.has(m.key))
export const plieguesPlegados = PLIEGUES.filter((m) => !grasa.has(m.key))
export const perimetrosVisibles = PERIMETROS.filter((m) => serieInicial.has(m.key))
export const perimetrosPlegados = PERIMETROS.filter((m) => !serieInicial.has(m.key))

export const CLAVES_PLEGADAS = [
  'envergadura',
  ...plieguesPlegados.map((m) => m.key),
  ...perimetrosPlegados.map((m) => m.key),
] as const

type Medidas = Partial<Pick<Revision, 'envergadura' | ClaveMedida>>

function tieneMedidasPlegadas(revision: Medidas | null | undefined): boolean {
  if (revision == null) return false
  return CLAVES_PLEGADAS.some((clave) => {
    const valor = revision[clave]
    if (clave === 'envergadura') return valor != null
    return valor != null && valor !== 0
  })
}

export function abrirMasMedidas(origen: { editando?: Medidas | null; anterior?: Medidas | null }): boolean {
  if (origen.editando != null) return tieneMedidasPlegadas(origen.editando)
  return tieneMedidasPlegadas(origen.anterior)
}
