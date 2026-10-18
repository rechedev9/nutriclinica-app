// Los importes se guardan en euros con dos decimales; las cuentas internas se hacen en céntimos.

export function aCentimos(importe: number): number {
  return Math.round(importe * 100)
}

export function aEuros(centimos: number): number {
  return centimos / 100
}

function redondear(importe: number): number {
  return aEuros(aCentimos(importe))
}

// «12,50 €», para los mensajes de error.
export function euros(importe: number): string {
  return `${redondear(importe).toFixed(2).replace('.', ',')} €`
}

// Reparte `centimos` en proporción a `pesos` por el método del resto mayor: la suma es exacta.
export function repartir(centimos: number, pesos: number[]): number[] {
  const base = pesos.reduce((suma, p) => suma + p, 0)
  if (base <= 0) return pesos.map(() => 0)
  const partes = pesos.map((p, i) => ({ i, entero: Math.floor((centimos * p) / base), resto: (centimos * p) % base }))
  let sobrante = centimos - partes.reduce((suma, p) => suma + p.entero, 0)
  const resultado = partes.map((p) => p.entero)
  for (const parte of partes.toSorted((a, b) => b.resto - a.resto || a.i - b.i)) {
    if (sobrante <= 0) break
    resultado[parte.i] = parte.entero + 1
    sobrante -= 1
  }
  return resultado
}
