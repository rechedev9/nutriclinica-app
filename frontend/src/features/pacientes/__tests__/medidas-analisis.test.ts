import { describe, expect, test } from 'bun:test'
import { PERIMETROS, PLIEGUES } from '@/types'
import {
  abrirMasMedidas,
  CLAVES_PLEGADAS,
  PERIMETROS_SERIE_INICIAL,
  PLIEGUES_GRASA,
  perimetrosPlegados,
  perimetrosVisibles,
  plieguesPlegados,
  plieguesVisibles,
} from '../medidas-analisis'

describe('medidas a la vista en la revisión', () => {
  test('deja el peso fuera del catálogo y muestra los cuatro pliegues de la grasa', () => {
    expect(plieguesVisibles.map((m) => m.key)).toEqual([...PLIEGUES_GRASA])
    expect(plieguesVisibles.map((m) => m.key)).toEqual([
      'pl_bicipital',
      'pl_tricipital',
      'pl_subescapular',
      'pl_supracrestal',
    ])
    expect(plieguesVisibles.map((m) => m.key)).not.toContain('pl_supraespinal')
  })

  test('muestra los perímetros con los que abre el gráfico, en el orden del catálogo', () => {
    const serie = new Set<string>(PERIMETROS_SERIE_INICIAL)
    expect(perimetrosVisibles.map((m) => m.key)).toEqual(PERIMETROS.filter((m) => serie.has(m.key)).map((m) => m.key))
    expect(perimetrosVisibles.map((m) => m.key)).toEqual(['per_pecho', 'per_cintura', 'per_caderas', 'per_muslo'])
  })

  test('no descarta ningún pliegue ni perímetro del catálogo', () => {
    expect(plieguesVisibles.length + plieguesPlegados.length).toBe(PLIEGUES.length)
    expect(perimetrosVisibles.length + perimetrosPlegados.length).toBe(PERIMETROS.length)
    expect(new Set([...plieguesVisibles, ...plieguesPlegados].map((m) => m.key))).toEqual(
      new Set(PLIEGUES.map((m) => m.key)),
    )
    expect(new Set([...perimetrosVisibles, ...perimetrosPlegados].map((m) => m.key))).toEqual(
      new Set(PERIMETROS.map((m) => m.key)),
    )
    expect(CLAVES_PLEGADAS).toEqual([
      'envergadura',
      'pl_supraespinal',
      'pl_abdominal',
      'pl_muslo_int',
      'pl_pierna_med',
      'per_antebrazo',
      'per_brazo_rel',
      'per_brazo_cont',
      'per_hombros',
      'per_muslo_cont',
      'per_gemelo',
    ])
  })
})

describe('abrir Más medidas', () => {
  test('una revisión nueva sin historial la deja cerrada', () => {
    expect(abrirMasMedidas({})).toBe(false)
    expect(abrirMasMedidas({ anterior: { pl_bicipital: 12, per_cintura: 80 } })).toBe(false)
  })

  test('la abre si la revisión anterior guardó una medida plegada', () => {
    expect(abrirMasMedidas({ anterior: { pl_supraespinal: 18 } })).toBe(true)
    expect(abrirMasMedidas({ anterior: { per_gemelo: 36 } })).toBe(true)
    expect(abrirMasMedidas({ anterior: { envergadura: 163 } })).toBe(true)
  })

  test('un cero de pliegue o perímetro no cuenta: el formulario lo enseña vacío', () => {
    expect(abrirMasMedidas({ anterior: { pl_abdominal: 0, per_hombros: 0 } })).toBe(false)
    expect(abrirMasMedidas({ anterior: { envergadura: 0 } })).toBe(true)
  })

  test('al editar mira esa revisión, aunque la anterior tuviera medidas plegadas', () => {
    expect(abrirMasMedidas({ editando: { pl_bicipital: 10 }, anterior: { pl_supraespinal: 18 } })).toBe(false)
    expect(abrirMasMedidas({ editando: { per_hombros: 110 }, anterior: null })).toBe(true)
  })
})
