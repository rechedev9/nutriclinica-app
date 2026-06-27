// Composición corporal a partir del peso y el % de grasa.
// peso magro = peso * (1 - %grasa/100); peso graso = peso * %grasa/100.

export function pesoGraso(peso: number | null, pctGrasa: number | null): number | null {
  if (peso == null || pctGrasa == null) return null
  return Math.round(peso * (pctGrasa / 100) * 10) / 10
}

export function pesoMagro(peso: number | null, pctGrasa: number | null): number | null {
  if (peso == null || pctGrasa == null) return null
  return Math.round(peso * (1 - pctGrasa / 100) * 10) / 10
}
