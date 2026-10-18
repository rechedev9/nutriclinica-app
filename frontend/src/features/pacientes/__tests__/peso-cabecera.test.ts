import { describe, expect, test } from 'bun:test'
import { etiquetaPeso, pesoCabecera, textoKilos } from '../peso-cabecera'

const ficha = 78.5

const maria = [
  { fecha: '2026-05-03', peso: 73.5 },
  { fecha: '2026-04-05', peso: 74.8 },
  { fecha: '2026-01-10', peso: 78.5 },
]

describe('pesoCabecera', () => {
  test('con revisiones muestra el peso de la más reciente y su fecha, no el de la ficha', () => {
    const peso = pesoCabecera({ pesoFicha: ficha, numRevisiones: maria.length, revisiones: maria })
    expect(peso).toEqual({ kilos: 73.5, origen: 'revision', fecha: '2026-05-03' })
    expect(peso && textoKilos(peso)).toBe('73.5')
    expect(peso && etiquetaPeso(peso)).toBe('kg · 03/05/2026')
  })

  test('si la última visita no trae peso, usa el peso más reciente de una revisión', () => {
    const peso = pesoCabecera({
      pesoFicha: ficha,
      numRevisiones: 2,
      revisiones: [
        { fecha: '2026-06-01', peso: null },
        { fecha: '2026-05-01', peso: 72.2 },
      ],
    })
    expect(peso).toEqual({ kilos: 72.2, origen: 'revision', fecha: '2026-05-01' })
  })

  test('con revisiones sin ningún peso no cae en el de la ficha', () => {
    expect(
      pesoCabecera({
        pesoFicha: ficha,
        numRevisiones: 1,
        revisiones: [{ fecha: '2026-06-01', peso: null }],
      }),
    ).toBeNull()
  })

  test('sin revisiones muestra el peso de la ficha como peso inicial', () => {
    const peso = pesoCabecera({ pesoFicha: ficha, numRevisiones: 0, revisiones: [] })
    expect(peso).toEqual({ kilos: 78.5, origen: 'ficha', fecha: null })
    expect(peso && textoKilos(peso)).toBe('78.5')
    expect(peso && etiquetaPeso(peso)).toBe('kg · peso inicial')
  })

  test('sin revisiones y sin peso de ficha no muestra cifra', () => {
    expect(pesoCabecera({ pesoFicha: null, numRevisiones: 0, revisiones: [] })).toBeNull()
  })

  test('el cero de la ficha cuenta como peso', () => {
    const peso = pesoCabecera({ pesoFicha: 0, numRevisiones: 0, revisiones: null })
    expect(peso).toEqual({ kilos: 0, origen: 'ficha', fecha: null })
    expect(peso && textoKilos(peso)).toBe('0')
  })

  test('mientras la lista de revisiones no ha llegado no adelanta el peso de la ficha', () => {
    expect(pesoCabecera({ pesoFicha: ficha, numRevisiones: 5, revisiones: null })).toBeNull()
  })
})
