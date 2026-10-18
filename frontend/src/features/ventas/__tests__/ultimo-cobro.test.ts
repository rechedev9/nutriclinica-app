import { describe, expect, test } from 'bun:test'
import { guardarUltimoModo, leerUltimoModo } from '../ultimo-cobro'

function memoria() {
  const datos = new Map<string, string>()
  return {
    getItem: (clave: string) => datos.get(clave) ?? null,
    setItem: (clave: string, valor: string) => {
      datos.set(clave, valor)
    },
  }
}

describe('último modo de cobro', () => {
  test('sin recuerdo, el cobro abre en efectivo', () => {
    expect(leerUltimoModo({ getItem: () => null })).toBe('efectivo')
  })

  test('tras cobrar, el siguiente cobro abre en ese modo', () => {
    const almacen = memoria()
    for (const modo of ['tarjeta', 'bizum', 'mixto', 'efectivo'] as const) {
      guardarUltimoModo(modo, almacen)
      expect(leerUltimoModo(almacen)).toBe(modo)
    }
  })

  test('un valor ajeno se lee como efectivo', () => {
    expect(leerUltimoModo({ getItem: () => 'TARJETA' })).toBe('efectivo')
    expect(leerUltimoModo({ getItem: () => '' })).toBe('efectivo')
  })

  test('si el navegador niega el almacenamiento, el cobro sigue en efectivo y no falla', () => {
    expect(
      leerUltimoModo({
        getItem() {
          throw new Error('privado')
        },
      }),
    ).toBe('efectivo')
    expect(() =>
      guardarUltimoModo('tarjeta', {
        setItem() {
          throw new Error('lleno')
        },
      }),
    ).not.toThrow()
  })
})
