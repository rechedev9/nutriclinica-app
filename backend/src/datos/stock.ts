import { desc, eq, getTableColumns, inArray, ne, sql } from 'drizzle-orm'
import type { BD, Ejecutor } from '../db/cliente'
import {
  pacientes,
  stock_categorias,
  stock_compras,
  stock_compras_lineas,
  stock_mermas,
  stock_productos,
  stock_proveedores,
  stock_ventas,
  stock_ventas_lineas,
} from '../db/esquema'
import { ErrorHttp } from '../lib/errores'
import { fechaLocal } from '../lib/fechas'
import { porNombre } from '../lib/texto'
import type { CompraDatos, MermaDatos, ProductoDatos, ProveedorDatos, VentaDatos } from '../validacion'

type LineaDatos = CompraDatos['lineas'][number]

const INMEDIATA = { behavior: 'immediate' } as const

// Existencias de un producto: compras - ventas - mermas. No se guarda, siempre se deriva.
// La columna exterior va calificada a mano (Drizzle no lo hace en un select de una tabla).
const stockActual = sql`(
  coalesce((select sum(cantidad) from stock_compras_lineas where producto_id = ${stock_productos}.id), 0)
  - coalesce((select sum(cantidad) from stock_ventas_lineas where producto_id = ${stock_productos}.id), 0)
  - coalesce((select sum(cantidad) from stock_mermas where producto_id = ${stock_productos}.id), 0)
)`.mapWith(Number)

// --- Almacén y productos ---

// Los productos activos con sus existencias calculadas.
export function listarAlmacen(db: BD) {
  const filas = db
    .select({
      id: stock_productos.id,
      nombre: stock_productos.nombre,
      unidad: stock_productos.unidad,
      precio_coste: stock_productos.precio_coste,
      precio_venta: stock_productos.precio_venta,
      stock_minimo: stock_productos.stock_minimo,
      categoria: stock_categorias.nombre,
      proveedor_nombre: stock_proveedores.nombre,
      stock_actual: stockActual,
      creado: stock_productos.creado,
    })
    .from(stock_productos)
    .leftJoin(stock_categorias, eq(stock_categorias.id, stock_productos.categoria_id))
    .leftJoin(stock_proveedores, eq(stock_proveedores.id, stock_productos.proveedor_id))
    .where(eq(stock_productos.activo, 1))
    .all()
  return porNombre(filas, (p) => p.nombre)
}

export function listarProductos(db: BD) {
  const filas = db
    .select({
      ...getTableColumns(stock_productos),
      categoria: stock_categorias.nombre,
      proveedor_nombre: stock_proveedores.nombre,
    })
    .from(stock_productos)
    .leftJoin(stock_categorias, eq(stock_categorias.id, stock_productos.categoria_id))
    .leftJoin(stock_proveedores, eq(stock_proveedores.id, stock_productos.proveedor_id))
    .where(eq(stock_productos.activo, 1))
    .all()
  return porNombre(filas, (p) => p.nombre)
}

export function crearProducto(db: BD, datos: ProductoDatos) {
  return db.insert(stock_productos).values(datos).returning().get()
}

export function actualizarProducto(db: BD, id: number, datos: ProductoDatos) {
  const fila = db.update(stock_productos).set(datos).where(eq(stock_productos.id, id)).returning().all()[0]
  if (fila === undefined) throw new ErrorHttp(404, 'Producto no encontrado')
  return fila
}

// darDeBajaProducto lo marca inactivo: sus compras y ventas siguen apuntando a él.
export function darDeBajaProducto(db: BD, id: number): void {
  db.update(stock_productos).set({ activo: 0 }).where(eq(stock_productos.id, id)).run()
}

// --- Categorías ---

export function listarCategorias(db: BD) {
  return porNombre(db.select().from(stock_categorias).all(), (c) => c.nombre)
}

function normalizado(nombre: string): string {
  return nombre.trim().toLocaleLowerCase('es')
}

