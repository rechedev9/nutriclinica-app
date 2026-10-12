import { count } from 'drizzle-orm'
import { hashPassword } from '../lib/password'
import type { BD } from './cliente'
import {
  stock_categorias,
  stock_compras,
  stock_compras_lineas,
  stock_mermas,
  stock_productos,
  stock_proveedores,
  stock_ventas,
  stock_ventas_lineas,
  usuarios,
} from './esquema'

// Usuarios de desarrollo de una instalación nueva. Hay que cambiar sus contraseñas antes del uso real.
const USUARIOS_INICIALES = [
  { usuario: 'admin', password: 'admin', rol: 'admin' },
  { usuario: 'Jose', password: 'Jose123', rol: 'user' },
] as const

const CATEGORIAS = [
  'Proteínas',
  'Creatina y Aminoácidos',
  'Pre-entreno',
  'Vitaminas y Minerales',
  'Quemagrasas',
  'Barritas y Snacks',
  'Bebidas Deportivas',
  'Colágeno y Articulaciones',
]

const PROVEEDORES = [
  { nombre: 'HSN Store', telefono: '958 461 743', email: 'pedidos@hsn.es', notas: 'Proveedor online principal' },
  {
    nombre: 'Amix Nutrition',
    telefono: '936 788 200',
    email: 'comercial@amix-nutrition.com',
    notas: 'Distribución directa',
  },
  { nombre: 'Weider Spain', telefono: '916 452 100', email: 'pedidos@weider.es', notas: 'Pedidos mínimo 200 €' },
  {
    nombre: 'Best Protein',
    telefono: '917 234 567',
    email: 'info@bestprotein.es',
    notas: 'Especialistas en proteína vegana',
  },
]

// [nombre, categoría, proveedor, coste, venta, unidad, stock mínimo]
const PRODUCTOS: [string, string, string, number, number, string, number][] = [
  ['Whey Protein Concentrada 1 kg', 'Proteínas', 'HSN Store', 18.9, 27.9, 'kg', 5],
  ['Whey Protein Isolada 1 kg', 'Proteínas', 'HSN Store', 24.5, 34.9, 'kg', 3],
  ['Proteína Vegana 1 kg', 'Proteínas', 'Best Protein', 22, 32.9, 'kg', 2],
  ['Caseína Micelar 1 kg', 'Proteínas', 'Amix Nutrition', 20.5, 29.9, 'kg', 2],
  ['Creatina Monohidrato 500g', 'Creatina y Aminoácidos', 'HSN Store', 8.5, 12.9, 'ud', 5],
  ['BCAA 2:1:1 300g', 'Creatina y Aminoácidos', 'Weider Spain', 12, 17.9, 'ud', 3],
  ['L-Glutamina 400g', 'Creatina y Aminoácidos', 'HSN Store', 9.8, 14.9, 'ud', 3],
  ['Pre-Entreno Xplode 300g', 'Pre-entreno', 'Weider Spain', 19.5, 27.9, 'ud', 3],
  ['Multivitamínico Daily 60 cáps', 'Vitaminas y Minerales', 'Amix Nutrition', 8.9, 13.9, 'ud', 5],
  ['Omega-3 Fish Oil 90 cáps', 'Vitaminas y Minerales', 'HSN Store', 7.5, 11.9, 'ud', 5],
  ['Vitamina D3 2000UI 120 cáps', 'Vitaminas y Minerales', 'HSN Store', 4.9, 7.9, 'ud', 5],
  ['Magnesio 400mg 120 cáps', 'Vitaminas y Minerales', 'HSN Store', 5.9, 8.9, 'ud', 5],
  ['Zinc + Vitamina C 120 cáps', 'Vitaminas y Minerales', 'HSN Store', 4.5, 6.9, 'ud', 5],
  ['L-Carnitina 1000mg 90 cáps', 'Quemagrasas', 'Amix Nutrition', 11, 16.9, 'ud', 3],
  ['CLA 1000mg 90 cáps', 'Quemagrasas', 'Weider Spain', 9.5, 14.9, 'ud', 3],
  ['Barrita Proteica Chocolate', 'Barritas y Snacks', 'Weider Spain', 1.8, 2.9, 'ud', 20],
  ['Barrita Proteica Vainilla', 'Barritas y Snacks', 'Best Protein', 1.9, 2.99, 'ud', 20],
  ['Isotónica Naranja 500ml', 'Bebidas Deportivas', 'Weider Spain', 1.2, 1.9, 'ud', 24],
  ['Bebida Energética Pro 500g', 'Bebidas Deportivas', 'HSN Store', 14.5, 19.9, 'ud', 3],
  ['Colágeno Hidrolizado 400g', 'Colágeno y Articulaciones', 'Best Protein', 16.5, 23.9, 'ud', 3],
]

// Cada línea es [producto, cantidad, precio unitario].
type LineaSemilla = [string, number, number]

