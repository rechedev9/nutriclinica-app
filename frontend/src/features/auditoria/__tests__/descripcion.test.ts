import { describe, expect, test } from 'bun:test'
import {
  agruparPorDia,
  describirEstado,
  describirRuta,
  nombreRecurso,
  resumenLegible,
  tipoAccion,
} from '../descripcion'

describe('describirRuta', () => {
  test('separa el cliente del recurso', () => {
    expect(describirRuta('/api/pacientes/3/revisiones')).toEqual({ recurso: 'Revisión', pacienteId: 3 })
    expect(describirRuta('/api/pacientes/12')).toEqual({ recurso: 'Ficha', pacienteId: 12 })
    expect(describirRuta('/api/pacientes')).toEqual({ recurso: 'Ficha de cliente', pacienteId: null })
  })

  test('numera el recurso cuando el id es suyo', () => {
    expect(describirRuta('/api/stock/ventas/8').recurso).toBe('Venta nº 8')
    expect(describirRuta('/api/stock/ventas').recurso).toBe('Venta')
    expect(describirRuta('/api/usuarios/2/password').recurso).toBe('Contraseña del usuario nº 2')
  })

  test('describe las rutas de la sección de ventas', () => {
    expect(describirRuta('/api/ventas').recurso).toBe('Venta')
    expect(describirRuta('/api/ventas/12').recurso).toBe('Venta nº 12')
    expect(describirRuta('/api/ventas/12/anular').recurso).toBe('Anulación de la venta nº 12')
    expect(describirRuta('/api/ventas/12/devoluciones').recurso).toBe('Devolución de la venta nº 12')
    expect(describirRuta('/api/caja/cierres/3').recurso).toBe('Cierre de caja nº 3')
    expect(describirRuta('/api/tienda').recurso).toBe('Datos del ticket')
  })

  test('describe el recuento de inventario', () => {
    expect(describirRuta('/api/stock/recuentos')).toEqual({ recurso: 'Recuento de inventario', pacienteId: null })
  })

  test('deja la ruta tal cual si no la conoce', () => {
    expect(describirRuta('/api/otra-cosa')).toEqual({ recurso: '/api/otra-cosa', pacienteId: null })
  })
})

describe('describirEstado', () => {
  test('solo explica los rechazos', () => {
    expect(describirEstado(201, '/api/pacientes')).toBeNull()
    expect(describirEstado(409, '/api/stock/ventas')).toBe('operación no permitida')
    expect(describirEstado(401, '/api/login')).toBe('credenciales incorrectas')
    expect(describirEstado(500, '/api/pacientes')).toBe('error del servidor')
  })
})

describe('tipoAccion', () => {
  test('agrupa acceso y salida como sesión', () => {
    expect(tipoAccion('Acceso', '/api/login')).toBe('sesion')
    expect(tipoAccion('DELETE', '/api/fotos/4')).toBe('borrado')
    expect(tipoAccion('PATCH', '/api/pacientes/1')).toBeNull()
  })

  test('un cambio de contraseña es una edición', () => {
    expect(tipoAccion('POST', '/api/usuarios/2/password')).toBe('edicion')
    expect(tipoAccion('POST', '/api/usuarios')).toBe('alta')
  })

  test('anular una venta cuenta como borrado', () => {
    expect(tipoAccion('POST', '/api/ventas/12/anular')).toBe('borrado')
    expect(tipoAccion('POST', '/api/ventas/12/devoluciones')).toBe('alta')
  })
})

describe('agruparPorDia', () => {
  test('agrupa por día conservando el orden', () => {
    const grupos = agruparPorDia([
      { id: 1, fecha: '2026-03-02 10:00:00' },
      { id: 2, fecha: '2026-03-02 09:00:00' },
      { id: 3, fecha: '2026-03-01 08:00:00' },
      { id: 4, fecha: null },
    ])
    expect([...grupos.keys()]).toEqual(['2026-03-02', '2026-03-01', ''])
    expect(grupos.get('2026-03-02')?.map((e) => e.id)).toEqual([1, 2])
  })
})

describe('resumenLegible', () => {
  test('escribe las fechas del resumen como día, mes y año', () => {
    expect(resumenLegible('Revisión del 2026-03-01')).toBe('Revisión del 01/03/2026')
    expect(resumenLegible('Foto del 2026-10-13: Frente')).toBe('Foto del 13/10/2026: Frente')
  })

  test('no toca el texto sin fechas ni los números largos', () => {
    expect(resumenLegible('Cliente «Ana», 1 revisión y 0 fotos')).toBe('Cliente «Ana», 1 revisión y 0 fotos')
    expect(resumenLegible('Lote 12026-03-015')).toBe('Lote 12026-03-015')
  })
})

describe('nombreRecurso', () => {
  test('quita el número del recurso', () => {
    expect(nombreRecurso('/api/revisiones/5')).toBe('Revisión')
    expect(nombreRecurso('/api/pacientes/3/fotos')).toBe('Fotos')
  })
})
