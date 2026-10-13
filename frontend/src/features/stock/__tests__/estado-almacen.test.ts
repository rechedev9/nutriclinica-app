import { describe, expect, test } from 'bun:test'
import { coincideEstado, contarPorEstado, estadoDe, ordenPorDefecto, productosEnAlerta } from '../estado-almacen'

const fila = (nombre: string, stock_actual: number, stock_minimo: number) => ({ nombre, stock_actual, stock_minimo })

describe('estadoDe', () => {
  test('clasifica agotado, bajo mínimo y en stock', () => {
    expect(estadoDe(0, 5)).toBe('agotado')
    expect(estadoDe(-2, 0)).toBe('agotado')
    expect(estadoDe(5, 5)).toBe('bajo')
    expect(estadoDe(6, 5)).toBe('ok')
    expect(estadoDe(3, 0)).toBe('ok')
  })
})

describe('ordenPorDefecto', () => {
  test('agotados, luego bajo mínimo, luego el resto por nombre', () => {
    const filas = [
      fila('Zumo', 10, 2),
      fila('Barrita', 1, 3),
      fila('Creatina', 0, 2),
      fila('Ácido', 9, 1),
      fila('Aminos', 0, 0),
    ]
    expect(ordenPorDefecto(filas).map((p) => p.nombre)).toEqual(['Aminos', 'Creatina', 'Barrita', 'Ácido', 'Zumo'])
  })

  test('no modifica la lista original', () => {
    const filas = [fila('B', 5, 1), fila('A', 0, 1)]
    ordenPorDefecto(filas)
    expect(filas[0]?.nombre).toBe('B')
  })
})

describe('coincideEstado', () => {
  test('filtra por alertas y por estado concreto', () => {
    const agotado = fila('A', 0, 2)
    const bajo = fila('B', 2, 2)
    const ok = fila('C', 9, 2)
    expect([agotado, bajo, ok].filter((p) => coincideEstado(p, 'alertas'))).toEqual([agotado, bajo])
    expect([agotado, bajo, ok].filter((p) => coincideEstado(p, 'agotado'))).toEqual([agotado])
    expect([agotado, bajo, ok].filter((p) => coincideEstado(p, 'bajo'))).toEqual([bajo])
    expect([agotado, bajo, ok].filter((p) => coincideEstado(p, 'todos'))).toHaveLength(3)
  })
})

describe('productosEnAlerta', () => {
  const almacen = [fila('Whey', 2, 3), fila('Creatina', 0, 2), fila('Barritas', 10, 3), fila('Aminos', 0, 0)]

  test('agotados primero, luego en el mínimo o por debajo, y excluye los que están bien', () => {
    const lista = [...almacen, fila('BCAA', 3, 3)]
    expect(productosEnAlerta(lista).map((p) => p.nombre)).toEqual(['Aminos', 'Creatina', 'BCAA', 'Whey'])
  })

  test('coincide con la cuenta de alertas del almacén', () => {
    const cuenta = contarPorEstado(almacen)
    expect(productosEnAlerta(almacen)).toHaveLength(cuenta.agotado + cuenta.bajo)
    expect(productosEnAlerta([])).toEqual([])
  })
})

describe('contarPorEstado', () => {
  test('cuenta cada estado', () => {
    expect(contarPorEstado([fila('A', 0, 1), fila('B', 1, 1), fila('C', 5, 1), fila('D', 6, 1)])).toEqual({
      agotado: 1,
      bajo: 1,
      ok: 2,
    })
  })
})
