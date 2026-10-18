export type ModoCobro = 'efectivo' | 'tarjeta' | 'bizum' | 'mixto'

const CLAVE = 'nutri-ultimo-cobro'

function modoCobroDe(valor: string | null): ModoCobro {
  if (valor === 'efectivo' || valor === 'tarjeta' || valor === 'bizum' || valor === 'mixto') return valor
  return 'efectivo'
}

interface MemoriaCobro {
  getItem(clave: string): string | null
  setItem(clave: string, valor: string): void
}

export function leerUltimoModo(memoria: Pick<MemoriaCobro, 'getItem'> = localStorage): ModoCobro {
  try {
    return modoCobroDe(memoria.getItem(CLAVE))
  } catch {
    return 'efectivo'
  }
}

export function guardarUltimoModo(modo: ModoCobro, memoria: Pick<MemoriaCobro, 'setItem'> = localStorage): void {
  try {
    memoria.setItem(CLAVE, modo)
  } catch {
    // Quien llama ya cobró. Si esto lanza, la caja no llega a vaciarse.
  }
}
