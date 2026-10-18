import { describe, expect, test } from 'bun:test'
import { leerEscaneo, lineasParaRepetir, masVendidos, ultimaCompra } from '../caja-rapida'
import { SIN_FILTRO, agruparPorDia, filtrarVentas, resumenVentas } from '../filtros'
import { ventasNetas } from '../netas'
import type { AlmacenRow, LineaVenta, Venta } from '@/types'

const LINEA: LineaVenta = {
  id: 1,
  producto_id: 5,
  producto_nombre: 'Creatina',
  unidad: 'bote',
  cantidad: 3,
  precio_unitario: 10,
  descuento: 0,
  iva: 10,
  importe: 30,
  devuelto: 0,
}

function venta(cambios: Partial<Venta> = {}): Venta {
  return {
    id: 1,
    numero: 'V-000001',
    fecha: '2026-10-18',
    creado: '2026-10-18 10:00:00',
    usuario: 'admin',
    paciente_id: null,
    paciente_nombre: null,
    notas: null,
    total: 30,
    estado: 'completada',
    entregado: null,
    anulacion_motivo: null,
    anulacion_fecha: null,
    anulacion_usuario: null,
    situacion: 'completada',
    total_devuelto: 0,
    devoluciones: [],
    pagos: [{ metodo: 'efectivo', importe: 30 }],
    lineas: [LINEA],
    ...cambios,
  }
}

const devolucion = {
  id: 1,
  fecha: '2026-10-18',
  creado: null,
  usuario: 'ana',
  motivo: 'Caducado',
  metodo_reembolso: 'efectivo' as const,
  importe: 10,
  notas: null,
  lineas: [{ venta_linea_id: 1, producto_nombre: 'Creatina', cantidad: 1, importe: 10, reingresa: 0 }],
}

describe('ventasNetas', () => {
  test('quita las anuladas y descuenta lo devuelto', () => {
    const parcial = venta({
      id: 2,
      situacion: 'devuelta_parcial',
      total_devuelto: 10,
      devoluciones: [devolucion],
      lineas: [{ ...LINEA, devuelto: 1 }],
    })
    const netas = ventasNetas([venta({ estado: 'anulada', situacion: 'anulada' }), parcial])
    expect(netas).toHaveLength(1)
    expect(netas[0]?.total).toBe(20)
    expect(netas[0]?.lineas[0]).toMatchObject({ cantidad: 2, importe: 20, precio_unitario: 10 })
  })
})

describe('filtrarVentas', () => {
  const ventas = [
    venta({ id: 123, paciente_id: 4, paciente_nombre: 'Lucía Pérez' }),
    venta({ id: 124, fecha: '2026-10-10', pagos: [] }),
    venta({ id: 125, estado: 'anulada', situacion: 'anulada', pagos: [{ metodo: 'tarjeta', importe: 30 }] }),
  ]
  const ids = (filtro: Partial<typeof SIN_FILTRO>) =>
    filtrarVentas(ventas, { ...SIN_FILTRO, ...filtro }).map((v) => v.id)

  test('busca por número de ticket con o sin ceros', () => {
    expect(ids({ texto: 'V-000123' })).toEqual([123])
    expect(ids({ texto: '124' })).toEqual([124])
    expect(ids({ texto: 'lucia' })).toEqual([123])
    expect(ids({ texto: 'creatina' })).toEqual([123, 124, 125])
  })

  test('un número solo busca el ticket, no los productos que lo contienen', () => {
    const conCifra = [venta({ id: 9 }), venta({ id: 10, lineas: [{ ...LINEA, producto_nombre: 'Omega 90 cáps' }] })]
    expect(filtrarVentas(conCifra, { ...SIN_FILTRO, texto: '9' }).map((v) => v.id)).toEqual([9])
  })

  test('filtra por fecha, cliente, pago y estado', () => {
    expect(ids({ desde: '2026-10-11' })).toEqual([123, 125])
    expect(ids({ cliente: 'sin' })).toEqual([124, 125])
    expect(ids({ cliente: '4' })).toEqual([123])
    expect(ids({ metodo: 'sin_indicar' })).toEqual([124])
    expect(ids({ metodo: 'tarjeta' })).toEqual([125])
    expect(ids({ situacion: 'anulada' })).toEqual([125])
  })
})

describe('resumenVentas', () => {
  test('las anuladas no suman y lo devuelto se resta', () => {
    const r = resumenVentas([
      venta(),
      venta({ id: 2, total_devuelto: 10, situacion: 'devuelta_parcial' }),
      venta({ id: 3, estado: 'anulada', situacion: 'anulada' }),
    ])
    expect(r).toEqual({ num_ventas: 2, vendido: 60, devuelto: 10, neto: 50, num_anuladas: 1 })
  })
})