// La comparación se hace aquí porque lower() de SQLite solo entiende ASCII.
function comprobarCategoriaLibre(tx: Ejecutor, nombre: string, excepto: number): void {
  const otras = tx.select().from(stock_categorias).where(ne(stock_categorias.id, excepto)).all()
  if (otras.some((c) => normalizado(c.nombre) === normalizado(nombre))) {
    throw new ErrorHttp(409, 'Ya existe una categoría con ese nombre')
  }
}

export function crearCategoria(db: BD, nombre: string) {
  return db.transaction((tx) => {
    comprobarCategoriaLibre(tx, nombre, 0)
    return tx.insert(stock_categorias).values({ nombre }).returning().get()
  }, INMEDIATA)
}

export function actualizarCategoria(db: BD, id: number, nombre: string) {
  return db.transaction((tx) => {
    comprobarCategoriaLibre(tx, nombre, id)
    tx.update(stock_categorias).set({ nombre }).where(eq(stock_categorias.id, id)).run()
    return { id, nombre }
  }, INMEDIATA)
}

export function eliminarCategoria(db: BD, id: number): void {
  db.transaction((tx) => {
    const enUso = tx
      .select({ id: stock_productos.id })
      .from(stock_productos)
      .where(eq(stock_productos.categoria_id, id))
      .get()
    if (enUso !== undefined) {
      throw new ErrorHttp(409, 'No se puede eliminar: hay productos que usan esta categoría')
    }
    tx.delete(stock_categorias).where(eq(stock_categorias.id, id)).run()
  }, INMEDIATA)
}

// --- Proveedores ---

export function listarProveedores(db: BD) {
  return porNombre(db.select().from(stock_proveedores).all(), (p) => p.nombre)
}

export function crearProveedor(db: BD, datos: ProveedorDatos) {
  return db.insert(stock_proveedores).values(datos).returning().get()
}

export function actualizarProveedor(db: BD, id: number, datos: ProveedorDatos) {
  const fila = db.update(stock_proveedores).set(datos).where(eq(stock_proveedores.id, id)).returning().all()[0]
  if (fila === undefined) throw new ErrorHttp(404, 'Proveedor no encontrado')
  return fila
}

function proveedorEnUso(tx: Ejecutor, id: number): boolean {
  const producto = tx
    .select({ id: stock_productos.id })
    .from(stock_productos)
    .where(eq(stock_productos.proveedor_id, id))
    .get()
  const compra = tx.select({ id: stock_compras.id }).from(stock_compras).where(eq(stock_compras.proveedor_id, id)).get()
  const merma = tx.select({ id: stock_mermas.id }).from(stock_mermas).where(eq(stock_mermas.proveedor_id, id)).get()
  return producto !== undefined || compra !== undefined || merma !== undefined
}

export function eliminarProveedor(db: BD, id: number): void {
  db.transaction((tx) => {
    if (proveedorEnUso(tx, id)) {
      throw new ErrorHttp(409, 'No se puede eliminar: hay productos o compras de este proveedor')
    }
    tx.delete(stock_proveedores).where(eq(stock_proveedores.id, id)).run()
  }, INMEDIATA)
}

// --- Reglas de stock ---

function totalDe(lineas: LineaDatos[]): number {
  return lineas.reduce((suma, l) => suma + l.cantidad * l.precio_unitario, 0)
}

function idsDe(lineas: { producto_id: number }[]): number[] {
  return [...new Set(lineas.map((l) => l.producto_id))].toSorted((a, b) => a - b)
}

function productoConStock(tx: Ejecutor, id: number) {
  return tx
    .select({ nombre: stock_productos.nombre, activo: stock_productos.activo, stock: stockActual })
    .from(stock_productos)
    .where(eq(stock_productos.id, id))
    .get()
}

// Una salida (venta o merma) exige que el producto exista, esté activo y haya existencias.
function verificarStockSalida(tx: Ejecutor, lineas: { producto_id: number; cantidad: number }[]): void {
  for (const id of idsDe(lineas)) {
    const producto = productoConStock(tx, id)
    if (producto === undefined || producto.activo !== 1) {
      throw new ErrorHttp(400, 'El producto no existe o está dado de baja')
    }
    const pedido = lineas.filter((l) => l.producto_id === id).reduce((suma, l) => suma + l.cantidad, 0)
    if (pedido > producto.stock) {
      throw new ErrorHttp(409, `Stock insuficiente de «${producto.nombre}»: quedan ${producto.stock}`)
    }
  }
}

