import { describe, expect, test } from 'bun:test'
import {
  granularidadDe,
  puntos,
  rangoAnterior,
  rangoDe,
  repartoMetodos,
  serieEvolucion,
  textoRango,
  topProductos,
  variacion,
  ventasPorCategoria,
  ventasPorDiaSemana,
  ventasPorHora,
} from '../estadisticas'
import { ventasNetas } from '../netas'
import { leerBusqueda } from '../periodos'
import type { LineaVenta, ProductoEstadistica, Venta } from '@/types'

const HOY = '2026-10-18'

function producto(cambios: Partial<ProductoEstadistica>): ProductoEstadistica {
  return { producto_id: 1, nombre: 'Whey', categoria: 'Proteínas', unidades: 1, neto: 30, margen: 10, ...cambios }
}

function personalizado(desde: unknown, hasta: unknown) {
  return rangoDe({ busqueda: leerBusqueda({ periodo: 'personalizado', desde, hasta }), hoy: HOY })
}

function linea(cambios: Partial<LineaVenta>): LineaVenta {
  return {
    id: 1,
    producto_id: 1,
    producto_nombre: 'Barrita',
    unidad: 'ud',
    cantidad: 1,
    precio_unitario: 2.5,
    descuento: 0,
    iva: 10,
    importe: 2.5,
    devuelto: 0,
    ...cambios,
  }
}

function venta(cambios: Partial<Venta>): Venta {
  return {
    id: 1,
    numero: 'V-000001',
    fecha: HOY,
    creado: `${HOY} 10:00:00`,
    usuario: 'admin',
    paciente_id: null,
    paciente_nombre: null,
    notas: null,
    total: 0,
    estado: 'completada',
    entregado: null,
    anulacion_motivo: null,
    anulacion_fecha: null,
    anulacion_usuario: null,
    situacion: 'completada',
    total_devuelto: 0,
    devoluciones: [],
    pagos: [],
    lineas: [],
    ...cambios,
  }
}

function devolucion(lineas: { venta_linea_id: number; cantidad: number; importe: number }[]) {
  const importe = lineas.reduce((suma, l) => suma + l.importe, 0)
  return { lineas, importe } as unknown as Venta['devoluciones'][number]
}

// El mismo escenario que backend/tests/api-estadisticas-ventas.test.ts: el endpoint debe dar
// las cifras que da ventasNetas, que es la definición de venta neta del resto de la app.
describe('definición de venta neta', () => {
  test('sin anuladas ni devueltas enteras, con descuentos y devolución parcial', () => {
    const netas = ventasNetas([
      venta({
        id: 1,
        total: 57.6,
        lineas: [
          linea({ id: 1, producto_nombre: 'Whey', cantidad: 2, precio_unitario: 30, descuento: 11.4, importe: 48.6 }),
          linea({ id: 2, cantidad: 4, descuento: 1, importe: 9 }),
        ],
      }),
      venta({ id: 2, total: 30, estado: 'anulada', situacion: 'anulada', lineas: [linea({ id: 3, importe: 30 })] }),
      venta({
        id: 3,
        total: 7.5,
        total_devuelto: 2.5,
        situacion: 'devuelta_parcial',
        lineas: [linea({ id: 4, cantidad: 3, importe: 7.5, devuelto: 1 })],
        devoluciones: [devolucion([{ venta_linea_id: 4, cantidad: 1, importe: 2.5 }])],
      }),
      venta({
        id: 4,
        total: 5,
        total_devuelto: 5,
        situacion: 'devuelta',
        lineas: [linea({ id: 5, cantidad: 2, importe: 5, devuelto: 2 })],
        devoluciones: [devolucion([{ venta_linea_id: 5, cantidad: 2, importe: 5 }])],
      }),
    ])
    const lineas = netas.flatMap((v) => v.lineas)
    expect(netas.length).toBe(2)
    expect(netas.reduce((suma, v) => suma + Math.round(v.total * 100), 0) / 100).toBe(62.6)
    expect(lineas.reduce((suma, l) => suma + l.cantidad, 0)).toBe(8)
    expect(lineas.map((l) => [l.producto_nombre, l.cantidad, l.importe])).toEqual([
      ['Whey', 2, 48.6],
      ['Barrita', 4, 9],
      ['Barrita', 2, 5],
    ])
  })
})

