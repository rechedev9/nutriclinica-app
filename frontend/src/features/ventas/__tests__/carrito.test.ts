import { describe, expect, test } from 'bun:test'
import {
  SIN_DESCUENTO,
  aVentaInput,
  anadirProducto,
  cambio,
  desgloseIva,
  entregasRapidas,
  errorCarrito,
  errorPagos,
  importeDevolucion,
  importeLinea,
  leerImporte,
  totalesCarrito,
} from '../carrito'
import type { LineaCarrito } from '../carrito'
import type { LineaVenta } from '@/types'

function linea(cambios: Partial<LineaCarrito> = {}): LineaCarrito {
  return {
    producto_id: 1,
    nombre: 'Proteína',
    unidad: 'bote',
    cantidad: 1,
    precio_unitario: 30,
    descuento: SIN_DESCUENTO,
    stock: 10,
    ...cambios,
  }
}

describe('totales del carrito', () => {
  test('aplica el descuento por línea en % y en €', () => {
    expect(importeLinea(linea({ cantidad: 2, descuento: { tipo: 'pct', valor: 10 } }))).toBe(54)
    expect(importeLinea(linea({ descuento: { tipo: 'eur', valor: 5 } }))).toBe(25)
    // Un descuento mayor que la línea la deja a cero, no en negativo.
    expect(importeLinea(linea({ descuento: { tipo: 'eur', valor: 50 } }))).toBe(0)
  })

  test('el descuento al total se aplica sobre lo ya rebajado', () => {
    const lineas = [
      linea({ descuento: { tipo: 'eur', valor: 5 } }),
      linea({ producto_id: 2, precio_unitario: 2.1, cantidad: 3 }),
    ]
    const t = totalesCarrito(lineas, { tipo: 'pct', valor: 10 })
    expect(t.bruto).toBe(36.3)
    expect(t.descuento_lineas).toBe(5)
    expect(t.subtotal).toBe(31.3)
    expect(t.descuento_total).toBe(3.13)
    expect(t.total).toBe(28.17)
    expect(t.unidades).toBe(4)
  })

  test('no arrastra errores de coma flotante', () => {
    const t = totalesCarrito([linea({ precio_unitario: 0.1, cantidad: 3 })], SIN_DESCUENTO)
    expect(t.total).toBe(0.3)
  })
})

describe('errorCarrito', () => {
  test('pide productos y cantidades válidas', () => {
    expect(errorCarrito([], SIN_DESCUENTO)).toBe('Añade algún producto')
    expect(errorCarrito([linea({ cantidad: 0 })], SIN_DESCUENTO)).toBe('La cantidad de «Proteína» debe ser mayor que 0')
    expect(errorCarrito([linea({ descuento: { tipo: 'pct', valor: 120 } })], SIN_DESCUENTO)).toBe(
      'El descuento de «Proteína» supera su importe',
    )
  })

  test('suma las líneas del mismo producto contra el stock', () => {
    const dos = [linea({ cantidad: 2, stock: 3 }), linea({ cantidad: 2, stock: 3, precio_unitario: 25 })]
    expect(errorCarrito(dos, SIN_DESCUENTO)).toBe('Solo quedan 3 de «Proteína»')
    expect(errorCarrito([linea({ cantidad: 2, stock: 1 })], SIN_DESCUENTO)).toBe('Solo queda 1 de «Proteína»')
    expect(errorCarrito([linea({ stock: 0 })], SIN_DESCUENTO)).toBe('No queda stock de «Proteína»')
  })

  test('el descuento total no puede pasar del subtotal', () => {
    expect(errorCarrito([linea()], { tipo: 'eur', valor: 31 })).toBe('El descuento supera el total de la venta')
    expect(errorCarrito([linea()], { tipo: 'eur', valor: 30 })).toBeNull()
  })
})

