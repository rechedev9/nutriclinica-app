import { fmtFecha } from '@/lib/format/fecha'
import { ultimoDato } from './tabs/analisis/ultimo-dato'

export interface PesoCabecera {
  kilos: number
  origen: 'revision' | 'ficha'
  fecha: string | null
}

interface RevisionConPeso {
  peso: number | null
  fecha?: string | null
}

export function pesoCabecera(opciones: {
  pesoFicha: number | null | undefined
  numRevisiones: number
  revisiones: readonly RevisionConPeso[] | null
}): PesoCabecera | null {
  const { revisiones } = opciones
  if (revisiones === null) {
    if (opciones.numRevisiones > 0) return null
    return pesoDeFicha(opciones.pesoFicha)
  }
  if (revisiones.length === 0) return pesoDeFicha(opciones.pesoFicha)
  const ordenadas = revisiones.toSorted((a, b) => (a.fecha ?? '').localeCompare(b.fecha ?? ''))
  const punto = ultimoDato(ordenadas, (revision) => revision.peso)
  if (punto === null) return null
  return { kilos: punto.valor, origen: 'revision', fecha: punto.fecha }
}

function pesoDeFicha(pesoFicha: number | null | undefined): PesoCabecera | null {
  if (pesoFicha == null) return null
  return { kilos: pesoFicha, origen: 'ficha', fecha: null }
}

export function textoKilos(peso: PesoCabecera): string {
  return peso.origen === 'revision' ? peso.kilos.toFixed(1) : String(peso.kilos)
}

export function etiquetaPeso(peso: PesoCabecera): string {
  if (peso.origen === 'ficha') return 'kg · peso inicial'
  if (peso.fecha == null || peso.fecha === '') return 'kg'
  const fecha = fmtFecha(peso.fecha)
  if (fecha === '' || fecha === '-') return 'kg'
  return `kg · ${fecha}`
}
