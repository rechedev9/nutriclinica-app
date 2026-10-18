import { createInsertSchema } from 'drizzle-typebox'
import { t } from 'elysia'
import { pacientes, revisiones, stock_productos, stock_proveedores } from './db/esquema'

// Esquemas de entrada derivados de las tablas. Todos los campos son opcionales: los
// obligatorios y los rangos los comprueba validacion.ts, que da el mensaje de cada error.

export const idParams = t.Object({ id: t.Numeric() })

const consentimiento = t.Optional(t.Nullable(t.Integer()))
export const pacienteEntrada = t.Partial(
  t.Omit(createInsertSchema(pacientes, { consentimiento }), ['id', 'creado', 'consentimiento_fecha']),
)

export const revisionEntrada = t.Partial(t.Omit(createInsertSchema(revisiones), ['id', 'paciente_id']))

const numeroOpcional = t.Optional(t.Nullable(t.Number()))
export const productoEntrada = t.Partial(
  t.Omit(
    createInsertSchema(stock_productos, {
      precio_coste: numeroOpcional,
      precio_venta: numeroOpcional,
      stock_minimo: numeroOpcional,
      iva: numeroOpcional,
    }),
    ['id', 'activo', 'creado'],
  ),
)

export const proveedorEntrada = t.Partial(t.Omit(createInsertSchema(stock_proveedores), ['id']))

export const categoriaEntrada = t.Object({ nombre: t.Optional(t.String()) })

const textoOpcional = t.Optional(t.Nullable(t.String()))
const idOpcional = t.Optional(t.Nullable(t.Integer()))

export const lineaEntrada = t.Object({
  producto_id: t.Optional(t.Integer()),
  cantidad: t.Optional(t.Number()),
  precio_unitario: numeroOpcional,
})

export const compraEntrada = t.Object({
  fecha: textoOpcional,
  proveedor_id: idOpcional,
  notas: textoOpcional,
  lineas: t.Optional(t.Array(lineaEntrada)),
})

export const lineaVentaEntrada = t.Object({
  producto_id: t.Optional(t.Integer()),
  cantidad: t.Optional(t.Number()),
  precio_unitario: numeroOpcional,
  descuento: numeroOpcional,
})

export const pagoEntrada = t.Object({
  metodo: t.Optional(t.String()),
  importe: t.Optional(t.Number()),
})

export const ventaEntrada = t.Object({
  fecha: textoOpcional,
  paciente_id: idOpcional,
  notas: textoOpcional,
  lineas: t.Optional(t.Array(lineaVentaEntrada)),
  descuento_total: numeroOpcional,
  pagos: t.Optional(t.Array(pagoEntrada)),
  entregado: numeroOpcional,
})

export const correccionVentaEntrada = t.Object({
  paciente_id: idOpcional,
  notas: textoOpcional,
  pagos: t.Optional(t.Array(pagoEntrada)),
})

export const anulacionEntrada = t.Object({ motivo: textoOpcional })

export const devolucionEntrada = t.Object({
  motivo: textoOpcional,
  metodo_reembolso: textoOpcional,
  notas: textoOpcional,
  lineas: t.Optional(
    t.Array(
      t.Object({
        venta_linea_id: t.Optional(t.Integer()),
        cantidad: t.Optional(t.Number()),
        reingresa: t.Optional(t.Boolean()),
      }),
    ),
  ),
})

export const cierreEntrada = t.Object({
  fecha: textoOpcional,
  fondo_inicial: numeroOpcional,
  efectivo_contado: numeroOpcional,
  notas: textoOpcional,
})

export const ajustesEntrada = t.Object({
  tienda_nombre: textoOpcional,
  tienda_nif: textoOpcional,
  tienda_direccion: textoOpcional,
  tienda_telefono: textoOpcional,
  ticket_pie: textoOpcional,
})

export const fechaParams = t.Object({ fecha: t.String() })

export const mermaEntrada = t.Object({
  producto_id: t.Optional(t.Integer()),
  proveedor_id: idOpcional,
  cantidad: t.Optional(t.Number()),
  motivo: t.Optional(t.String()),
  fecha: textoOpcional,
  notas: textoOpcional,
})

export const recuentoEntrada = t.Object({
  motivo: textoOpcional,
  notas: textoOpcional,
  lineas: t.Optional(t.Array(t.Object({ producto_id: t.Optional(t.Integer()), contado: numeroOpcional }))),
})

export const loginEntrada = t.Object({
  usuario: t.Optional(t.String()),
  password: t.Optional(t.String()),
})

export const miPasswordEntrada = t.Object({
  actual: t.Optional(t.String()),
  nueva: t.Optional(t.String()),
})

export const usuarioNuevoEntrada = t.Object({
  usuario: t.Optional(t.String()),
  password: t.Optional(t.String()),
  rol: textoOpcional,
})

export const usuarioEdicionEntrada = t.Object({
  usuario: t.Optional(t.String()),
  rol: textoOpcional,
})

export const passwordEntrada = t.Object({ password: t.Optional(t.String()) })
