import { describe, expect, test } from 'bun:test'
import { camposSinRellenar } from '../ficha'

const completo = {
  fecha_nac: '1990-01-01',
  sexo: 'Mujer',
  dni: '1',
  grupo_sanguineo: 'A+',
  telefono: '600',
  email: 'a@b.es',
  peso: 70,
  talla: 170,
  objetivo: 'x',
  actividad_fisica: 'y',
  intolerancias: 'z',
  patologias: 'w',
}

describe('camposSinRellenar', () => {
  test('ficha completa no devuelve nada', () => {
    expect(camposSinRellenar(completo)).toEqual([])
  })

  test('detecta nulos y cadenas en blanco, en orden de ficha', () => {
    expect(camposSinRellenar({ ...completo, telefono: null, patologias: '  ' })).toEqual(['teléfono', 'patologías'])
  })

  test('un peso 0 cuenta como dato', () => {
    expect(camposSinRellenar({ ...completo, peso: 0 })).toEqual([])
  })
})
