import { sql } from 'drizzle-orm'
import { check, index, integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core'

// Las claves coinciden con las columnas (snake_case): son también las del JSON de la API.
// Las fechas son texto "AAAA-MM-DD[ HH:MM:SS]" en hora local.
const ahora = sql`(datetime('now', 'localtime'))`
const hoy = sql`(date('now', 'localtime'))`

export const MOTIVOS_MERMA = ['caducidad', 'accidente_rotura', 'devolucion_cliente'] as const
export const ROLES = ['admin', 'user'] as const

export const pacientes = sqliteTable('pacientes', {
  id: integer().primaryKey({ autoIncrement: true }),
  nombre: text().notNull(),
  fecha_nac: text(),
  sexo: text(),
  dni: text(),
  telefono: text(),
  email: text(),
  objetivo: text(),
  actividad_fisica: text(),
  intolerancias: text(),
  patologias: text(),
  notas: text(),
  peso: real(),
  talla: real(),
  grupo_sanguineo: text(),
  creado: text().default(ahora),
  consentimiento: integer().notNull().default(0),
  consentimiento_fecha: text(),
})

export const revisiones = sqliteTable(
  'revisiones',
  {
    id: integer().primaryKey({ autoIncrement: true }),
    paciente_id: integer()
      .notNull()
      .references(() => pacientes.id),
    fecha: text().default(hoy),
    peso: real(),
    talla: real(),
    envergadura: real(),
    pl_bicipital: real(),
    pl_tricipital: real(),
    pl_subescapular: real(),
    pl_supraespinal: real(),
    pl_supracrestal: real(),
    pl_abdominal: real(),
    pl_muslo_int: real(),
    pl_pierna_med: real(),
    per_antebrazo: real(),
    per_brazo_rel: real(),
    per_brazo_cont: real(),
    per_hombros: real(),
    per_pecho: real(),
    per_cintura: real(),
    per_caderas: real(),
    per_muslo: real(),
    per_muslo_cont: real(),
    per_gemelo: real(),
    notas: text(),
  },
  (t) => [index('idx_revisiones_paciente').on(t.paciente_id)],
)

export const fotos = sqliteTable(
  'fotos',
  {
    id: integer().primaryKey({ autoIncrement: true }),
    paciente_id: integer()
      .notNull()
      .references(() => pacientes.id),
    filename: text().notNull(),
    nota: text(),
    fecha: text().default(ahora),
  },
  (t) => [index('idx_fotos_paciente').on(t.paciente_id)],
)

export const stock_categorias = sqliteTable('stock_categorias', {
  id: integer().primaryKey({ autoIncrement: true }),
  nombre: text().notNull(),
})

export const stock_proveedores = sqliteTable('stock_proveedores', {
  id: integer().primaryKey({ autoIncrement: true }),
  nombre: text().notNull(),
  telefono: text(),
  email: text(),
  notas: text(),
})

export const stock_productos = sqliteTable(
  'stock_productos',
  {
    id: integer().primaryKey({ autoIncrement: true }),
    nombre: text().notNull(),
    categoria_id: integer().references(() => stock_categorias.id),
    proveedor_id: integer().references(() => stock_proveedores.id),
    precio_coste: real().notNull().default(0),
    precio_venta: real().notNull().default(0),
    unidad: text().default('ud'),
    stock_minimo: real().notNull().default(0),
    activo: integer().notNull().default(1),
    creado: text().default(ahora),
  },
  (t) => [index('idx_productos_categoria').on(t.categoria_id), index('idx_productos_proveedor').on(t.proveedor_id)],
)

export const stock_compras = sqliteTable(
  'stock_compras',
  {
    id: integer().primaryKey({ autoIncrement: true }),
    fecha: text().default(hoy),
    proveedor_id: integer().references(() => stock_proveedores.id),
    notas: text(),
    total: real().notNull().default(0),
  },
  (t) => [index('idx_compras_proveedor').on(t.proveedor_id)],
)

export const stock_compras_lineas = sqliteTable(
  'stock_compras_lineas',
  {
    id: integer().primaryKey({ autoIncrement: true }),
    compra_id: integer()
      .notNull()
      .references(() => stock_compras.id),
    producto_id: integer()
      .notNull()
      .references(() => stock_productos.id),
    cantidad: real().notNull(),
    precio_unitario: real().notNull().default(0),
  },
  (t) => [index('idx_compras_lineas_compra').on(t.compra_id), index('idx_compras_lineas_producto').on(t.producto_id)],
)

export const stock_ventas = sqliteTable(
  'stock_ventas',
  {
    id: integer().primaryKey({ autoIncrement: true }),
    fecha: text().default(hoy),
    paciente_id: integer().references(() => pacientes.id),
    notas: text(),
    total: real().notNull().default(0),
  },
  (t) => [index('idx_ventas_paciente').on(t.paciente_id)],
)

export const stock_ventas_lineas = sqliteTable(
  'stock_ventas_lineas',
  {
    id: integer().primaryKey({ autoIncrement: true }),
    venta_id: integer()
      .notNull()
      .references(() => stock_ventas.id),
    producto_id: integer()
      .notNull()
      .references(() => stock_productos.id),
    cantidad: real().notNull(),
    precio_unitario: real().notNull().default(0),
  },
  (t) => [index('idx_ventas_lineas_venta').on(t.venta_id), index('idx_ventas_lineas_producto').on(t.producto_id)],
)

export const stock_mermas = sqliteTable(
  'stock_mermas',
  {
    id: integer().primaryKey({ autoIncrement: true }),
    producto_id: integer()
      .notNull()
      .references(() => stock_productos.id),
    proveedor_id: integer().references(() => stock_proveedores.id),
    cantidad: real().notNull().default(1),
    motivo: text({ enum: MOTIVOS_MERMA }).notNull(),
    fecha: text(),
    notas: text(),
    creado: text().default(ahora),
  },
  (t) => [
    index('idx_mermas_producto').on(t.producto_id),
    check('stock_mermas_motivo', sql`${t.motivo} IN ('caducidad', 'accidente_rotura', 'devolucion_cliente')`),
  ],
)

export const usuarios = sqliteTable('usuarios', {
  id: integer().primaryKey({ autoIncrement: true }),
  usuario: text().notNull().unique(),
  password_hash: text().notNull(),
  rol: text({ enum: ROLES }).notNull().default('user'),
  creado: text().default(ahora),
})

// Sesiones en servidor: la cookie lleva un token y aquí se guarda solo su SHA-256.
export const sesiones = sqliteTable(
  'sesiones',
  {
    token_hash: text().primaryKey(),
    usuario_id: integer()
      .notNull()
      .references(() => usuarios.id, { onDelete: 'cascade' }),
    expira: integer().notNull(),
  },
  (t) => [index('idx_sesiones_usuario').on(t.usuario_id)],
)

export const audit_log = sqliteTable(
  'audit_log',
  {
    id: integer().primaryKey({ autoIncrement: true }),
    fecha: text().default(ahora),
    usuario: text(),
    metodo: text().notNull(),
    ruta: text().notNull(),
    estado: integer().notNull(),
  },
  (t) => [index('idx_audit_fecha').on(t.fecha)],
)
