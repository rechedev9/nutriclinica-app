import type { Sexo } from '@/types'

// Port exacto de calcGrasaDW (index.html:1407):
// Durnin-Womersley (suma de 4 pliegues) + ecuación de Siri → % grasa.
export function calcGrasaDW(
  plBic: number | null,
  plTri: number | null,
  plSub: number | null,
  plSup: number | null,
  edad: number | null,
  sexo: Sexo | string | null,
): number | null {
  if (plBic == null || plTri == null || plSub == null || plSup == null) return null
  if (edad == null || !sexo || sexo === 'Otro') return null
  const suma = plBic + plTri + plSub + plSup
  if (suma <= 0) return null
  const lg = Math.log10(suma)
  const h = sexo === 'Hombre'
  let D: number
  if (h) {
    if (edad < 20) D = 1.162 - 0.063 * lg
    else if (edad < 30) D = 1.1631 - 0.0632 * lg
    else if (edad < 40) D = 1.1422 - 0.0544 * lg
    else if (edad < 50) D = 1.162 - 0.07 * lg
    else D = 1.1715 - 0.0779 * lg
  } else {
    if (edad < 20) D = 1.1549 - 0.0678 * lg
    else if (edad < 30) D = 1.1599 - 0.0717 * lg
    else if (edad < 40) D = 1.1423 - 0.0632 * lg
    else if (edad < 50) D = 1.1333 - 0.0612 * lg
    else D = 1.1339 - 0.0645 * lg
  }
  return Math.round((4.95 / D - 4.5) * 1000) / 10
}

export interface GrasaClase {
  etiq: string
  bg: string
  color: string
}

// Port exacto de clasificarGrasa (index.html:1430).
export function clasificarGrasa(pct: number | null, sexo: Sexo | string | null): GrasaClase | null {
  if (pct == null || !sexo) return null
  const h = sexo === 'Hombre'
  if (h) {
    if (pct < 8) return { etiq: 'Bajo', bg: '#fef9c3', color: '#a16207' }
    if (pct < 20) return { etiq: 'Saludable', bg: '#dcfce7', color: '#15803d' }
    if (pct < 25) return { etiq: 'Límite', bg: '#fef9c3', color: '#a16207' }
    return { etiq: 'Exceso', bg: '#fee2e2', color: '#b91c1c' }
  }
  if (pct < 21) return { etiq: 'Bajo', bg: '#fef9c3', color: '#a16207' }
  if (pct < 33) return { etiq: 'Saludable', bg: '#dcfce7', color: '#15803d' }
  if (pct < 39) return { etiq: 'Límite', bg: '#fef9c3', color: '#a16207' }
  return { etiq: 'Exceso', bg: '#fee2e2', color: '#b91c1c' }
}