// Borrar o reducir una compra no puede dejar existencias negativas.
function comprobarStockNoNegativo(tx: Ejecutor, ids: number[]): void {
  for (const id of ids) {
    const producto = productoConStock(tx, id)
    if (producto !== undefined && producto.stock < 0) {
      throw new ErrorHttp(
        409,
        `No se puede modificar la compra: las unidades de «${producto.nombre}» ya se han vendido o dado de baja`,
      )
    }
  }
}

function comprobarProductosExisten(tx: Ejecutor, lineas: LineaDatos[]): void {
  const ids = idsDe(lineas)
  const filas = tx
    .select({ id: stock_productos.id })
    .from(stock_productos)
    .where(inArray(stock_productos.id, ids))
    .all()
  if (filas.length !== ids.length) throw new ErrorHttp(400, 'El producto no existe o está dado de baja')
}

// Reparte las líneas por su compra o venta; cada padre recibe al menos una lista vacía.
function agrupar<L extends { padre: number }>(ids: number[], lineas: L[]) {
  const porPadre = new Map(ids.map((id) => [id, new Array<Omit<L, 'padre'>>()]))
  for (const { padre, ...linea } of lineas) porPadre.get(padre)?.push(linea)
  return porPadre
}

// --- Compras ---

function productosDeCompra(tx: Ejecutor, compraId: number) {
  return tx
    .select({ producto_id: stock_compras_lineas.producto_id })
    .from(stock_compras_lineas)
    .where(eq(stock_compras_lineas.compra_id, compraId))
    .all()
}

export function listarCompras(db: BD) {
  const compras = db
    .select({ ...getTableColumns(stock_compras), proveedor_nombre: stock_proveedores.nombre })
    .from(stock_compras)
    .leftJoin(stock_proveedores, eq(stock_proveedores.id, stock_compras.proveedor_id))
    .orderBy(desc(stock_compras.fecha), desc(stock_compras.id))
    .all()
  const ids = compras.map((c) => c.id)
  // Todas las líneas en una sola consulta, para evitar una por compra.
  const lineas = db
    .select({
      padre: stock_compras_lineas.compra_id,
      id: stock_compras_lineas.id,
      producto_id: stock_compras_lineas.producto_id,
      cantidad: stock_compras_lineas.cantidad,
      precio_unitario: stock_compras_lineas.precio_unitario,
      producto_nombre: stock_productos.nombre,
      unidad: stock_productos.unidad,
    })
    .from(stock_compras_lineas)
    .innerJoin(stock_productos, eq(stock_productos.id, stock_compras_lineas.producto_id))
    .orderBy(stock_compras_lineas.id)
    .all()
  const porCompra = agrupar(ids, lineas)
  return compras.map((c) => ({ ...c, lineas: porCompra.get(c.id) ?? [] }))
}

export function crearCompra(db: BD, datos: CompraDatos): number {
  const { lineas, ...cabecera } = datos
  return db.transaction((tx) => {
    comprobarProductosExisten(tx, lineas)
    const { id } = tx
      .insert(stock_compras)
      .values({ ...cabecera, fecha: cabecera.fecha ?? fechaLocal(new Date()), total: totalDe(lineas) })
      .returning({ id: stock_compras.id })
      .get()
    tx.insert(stock_compras_lineas)
      .values(lineas.map((l) => ({ ...l, compra_id: id })))
      .run()
    return id
  }, INMEDIATA)
}

// actualizarCompra reemplaza los datos y las líneas de una compra.
export function actualizarCompra(db: BD, id: number, datos: CompraDatos): void {
  const { lineas, ...cabecera } = datos
  db.transaction((tx) => {
    const afectados = idsDe([...productosDeCompra(tx, id), ...lineas])
    comprobarProductosExisten(tx, lineas)
    const cambiadas = tx
      .update(stock_compras)
      .set({ ...cabecera, total: totalDe(lineas) })
      .where(eq(stock_compras.id, id))
      .returning({ id: stock_compras.id })
      .all()
    if (cambiadas.length === 0) throw new ErrorHttp(404, 'Compra no encontrada')
    tx.delete(stock_compras_lineas).where(eq(stock_compras_lineas.compra_id, id)).run()
    tx.insert(stock_compras_lineas)
      .values(lineas.map((l) => ({ ...l, compra_id: id })))
      .run()
    comprobarStockNoNegativo(tx, afectados)
  }, INMEDIATA)
}