describe('periodos', () => {
  test('rango de cada periodo', () => {
    const rango = (periodo: Parameters<typeof leerBusqueda>[0]['periodo']) =>
      rangoDe({ busqueda: leerBusqueda({ periodo }), hoy: HOY })
    expect(rango('hoy')).toEqual({ desde: HOY, hasta: HOY })
    expect(rango('7d')).toEqual({ desde: '2026-10-12', hasta: HOY })
    expect(rango('30d')).toEqual({ desde: '2026-09-19', hasta: HOY })
    expect(rango('mes')).toEqual({ desde: '2026-10-01', hasta: HOY })
    expect(rango('mes_anterior')).toEqual({ desde: '2026-09-01', hasta: '2026-09-30' })
    expect(rango('anio')).toEqual({ desde: '2026-01-01', hasta: HOY })
    // Sin periodo o con uno desconocido, los últimos 30 días.
    expect(rango(undefined)).toEqual({ desde: '2026-09-19', hasta: HOY })
    expect(rango('trimestre')).toEqual({ desde: '2026-09-19', hasta: HOY })
  })

  test('mes anterior en enero cae en diciembre del año pasado', () => {
    expect(rangoDe({ busqueda: { periodo: 'mes_anterior' }, hoy: '2027-01-05' })).toEqual({
      desde: '2026-12-01',
      hasta: '2026-12-31',
    })
  })

  test('personalizado: solo con dos fechas válidas y en orden', () => {
    expect(personalizado('2026-02-01', '2026-02-28')).toEqual({ desde: '2026-02-01', hasta: '2026-02-28' })
    expect(personalizado('2026-02-30', '2026-03-01')).toBeNull()
    expect(personalizado('2026-03-10', '2026-03-01')).toBeNull()
    expect(personalizado(20260301, '2026-03-01')).toBeNull()
    expect(leerBusqueda({ periodo: '7d', desde: '2026-01-01' })).toEqual({ periodo: '7d' })
  })

  test('periodo anterior para comparar', () => {
    expect(rangoAnterior('hoy', { desde: HOY, hasta: HOY })).toEqual({ desde: '2026-10-17', hasta: '2026-10-17' })
    expect(rangoAnterior('7d', { desde: '2026-10-12', hasta: HOY })).toEqual({
      desde: '2026-10-05',
      hasta: '2026-10-11',
    })
    // Este mes hasta hoy frente a los mismos días del mes anterior.
    expect(rangoAnterior('mes', { desde: '2026-10-01', hasta: HOY })).toEqual({
      desde: '2026-09-01',
      hasta: '2026-09-18',
    })
    expect(rangoAnterior('mes', { desde: '2026-03-01', hasta: '2026-03-30' })).toEqual({
      desde: '2026-02-01',
      hasta: '2026-02-28',
    })
    // Un mes completo frente al mes anterior completo.
    expect(rangoAnterior('mes_anterior', { desde: '2026-09-01', hasta: '2026-09-30' })).toEqual({
      desde: '2026-08-01',
      hasta: '2026-08-31',
    })
    expect(rangoAnterior('anio', { desde: '2028-01-01', hasta: '2028-02-29' })).toEqual({
      desde: '2027-01-01',
      hasta: '2027-02-28',
    })
    expect(rangoAnterior('personalizado', { desde: '2026-03-01', hasta: '2026-03-10' })).toEqual({
      desde: '2026-02-19',
      hasta: '2026-02-28',
    })
  })

  test('granularidad y texto del rango', () => {
    expect(granularidadDe({ desde: '2026-10-01', hasta: '2026-10-31' })).toBe('dia')
    expect(granularidadDe({ desde: '2026-08-01', hasta: '2026-10-31' })).toBe('semana')
    expect(granularidadDe({ desde: '2026-01-01', hasta: HOY })).toBe('mes')
    expect(textoRango({ desde: HOY, hasta: HOY })).toBe('18 oct 2026')
    expect(textoRango({ desde: '2026-09-19', hasta: HOY })).toBe('19 sep a 18 oct 2026')
    expect(textoRango({ desde: '2025-12-20', hasta: '2026-01-05' })).toBe('20 dic 2025 a 5 ene 2026')
  })
})

