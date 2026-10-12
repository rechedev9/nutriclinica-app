import { describe, it, expect } from 'bun:test'
import { calcIMC } from '../imc'
import { calcGrasaDW, clasificarGrasa } from '../grasa'
import { pesoGraso, pesoMagro } from '../composicion'

describe('calcIMC', () => {
  it('calcula IMC y clasificación (caso real: 72kg / 163cm = 27.1 Sobrepeso)', () => {
    const r = calcIMC(72, 163)
    expect(r).not.toBeNull()
    expect(r?.val).toBe(27.1)
    expect(r?.etiq).toBe('Sobrepeso')
    expect(r?.cls).toBe('imc-sobrepeso')
  })
  it('clasifica los tramos', () => {
    expect(calcIMC(45, 170)?.etiq).toBe('Bajo peso') // 15.6
    expect(calcIMC(65, 175)?.etiq).toBe('Normal') // 21.2
    expect(calcIMC(95, 175)?.etiq).toBe('Obesidad') // 31.0
  })
  it('devuelve null sin datos', () => {
    expect(calcIMC(null, 170)).toBeNull()
    expect(calcIMC(70, null)).toBeNull()
    expect(calcIMC(0, 170)).toBeNull()
  })
})

describe('calcGrasaDW', () => {
  it('devuelve null si falta algún pliegue, edad o sexo Otro', () => {
    expect(calcGrasaDW(null, 8, 10, 6, 25, 'Hombre')).toBeNull()
    expect(calcGrasaDW(6, 8, 10, 6, null, 'Hombre')).toBeNull()
    expect(calcGrasaDW(6, 8, 10, 6, 25, 'Otro')).toBeNull()
    expect(calcGrasaDW(6, 8, 10, 6, 25, null)).toBeNull()
  })
  it('Hombre 25 años, pliegues 6/8/10/6 (suma 30) ≈ 12.7%', () => {
    const r = calcGrasaDW(6, 8, 10, 6, 25, 'Hombre')
    expect(r).toBeCloseTo(12.7, 1)
  })
  it('Mujer da mayor % que Hombre con los mismos pliegues', () => {
    const hombre = calcGrasaDW(6, 8, 10, 6, 35, 'Hombre') ?? Number.NaN
    const mujer = calcGrasaDW(6, 8, 10, 6, 35, 'Mujer') ?? Number.NaN
    expect(mujer).toBeGreaterThan(hombre)
  })
  it('redondea a 1 decimal', () => {
    const r = calcGrasaDW(7, 9, 11, 8, 40, 'Mujer') ?? Number.NaN
    expect(Math.round(r * 10) / 10).toBe(r)
  })
})

describe('clasificarGrasa', () => {
  it('umbrales hombre 8/20/25', () => {
    expect(clasificarGrasa(5, 'Hombre')?.etiq).toBe('Bajo')
    expect(clasificarGrasa(15, 'Hombre')?.etiq).toBe('Saludable')
    expect(clasificarGrasa(22, 'Hombre')?.etiq).toBe('Límite')
    expect(clasificarGrasa(30, 'Hombre')?.etiq).toBe('Exceso')
  })
  it('umbrales mujer 21/33/39', () => {
    expect(clasificarGrasa(18, 'Mujer')?.etiq).toBe('Bajo')
    expect(clasificarGrasa(28, 'Mujer')?.etiq).toBe('Saludable')
    expect(clasificarGrasa(36, 'Mujer')?.etiq).toBe('Límite')
    expect(clasificarGrasa(42, 'Mujer')?.etiq).toBe('Exceso')
  })
})

describe('composición', () => {
  it('peso graso y magro suman el peso total', () => {
    expect(pesoGraso(80, 25)).toBe(20)
    expect(pesoMagro(80, 25)).toBe(60)
  })
  it('null si faltan datos', () => {
    expect(pesoGraso(null, 25)).toBeNull()
    expect(pesoMagro(80, null)).toBeNull()
  })
})