const COMPRAS: { fecha: string; proveedor: string; notas: string; lineas: LineaSemilla[] }[] = [
  {
    fecha: '2025-12-10',
    proveedor: 'HSN Store',
    notas: 'Pedido diciembre: proteínas y suplementos base',
    lineas: [
      ['Whey Protein Concentrada 1 kg', 10, 18.9],
      ['Creatina Monohidrato 500g', 10, 8.5],
      ['Omega-3 Fish Oil 90 cáps', 8, 7.5],
      ['L-Glutamina 400g', 6, 9.8],
    ],
  },
  {
    fecha: '2025-12-15',
    proveedor: 'Amix Nutrition',
    notas: 'Reposición diciembre: vitaminas y aminoácidos',
    lineas: [
      ['BCAA 2:1:1 300g', 8, 12],
      ['Multivitamínico Daily 60 cáps', 10, 8.9],
      ['L-Carnitina 1000mg 90 cáps', 6, 11],
    ],
  },
  {
    fecha: '2026-01-05',
    proveedor: 'Weider Spain',
    notas: 'Pedido enero: pre-entreno y snacks',
    lineas: [
      ['Pre-Entreno Xplode 300g', 6, 19.5],
      ['Barrita Proteica Chocolate', 48, 1.8],
      ['Isotónica Naranja 500ml', 36, 1.2],
      ['CLA 1000mg 90 cáps', 6, 9.5],
    ],
  },
  {
    fecha: '2026-01-20',
    proveedor: 'HSN Store',
    notas: 'Reposición enero: whey isolada y micronutrientes',
    lineas: [
      ['Whey Protein Isolada 1 kg', 8, 24.5],
      ['Vitamina D3 2000UI 120 cáps', 12, 4.9],
      ['Magnesio 400mg 120 cáps', 8, 5.9],
      ['Zinc + Vitamina C 120 cáps', 10, 4.5],
    ],
  },
  {
    fecha: '2026-02-10',
    proveedor: 'Best Protein',
    notas: 'Pedido febrero: proteínas veganas y colágeno',
    lineas: [
      ['Proteína Vegana 1 kg', 6, 22],
      ['Barrita Proteica Vainilla', 36, 1.9],
      ['Colágeno Hidrolizado 400g', 6, 16.5],
    ],
  },
]

// Ventas de mostrador (sin paciente asociado).
const VENTAS: { fecha: string; notas: string; lineas: LineaSemilla[] }[] = [
  {
    fecha: '2025-12-12',
    notas: 'Venta mostrador 12-dic',
    lineas: [
      ['Whey Protein Concentrada 1 kg', 1, 27.9],
      ['Creatina Monohidrato 500g', 1, 12.9],
    ],
  },
  {
    fecha: '2025-12-18',
    notas: 'Venta mostrador 18-dic',
    lineas: [
      ['Omega-3 Fish Oil 90 cáps', 2, 11.9],
      ['Vitamina D3 2000UI 120 cáps', 1, 7.9],
      ['Magnesio 400mg 120 cáps', 1, 8.9],
    ],
  },
  {
    fecha: '2026-01-08',
    notas: 'Venta mostrador 8-ene',
    lineas: [
      ['BCAA 2:1:1 300g', 1, 17.9],
      ['L-Glutamina 400g', 1, 14.9],
      ['Pre-Entreno Xplode 300g', 1, 27.9],
    ],
  },
  {
    fecha: '2026-01-15',
    notas: 'Venta mostrador 15-ene',
    lineas: [
      ['Barrita Proteica Chocolate', 6, 2.9],
      ['Isotónica Naranja 500ml', 4, 1.9],
    ],
  },
  {
    fecha: '2026-01-22',
    notas: 'Venta mostrador 22-ene',
    lineas: [
      ['Whey Protein Concentrada 1 kg', 2, 27.9],
      ['Multivitamínico Daily 60 cáps', 1, 13.9],
    ],
  },
  {
    fecha: '2026-02-05',
    notas: 'Venta mostrador 5-feb',
    lineas: [
      ['L-Carnitina 1000mg 90 cáps', 1, 16.9],
      ['CLA 1000mg 90 cáps', 1, 14.9],
    ],
  },
  {
    fecha: '2026-02-14',
    notas: 'Venta mostrador 14-feb',
    lineas: [
      ['Colágeno Hidrolizado 400g', 1, 23.9],
      ['Magnesio 400mg 120 cáps', 1, 8.9],
    ],
  },
  {
    fecha: '2026-03-01',
    notas: 'Venta mostrador 1-mar',
    lineas: [
      ['Proteína Vegana 1 kg', 1, 32.9],
      ['Barrita Proteica Vainilla', 4, 2.99],
    ],
  },
]