describe('series', () => {
  const porDia = [
    { fecha: '2026-10-12', neto: 10.1, tickets: 1 },
    { fecha: '2026-10-14', neto: 20.2, tickets: 2 },
    { fecha: '2026-10-19', neto: 0.1, tickets: 1 },
  ]

  test('evolución diaria con ceros en los días sin ventas', () => {
    const serie = serieEvolucion({ rango: { desde: '2026-10-12', hasta: '2026-10-14' }, porDia, granularidad: 'dia' })
    expect(serie.map((s) => [s.etiqueta, s.neto, s.tickets])).toEqual([
      ['12 oct', 10.1, 1],
      ['13 oct', 0, 0],
      ['14 oct', 20.2, 2],
    ])
  })

  test('semanas de lunes a domingo, sumando en céntimos', () => {
    const serie = serieEvolucion({
      rango: { desde: '2026-10-14', hasta: '2026-10-20' },
      porDia,
      granularidad: 'semana',
    })
    // La primera semana empieza el lunes 12, pero se rotula con el primer día del rango.
    expect(serie).toEqual([
      { clave: '2026-10-12', etiqueta: '14 oct', neto: 20.2, tickets: 2 },
      { clave: '2026-10-19', etiqueta: '19 oct', neto: 0.1, tickets: 1 },
    ])
  })

  test('meses', () => {
    const serie = serieEvolucion({
      rango: { desde: '2026-09-20', hasta: '2026-10-18' },
      porDia: [...porDia, { fecha: '2026-09-30', neto: 0.2, tickets: 1 }],
      granularidad: 'mes',
    })
    expect(serie.map((s) => [s.etiqueta, s.neto, s.tickets])).toEqual([
      ['sep 26', 0.2, 1],
      ['oct 26', 30.3, 3],
    ])
  })

  test('día de la semana y hora', () => {
    const semana = ventasPorDiaSemana(porDia)
    expect(semana.map((d) => d.etiqueta)).toEqual(['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'])
    // Los lunes 12 y 19 se suman: 10,10 + 0,10.
    expect(semana[0]).toMatchObject({ neto: 10.2, tickets: 2 })
    expect(semana[2]).toMatchObject({ neto: 20.2, tickets: 2 })

    const horas = ventasPorHora([
      { hora: 9, neto: 5, tickets: 1 },
      { hora: 12, neto: 7.5, tickets: 2 },
    ])
    expect(horas.map((h) => [h.etiqueta, h.neto])).toEqual([
      ['09:00', 5],
      ['10:00', 0],
      ['11:00', 0],
      ['12:00', 7.5],
    ])
    expect(ventasPorHora([])).toEqual([])
  })
})

describe('comparación', () => {
  test('variación en % y en puntos', () => {
    expect(variacion({ actual: 150, anterior: 100 })).toBe(50)
    expect(variacion({ actual: 50, anterior: 100 })).toBe(-50)
    expect(variacion({ actual: 10, anterior: 0 })).toBeNull()
    expect(variacion({ actual: 10, anterior: -20 })).toBe(150)
    expect(puntos({ actual: 12.5, anterior: 10 })).toBe(2.5)
    expect(puntos({ actual: 12.5, anterior: null })).toBeNull()
  })
})

describe('rankings', () => {
  const productos = [
    producto({ producto_id: 1, nombre: 'Whey', unidades: 2, neto: 48.6, margen: 12.6 }),
    producto({ producto_id: 2, nombre: 'Barrita', categoria: null, unidades: 6, neto: 14, margen: 8 }),
    producto({ producto_id: 3, nombre: 'Creatina', unidades: 1, neto: 20, margen: null }),
    producto({ producto_id: 4, nombre: 'Agua', categoria: null, unidades: 6, neto: 6.1, margen: 3 }),
  ]
  const nombres = (criterio: 'neto' | 'unidades' | 'margen') =>
    topProductos({ productos, criterio, limite: 3 }).map((t) => [t.producto.nombre, t.valor])

  test('top por importe, por unidades y por margen (sin los que no tienen coste)', () => {
    expect(nombres('neto')).toEqual([
      ['Whey', 48.6],
      ['Creatina', 20],
      ['Barrita', 14],
    ])
    // Empate en unidades: por nombre.
    expect(nombres('unidades')).toEqual([
      ['Agua', 6],
      ['Barrita', 6],
      ['Whey', 2],
    ])
    expect(nombres('margen')).toEqual([
      ['Whey', 12.6],
      ['Barrita', 8],
      ['Agua', 3],
    ])
  })

  test('ventas por categoría, con las de sin categoría juntas', () => {
    expect(ventasPorCategoria(productos)).toEqual([
      { categoria: 'Proteínas', neto: 68.6, unidades: 3 },
      { categoria: 'Sin categoría', neto: 20.1, unidades: 12 },
    ])
  })

  test('métodos de pago con cobro, en orden fijo', () => {
    expect(repartoMetodos({ efectivo: 12.6, tarjeta: 0, bizum: 7.5, sin_indicar: 3 })).toEqual([
      { clave: 'efectivo', indice: 0, etiqueta: 'Efectivo', importe: 12.6 },
      { clave: 'bizum', indice: 2, etiqueta: 'Bizum', importe: 7.5 },
      { clave: 'sin_indicar', indice: 3, etiqueta: 'Sin indicar', importe: 3 },
    ])
  })
})
