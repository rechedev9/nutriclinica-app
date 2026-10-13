// Selección del último dato disponible de una serie de revisiones (orden ascendente por fecha).
// Una revisión puede no traer pliegues o peso: en vez de un hueco se usa el dato más reciente que exista.

interface ConFecha {
  readonly fecha?: string | null | undefined
}

export interface Punto<T> {
  valor: T
  fecha: string | null
  // Posición de la revisión dentro de la lista recibida.
  indice: number
}

export interface ResumenSerie {
  primero: Punto<number> | null
  anterior: Punto<number> | null
  ultimo: Punto<number> | null
}

function puntosDisponibles<R extends ConFecha, T>(
  revisiones: readonly R[],
  extraer: (revision: R) => T | null | undefined,
): Punto<T>[] {
  const puntos: Punto<T>[] = []
  revisiones.forEach((revision, indice) => {
    const valor = extraer(revision)
    if (valor != null) puntos.push({ valor, fecha: revision.fecha ?? null, indice })
  })
  return puntos
}

export function ultimoDato<R extends ConFecha, T>(
  revisiones: readonly R[],
  extraer: (revision: R) => T | null | undefined,
): Punto<T> | null {
  return puntosDisponibles(revisiones, extraer).at(-1) ?? null
}

// Primer dato, penúltimo y último de una métrica numérica, saltando las revisiones donde falta.
export function resumirSerie<R extends ConFecha>(
  revisiones: readonly R[],
  extraer: (revision: R) => number | null | undefined,
): ResumenSerie {
  const puntos = puntosDisponibles(revisiones, extraer)
  return {
    primero: puntos[0] ?? null,
    anterior: puntos.length >= 2 ? (puntos.at(-2) ?? null) : null,
    ultimo: puntos.at(-1) ?? null,
  }
}

export function esDeLaUltimaRevision(punto: Punto<unknown>, totalRevisiones: number): boolean {
  return punto.indice === totalRevisiones - 1
}

// Diferencia redondeada a un decimal; null si falta un extremo o ambos son la misma revisión.
export function variacion(desde: Punto<number> | null, hasta: Punto<number> | null): number | null {
  if (desde === null || hasta === null || desde.indice === hasta.indice) return null
  return Math.round((hasta.valor - desde.valor) * 10) / 10
}

export function fmtVariacion(delta: number | null): string {
  if (delta === null) return '-'
  if (delta === 0) return '0.0'
  return delta > 0 ? `+${delta.toFixed(1)}` : delta.toFixed(1)
}

export function fmtValor(valor: number | null, decimales = 1): string {
  return valor === null ? '-' : valor.toFixed(decimales)
}
