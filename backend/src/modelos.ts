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

export const ventaEntrada = t.Object({
  fecha: textoOpcional,
  paciente_id: idOpcional,
  notas: textoOpcional,
  lineas: t.Optional(t.Array(lineaEntrada)),
})

export const mermaEntrada = t.Object({
  producto_id: t.Optional(t.Integer()),
  proveedor_id: idOpcional,
  cantidad: t.Optional(t.Number()),
  motivo: t.Optional(t.String()),
  fecha: textoOpcional,
  notas: textoOpcional,
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
