import { describe, expect, test } from 'bun:test'
import { diferenciaDe, errorContado, errorRecuento, leerContado, lineasParaEnviar, resumenRecuento } from '../recuento'

const linea = (producto_id: number, esperado: number, contado: string) => ({ producto_id, esperado, contado })

describe('leerContado y errorContado', () => {
  test('vacío es «sin contar», no cero', () => {
    expect(leerContado('')).toBeNull()
    expect(leerContado('  ')).toBeNull()
    expect(leerContado('0')).toBe(0)
    expect(errorContado('')).toBeNull()
  })

  test('admite coma decimal y rechaza negativos y texto', () => {
    expect(leerContado('2,5')).toBe(2.5)
    expect(errorContado('-1')).toBe('No puede ser negativo')
    expect(errorContado('abc')).toBe('Escribe un número')
    expect(errorContado('3')).toBeNull()
  })
})

describe('diferenciaDe', () => {
  test('es lo contado menos lo esperado, sin restos binarios', () => {
    expect(diferenciaDe(linea(1, 9, '7'))).toBe(-2)
    expect(diferenciaDe(linea(1, 9, '9'))).toBe(0)
    expect(diferenciaDe(linea(1, 0.1, '0,3'))).toBe(0.2)
    expect(diferenciaDe(linea(1, -2, '0'))).toBe(2)
  })

  test('null si la línea no se ha contado o es inválida', () => {
    expect(diferenciaDe(linea(1, 9, ''))).toBeNull()
    expect(diferenciaDe(linea(1, 9, '-1'))).toBeNull()
  })
})

describe('envío y validación', () => {
  const lineas = [linea(1, 5, '4'), linea(2, 3, ''), linea(3, 0, '0')]

  test('solo se envían las líneas contadas', () => {
    expect(lineasParaEnviar(lineas)).toEqual([
      { producto_id: 1, contado: 4 },
      { producto_id: 3, contado: 0 },
    ])
  })

  test('el primer problema bloquea el registro', () => {
    expect(errorRecuento({ lineas, motivo: 'Mensual' })).toBeNull()
    expect(errorRecuento({ lineas, motivo: '  ' })).toBe('Indica el motivo del recuento')
    expect(errorRecuento({ lineas: [linea(1, 5, '')], motivo: 'Mensual' })).toBe('Cuenta al menos un producto')
    expect(errorRecuento({ lineas: [], motivo: 'Mensual' })).toBe('Cuenta al menos un producto')
    expect(errorRecuento({ lineas: [...lineas, linea(4, 1, '-2')], motivo: 'Mensual' })).toBe(
      'Revisa las unidades contadas',
    )
  })

  test('resume cuántos se han contado y cuántos tienen diferencia', () => {
    expect(resumenRecuento(lineas)).toEqual({ contados: 2, conDiferencia: 1 })
  })
})