export function eliminarCompra(db: BD, id: number): void {
  db.transaction((tx) => {
    const afectados = idsDe(productosDeCompra(tx, id))
    tx.delete(stock_compras_lineas).where(eq(stock_compras_lineas.compra_id, id)).run()
    tx.delete(stock_compras).where(eq(stock_compras.id, id)).run()
    comprobarStockNoNegativo(tx, afectados)
  }, INMEDIATA)
}

// --- Ventas ---

export function listarVentas(db: BD) {
  const ventas = db
    .select({ ...getTableColumns(stock_ventas), paciente_nombre: pacientes.nombre })
    .from(stock_ventas)
    .leftJoin(pacientes, eq(pacientes.id, stock_ventas.paciente_id))
    .orderBy(desc(stock_ventas.fecha), desc(stock_ventas.id))
    .all()
  const ids = ventas.map((v) => v.id)
  const lineas = db
    .select({
      padre: stock_ventas_lineas.venta_id,
      id: stock_ventas_lineas.id,
      producto_id: stock_ventas_lineas.producto_id,
      cantidad: stock_ventas_lineas.cantidad,
      precio_unitario: stock_ventas_lineas.precio_unitario,
      producto_nombre: stock_productos.nombre,
      unidad: stock_productos.unidad,
    })
    .from(stock_ventas_lineas)
    .innerJoin(stock_productos, eq(stock_productos.id, stock_ventas_lineas.producto_id))
    .orderBy(stock_ventas_lineas.id)
    .all()
  const porVenta = agrupar(ids, lineas)
  return ventas.map((v) => ({ ...v, lineas: porVenta.get(v.id) ?? [] }))
}

export function crearVenta(db: BD, datos: VentaDatos): number {
  const { lineas, ...cabecera } = datos
  return db.transaction((tx) => {
    verificarStockSalida(tx, lineas)
    const { id } = tx
      .insert(stock_ventas)
      .values({ ...cabecera, fecha: cabecera.fecha ?? fechaLocal(new Date()), total: totalDe(lineas) })
      .returning({ id: stock_ventas.id })
      .get()
    tx.insert(stock_ventas_lineas)
      .values(lineas.map((l) => ({ ...l, venta_id: id })))
      .run()
    return id
  }, INMEDIATA)
}

export function eliminarVenta(db: BD, id: number): void {
  db.transaction((tx) => {
    tx.delete(stock_ventas_lineas).where(eq(stock_ventas_lineas.venta_id, id)).run()
    tx.delete(stock_ventas).where(eq(stock_ventas.id, id)).run()
  }, INMEDIATA)
}

// --- Mermas ---

export function listarMermas(db: BD) {
  return db
    .select({
      ...getTableColumns(stock_mermas),
      producto_nombre: stock_productos.nombre,
      proveedor_nombre: stock_proveedores.nombre,
      unidad: stock_productos.unidad,
    })
    .from(stock_mermas)
    .innerJoin(stock_productos, eq(stock_productos.id, stock_mermas.producto_id))
    .leftJoin(stock_proveedores, eq(stock_proveedores.id, stock_mermas.proveedor_id))
    .orderBy(desc(stock_mermas.fecha), desc(stock_mermas.id))
    .all()
}

export function crearMerma(db: BD, datos: MermaDatos): number {
  return db.transaction((tx) => {
    verificarStockSalida(tx, [datos])
    const { id } = tx
      .insert(stock_mermas)
      .values({ ...datos, fecha: datos.fecha ?? fechaLocal(new Date()) })
      .returning({ id: stock_mermas.id })
      .get()
    return id
  }, INMEDIATA)
}

export function eliminarMerma(db: BD, id: number): void {
  db.delete(stock_mermas).where(eq(stock_mermas.id, id)).run()
}
