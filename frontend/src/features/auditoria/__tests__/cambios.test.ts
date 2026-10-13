import { describe, expect, test } from 'bun:test'
import { describirCambio, etiquetaCampo, formatearValor } from '../cambios'

describe('describirCambio', () => {
  test('peso con coma decimal y unidad', () => {
    expect(describirCambio({ campo: 'peso', antes: 78.5, despues: 77.9 })).toBe('Peso: 78,5 kg → 77,9 kg')
  })

  test('un valor ausente se escribe como sin dato', () => {
    expect(describirCambio({ campo: 'telefono', antes: null, despues: '600 123 456' })).toBe(
      'Teléfono: sin dato → 600 123 456',
    )
    expect(describirCambio({ campo: 'per_cintura', antes: 90, despues: null })).toBe(
      'Perímetro de cintura: 90 cm → sin dato',
    )
  })

  test('fechas y consentimiento', () => {
    expect(describirCambio({ campo: 'fecha', antes: '2026-03-01', despues: '2026-03-02' })).toBe(
      'Fecha: 01/03/2026 → 02/03/2026',
    )
    expect(describirCambio({ campo: 'consentimiento', antes: 0, despues: 1 })).toBe('Consentimiento RGPD: No → Sí')
  })

  test('los pliegues van en milímetros', () => {
    expect(formatearValor('pl_tricipital', 12.5)).toBe('12,5 mm')
  })
})

describe('formatearValor', () => {
  test('recorta los textos largos', () => {
    expect(formatearValor('notas', 'a'.repeat(100))).toBe(`${'a'.repeat(60)}…`)
  })
})

describe('etiquetaCampo', () => {
  test('un campo desconocido se muestra tal cual', () => {
    expect(etiquetaCampo('campo_nuevo')).toBe('campo_nuevo')
    expect(etiquetaCampo('actividad_fisica')).toBe('Actividad física')
  })
})
