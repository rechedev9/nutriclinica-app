type ValorCambio = string | number | null

export interface CambioCampo {
  campo: string
  antes: ValorCambio
  despues: ValorCambio
}

export interface DetalleAuditoria {
  cambios: CambioCampo[]
  resumen: string | null
  // Id del registro afectado (revisión, foto, cliente), para enlazar la entrada con él.
  registro_id: number | null
}

type Fila = Record<string, ValorCambio | undefined>

// diferencias lista los campos cuyo valor cambió; un campo ausente cuenta como nulo.
export function diferencias(opciones: { antes: Fila; despues: Fila; campos: readonly string[] }): CambioCampo[] {
  const { antes, despues, campos } = opciones
  const cambios: CambioCampo[] = []
  for (const campo of campos) {
    const a = antes[campo] ?? null
    const d = despues[campo] ?? null
    if (a !== d) cambios.push({ campo, antes: a, despues: d })
  }
  return cambios
}

function esValor(valor: unknown): valor is ValorCambio {
  return valor === null || typeof valor === 'string' || typeof valor === 'number'
}

function esObjeto(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === 'object' && valor !== null && !Array.isArray(valor)
}

// leerDetalle interpreta el JSON guardado; devuelve null si no tiene la forma esperada.
export function leerDetalle(texto: string | null): DetalleAuditoria | null {
  if (texto === null) return null
  let crudo: unknown
  try {
    crudo = JSON.parse(texto)
  } catch {
    return null
  }
  if (!esObjeto(crudo)) return null
  const cambios: CambioCampo[] = []
  if (Array.isArray(crudo.cambios)) {
    for (const item of crudo.cambios) {
      if (esObjeto(item) && typeof item.campo === 'string' && esValor(item.antes) && esValor(item.despues)) {
        cambios.push({ campo: item.campo, antes: item.antes, despues: item.despues })
      }
    }
  }
  const resumen = typeof crudo.resumen === 'string' ? crudo.resumen : null
  const registro_id = typeof crudo.registro_id === 'number' ? crudo.registro_id : null
  return { cambios, resumen, registro_id }
}