const MERMAS = [
  {
    producto: 'Barrita Proteica Chocolate',
    proveedor: 'Weider Spain',
    cantidad: 3,
    motivo: 'caducidad',
    fecha: '2026-01-16',
    notas: 'Lote caducado en enero, retirado del expositor',
  },
  {
    producto: 'Isotónica Naranja 500ml',
    proveedor: 'Weider Spain',
    cantidad: 2,
    motivo: 'accidente_rotura',
    fecha: '2026-02-01',
    notas: 'Rotura de botellas en almacén',
  },
  {
    producto: 'Creatina Monohidrato 500g',
    proveedor: null,
    cantidad: 1,
    motivo: 'devolucion_cliente',
    fecha: '2026-01-26',
    notas: 'Devolución por cambio de producto, bote abierto',
  },
] as const

function exigir(mapa: Map<string, number>, nombre: string): number {
  const id = mapa.get(nombre)
  if (id === undefined) throw new Error(`Semilla: no existe «${nombre}»`)
  return id
}

function total(lineas: LineaSemilla[]): number {
  const suma = lineas.reduce((acumulado, [, cantidad, precio]) => acumulado + cantidad * precio, 0)
  return Math.round(suma * 100) / 100
}

// sembrarUsuarios crea los usuarios iniciales si la tabla está vacía.
export async function sembrarUsuarios(db: BD): Promise<void> {
  const cuantos = db.select({ n: count() }).from(usuarios).get()?.n ?? 0
  if (cuantos > 0) return
  const filas = await Promise.all(
    USUARIOS_INICIALES.map(async ({ usuario, password, rol }) => ({
      usuario,
      rol,
      password_hash: await hashPassword(password),
    })),
  )
  db.insert(usuarios).values(filas).run()
}

// usuariosConPasswordInicial devuelve los usuarios iniciales que aún conservan su contraseña.
export async function usuariosConPasswordInicial(db: BD): Promise<string[]> {
  const filas = db.select().from(usuarios).all()
  const pendientes = await Promise.all(
    USUARIOS_INICIALES.map(async ({ usuario, password }) => {
      const fila = filas.find((f) => f.usuario === usuario)
      const conserva = fila !== undefined && (await Bun.password.verify(password, fila.password_hash))
      return conserva ? usuario : null
    }),
  )
  return pendientes.filter((u) => u !== null)
}

// sembrarStock inserta el catálogo de ejemplo en una instalación sin datos de stock.
export function sembrarStock(db: BD): void {
  db.transaction((tx) => {
    const hayCategorias = tx.select({ id: stock_categorias.id }).from(stock_categorias).get() !== undefined
    const hayProductos = tx.select({ id: stock_productos.id }).from(stock_productos).get() !== undefined
    if (hayCategorias || hayProductos) return

    const categorias = new Map(
      tx
        .insert(stock_categorias)
        .values(CATEGORIAS.map((nombre) => ({ nombre })))
        .returning()
        .all()
        .map((c) => [c.nombre, c.id]),
    )
    const proveedores = new Map(
      tx
        .insert(stock_proveedores)
        .values(PROVEEDORES)
        .returning()
        .all()
        .map((p) => [p.nombre, p.id]),
    )
    const productos = new Map(
      tx
        .insert(stock_productos)
        .values(
          PRODUCTOS.map(([nombre, categoria, proveedor, precio_coste, precio_venta, unidad, stock_minimo]) => ({
            nombre,
            categoria_id: exigir(categorias, categoria),
            proveedor_id: exigir(proveedores, proveedor),
            precio_coste,
            precio_venta,
            unidad,
            stock_minimo,
          })),
        )
        .returning()
        .all()
        .map((p) => [p.nombre, p.id]),
    )
    const lineasDe = (lineas: LineaSemilla[]) =>
      lineas.map(([producto, cantidad, precio_unitario]) => ({
        producto_id: exigir(productos, producto),
        cantidad,
        precio_unitario,
      }))

    for (const compra of COMPRAS) {
      const { id } = tx
        .insert(stock_compras)
        .values({
          fecha: compra.fecha,
          proveedor_id: exigir(proveedores, compra.proveedor),
          notas: compra.notas,
          total: total(compra.lineas),
        })
        .returning({ id: stock_compras.id })
        .get()
      tx.insert(stock_compras_lineas)
        .values(lineasDe(compra.lineas).map((l) => ({ ...l, compra_id: id })))
        .run()
    }
    for (const venta of VENTAS) {
      const { id } = tx
        .insert(stock_ventas)
        .values({ fecha: venta.fecha, notas: venta.notas, total: total(venta.lineas) })
        .returning({ id: stock_ventas.id })
        .get()
      tx.insert(stock_ventas_lineas)
        .values(lineasDe(venta.lineas).map((l) => ({ ...l, venta_id: id })))
        .run()
    }
    tx.insert(stock_mermas)
      .values(
        MERMAS.map(({ producto, proveedor, ...merma }) => ({
          ...merma,
          producto_id: exigir(productos, producto),
          proveedor_id: proveedor === null ? null : exigir(proveedores, proveedor),
        })),
      )
      .run()
  })
}