describe('anadirProducto', () => {
  test('suma una unidad si ya está al mismo precio', () => {
    const base = { producto_id: 1, nombre: 'Proteína', unidad: 'bote', precio_unitario: 30, stock: 10 }
    const una = anadirProducto([], base)
    const dos = anadirProducto(una, base)
    expect(dos).toHaveLength(1)
    expect(dos[0]?.cantidad).toBe(2)
    expect(anadirProducto(dos, { ...base, precio_unitario: 25 })).toHaveLength(2)
  })

  test('añade varias unidades de golpe', () => {
    const base = { producto_id: 1, nombre: 'Barrita', unidad: 'ud', precio_unitario: 2.5, stock: 40 }
    const tres = anadirProducto([], { ...base, cantidad: 3 })
    expect(tres[0]?.cantidad).toBe(3)
    expect(anadirProducto(tres, { ...base, cantidad: 6 })[0]?.cantidad).toBe(9)
  })
})

describe('cobro', () => {
  test('errorPagos exige cuadrar con el total', () => {
    expect(errorPagos([], 10)).toBe('Indica cómo paga el cliente')
    expect(errorPagos([{ metodo: 'efectivo', importe: 4 }], 10)).toBe('Faltan 6,00 € por cobrar')
    expect(errorPagos([{ metodo: 'tarjeta', importe: 12 }], 10)).toBe('Los pagos pasan del total en 2,00 €')
    expect(
      errorPagos(
        [
          { metodo: 'efectivo', importe: 4.1 },
          { metodo: 'tarjeta', importe: 5.9 },
        ],
        10,
      ),
    ).toBeNull()
    expect(errorPagos([], 0)).toBeNull()
  })

  test('cambio y entregas rápidas', () => {
    expect(cambio(50, 42.35)).toBe(7.65)
    expect(cambio(20, 42.35)).toBe(0)
    expect(entregasRapidas(42.35)).toEqual([42.35, 45, 50, 60])
    expect(entregasRapidas(20)).toEqual([20, 50, 100])
  })

  test('leerImporte admite coma decimal', () => {
    expect(leerImporte('12,5')).toBe(12.5)
    expect(leerImporte('  ')).toBeNull()
    expect(leerImporte('abc')).toBeNaN()
  })

  test('aVentaInput manda el descuento en euros y solo guarda lo entregado si hay efectivo', () => {
    const cuerpo = aVentaInput({
      lineas: [linea({ cantidad: 2, descuento: { tipo: 'pct', valor: 10 } })],
      descuentoTotal: { tipo: 'eur', valor: 4 },
      pacienteId: 3,
      notas: '  ',
      pagos: [{ metodo: 'tarjeta', importe: 50 }],
      entregado: 60,
    })
    expect(cuerpo.lineas[0]?.descuento).toBe(6)
    expect(cuerpo.descuento_total).toBe(4)
    expect(cuerpo.notas).toBeNull()
    expect(cuerpo.entregado).toBeNull()
  })
})

describe('ticket y devoluciones', () => {
  const lineaVenta: LineaVenta = {
    id: 7,
    producto_id: 1,
    producto_nombre: 'Barrita',
    unidad: 'ud',
    cantidad: 3,
    precio_unitario: 10,
    descuento: 0.99,
    iva: 10,
    importe: 29.01,
    devuelto: 0,
  }

  test('desglosa el IVA incluido por tipo', () => {
    expect(
      desgloseIva([
        { importe: 11, iva: 10 },
        { importe: 12.1, iva: 21 },
        { importe: 22, iva: 10 },
      ]),
    ).toEqual([
      { iva: 10, base: 30, cuota: 3, total: 33 },
      { iva: 21, base: 10, cuota: 2.1, total: 12.1 },
    ])
  })

  test('reparte el importe de la línea y la última unidad se lleva el resto', () => {
    expect(importeDevolucion(lineaVenta, { cantidad: 1, reembolsado: 0 })).toBe(9.67)
    expect(importeDevolucion({ ...lineaVenta, devuelto: 2 }, { cantidad: 1, reembolsado: 19.34 })).toBe(9.67)
    expect(importeDevolucion(lineaVenta, { cantidad: 3, reembolsado: 0 })).toBe(29.01)
    expect(importeDevolucion(lineaVenta, { cantidad: 0, reembolsado: 0 })).toBe(0)
  })
})
