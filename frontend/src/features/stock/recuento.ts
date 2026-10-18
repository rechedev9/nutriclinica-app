// Lógica pura del recuento de inventario. El servidor recalcula lo esperado al guardar;
// aquí solo se valida el formulario y se anticipa la diferencia.

export interface LineaRecuento {
  producto_id: number
  esperado: number
  // Texto tal como se escribe; vacío si el producto aún no se ha contado.
  contado: string
}

export function redondearCantidad(n: number): number {
  return Math.round(n * 1000) / 1000
}

// Número contado o null si el campo está vacío. Admite coma decimal.
export function leerContado(texto: string): number | null {
  const limpio = texto.trim().replace(',', '.')
  if (limpio === '') return null
  return Number(limpio)
}

export function errorContado(texto: string): string | null {
  const valor = leerContado(texto)
  if (valor === null) return null
  if (!Number.isFinite(valor)) return 'Escribe un número'
  if (valor < 0) return 'No puede ser negativo'
  return null
}

// Diferencia que quedará como ajuste, o null si la línea no se ha contado.
export function diferenciaDe(linea: LineaRecuento): number | null {
  const valor = leerContado(linea.contado)
  if (valor === null || errorContado(linea.contado) !== null) return null
  return redondearCantidad(valor - linea.esperado)
}

// Las líneas en blanco no se envían: el recuento puede cubrir solo una parte del almacén.
export function lineasParaEnviar(lineas: readonly LineaRecuento[]): { producto_id: number; contado: number }[] {
  return lineas.flatMap((l) => {
    const contado = leerContado(l.contado)
    return contado === null ? [] : [{ producto_id: l.producto_id, contado }]
  })
}

export function errorRecuento(opciones: { lineas: readonly LineaRecuento[]; motivo: string }): string | null {
  const { lineas, motivo } = opciones
  if (lineas.some((l) => errorContado(l.contado) !== null)) return 'Revisa las unidades contadas'
  if (lineasParaEnviar(lineas).length === 0) return 'Cuenta al menos un producto'
  if (motivo.trim() === '') return 'Indica el motivo del recuento'
  return null
}

export function resumenRecuento(lineas: readonly LineaRecuento[]): { contados: number; conDiferencia: number } {
  const diferencias = lineas.map(diferenciaDe).filter((d) => d !== null)
  return { contados: diferencias.length, conDiferencia: diferencias.filter((d) => d !== 0).length }
}
