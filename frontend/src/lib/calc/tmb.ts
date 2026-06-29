import type { Sexo } from '@/types'

// Mifflin-St Jeor (1990) — más precisa que Harris-Benedict original.
// Hombre: 10×peso + 6.25×talla − 5×edad + 5
// Mujer:  10×peso + 6.25×talla − 5×edad − 161
// Resultado en kcal/día.
export function calcTMB(
  peso: number | null,
  talla: number | null,
  edad: number | null,
  sexo: Sexo | string | null,
): number | null {
  if (peso == null || talla == null || edad == null || !sexo || sexo === 'Otro') return null
  const base = 10 * peso + 6.25 * talla - 5 * edad
  return Math.round(base + (sexo === 'Hombre' ? 5 : -161))
}