describe('agruparPorDia', () => {
  test('junta las ventas seguidas del mismo día', () => {
    const grupos = agruparPorDia([venta({ id: 3 }), venta({ id: 2 }), venta({ id: 1, fecha: '2026-10-17' })])
    expect(grupos.map((g) => [g.fecha, g.ventas.map((v) => v.id)])).toEqual([
      ['2026-10-18', [3, 2]],
      ['2026-10-17', [1]],
    ])
    expect(agruparPorDia([])).toEqual([])
  })
})

describe('leerEscaneo', () => {
  test('«N*» delante del código multiplica las unidades', () => {
    expect(leerEscaneo('3*8410001000042')).toEqual({ cantidad: 3, buscado: '8410001000042' })
    expect(leerEscaneo(' 12 * barrita ')).toEqual({ cantidad: 12, buscado: 'barrita' })
    expect(leerEscaneo('3*')).toEqual({ cantidad: 3, buscado: '' })
  })

  test('sin multiplicador válido busca el texto tal cual', () => {
    expect(leerEscaneo('8410001000042')).toEqual({ cantidad: 1, buscado: '8410001000042' })
    expect(leerEscaneo('0*barrita')).toEqual({ cantidad: 1, buscado: '0*barrita' })
    expect(leerEscaneo('5000*barrita')).toEqual({ cantidad: 1, buscado: '5000*barrita' })
    expect(leerEscaneo('whey 2*1kg')).toEqual({ cantidad: 1, buscado: 'whey 2*1kg' })
  })
})

function linea(producto_id: number, cantidad: number, devuelto = 0): LineaVenta {
  return { ...LINEA, producto_id, cantidad, devuelto }
}

function producto(cambios: Partial<AlmacenRow>): AlmacenRow {
  return {
    id: 5,
    nombre: 'Creatina',
    unidad: 'bote',
    precio_coste: 5,
    precio_venta: 12,
    stock_minimo: 0,
    codigo_barras: null,
    iva: 10,
    categoria: null,
    proveedor_id: null,
    proveedor_nombre: null,
    stock_actual: 10,
    creado: null,
    ...cambios,
  }
}

describe('masVendidos', () => {
  test('ordena por unidades netas y deja fuera anuladas y ventas antiguas', () => {
    const ventas = [
      venta({ id: 1, lineas: [linea(1, 2), linea(2, 5, 4)] }),
      venta({ id: 2, lineas: [linea(3, 3)] }),
      venta({ id: 3, estado: 'anulada', situacion: 'anulada', lineas: [linea(2, 50)] }),
      venta({ id: 4, fecha: '2026-08-01', lineas: [linea(4, 99)] }),
      venta({ id: 5, lineas: [linea(5, 1, 1)] }),
    ]
    expect(masVendidos(ventas, { desde: '2026-10-01', limite: 8 })).toEqual([3, 1, 2])
    expect(masVendidos(ventas, { desde: '2026-10-01', limite: 2 })).toEqual([3, 1])
  })
})

describe('repetir una compra', () => {
  test('ultimaCompra salta las anuladas y las devueltas enteras', () => {
    const ventas = [
      venta({ id: 4, paciente_id: 7, situacion: 'devuelta' }),
      venta({ id: 3, paciente_id: 7, estado: 'anulada', situacion: 'anulada' }),
      venta({ id: 2, paciente_id: 8 }),
      venta({ id: 1, paciente_id: 7, situacion: 'devuelta_parcial' }),
    ]
    expect(ultimaCompra(ventas, 7)?.id).toBe(1)
    expect(ultimaCompra(ventas, 9)).toBeUndefined()
  })

  test('usa el precio de hoy, quita lo devuelto y no pasa de las existencias', () => {
    const anterior = venta({
      lineas: [
        { ...LINEA, id: 1, cantidad: 3, devuelto: 1, precio_unitario: 10 },
        { ...LINEA, id: 2, producto_id: 6, producto_nombre: 'Shaker', cantidad: 4 },
        { ...LINEA, id: 3, producto_id: 7, producto_nombre: 'Omega 3', cantidad: 1 },
        { ...LINEA, id: 4, producto_id: 8, producto_nombre: 'Retirado', cantidad: 1 },
      ],
    })
    const r = lineasParaRepetir(anterior, [
      producto({}),
      producto({ id: 6, nombre: 'Shaker', stock_actual: 1 }),
      producto({ id: 7, nombre: 'Omega 3', stock_actual: 0 }),
    ])
    expect(r.lineas.map((l) => [l.producto_id, l.cantidad, l.precio_unitario])).toEqual([
      [5, 2, 12],
      [6, 1, 12],
    ])
    expect(r.avisos).toEqual([
      'De «Shaker» solo se añaden 1: no hay más',
      'No queda stock de «Omega 3»',
      '«Retirado» ya no está en el almacén',
    ])
  })
})
