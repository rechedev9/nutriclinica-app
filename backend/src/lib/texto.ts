// vacioANulo convierte undefined, null y cadenas en blanco en null.
export function vacioANulo(valor: string | null | undefined): string | null {
  if (valor === null || valor === undefined || valor.trim() === '') return null
  return valor
}

const comparador = new Intl.Collator('es', { sensitivity: 'base' })

// porNombre ordena alfabéticamente en español (sin distinguir acentos ni mayúsculas).
export function porNombre<T>(filas: T[], nombre: (fila: T) => string): T[] {
  return filas.toSorted((a, b) => comparador.compare(nombre(a), nombre(b)))
}
