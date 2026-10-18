import { METODOS_PAGO, MOTIVOS_MERMA, ROLES, TIPOS_IVA } from './db/esquema'
import { ErrorHttp } from './lib/errores'
import { fechaLocal, parseFecha, sumarDias } from './lib/fechas'
import { vacioANulo } from './lib/texto'
import type {
  ajustesEntrada,
  anulacionEntrada,
  cierreEntrada,
  compraEntrada,
  correccionVentaEntrada,
  devolucionEntrada,
  lineaEntrada,
  lineaVentaEntrada,
  mermaEntrada,
  pacienteEntrada,
  pagoEntrada,
  productoEntrada,
  proveedorEntrada,
  recuentoEntrada,
  revisionEntrada,
  ventaEntrada,
} from './modelos'

// Reglas de negocio de las entradas. Equivalen a los esquemas Zod del frontend y
// responden siempre 400 con el mensaje del contrato.

const MIN_PASSWORD = 8

export const PLIEGUES = [
  'pl_bicipital',
  'pl_tricipital',
  'pl_subescapular',
  'pl_supraespinal',
  'pl_supracrestal',
  'pl_abdominal',
  'pl_muslo_int',
  'pl_pierna_med',
] as const

export const PERIMETROS = [
  'per_antebrazo',
  'per_brazo_rel',
  'per_brazo_cont',
  'per_hombros',
  'per_pecho',
  'per_cintura',
  'per_caderas',
  'per_muslo',
  'per_muslo_cont',
  'per_gemelo',
] as const

type Numero = number | null | undefined

function invalido(mensaje: string): never {
  throw new ErrorHttp(400, mensaje)
}

function fueraDeRango(valor: Numero, rango: { min: number; max: number }): boolean {
  return valor !== null && valor !== undefined && (valor < rango.min || valor > rango.max)
}

// Medidas que deben ser positivas y no superar el máximo.
function fueraDeMedida(valor: Numero, max: number): boolean {
  return valor !== null && valor !== undefined && (valor <= 0 || valor > max)
}

export function validarPassword(password: string): void {
  if ([...password].length < MIN_PASSWORD) invalido('La contraseña debe tener al menos 8 caracteres')
}

export function normalizarRol(rol: string | null | undefined): (typeof ROLES)[number] {
  if (rol === null || rol === undefined || rol === '') return 'user'
  const valido = ROLES.find((r) => r === rol)
  if (valido === undefined) invalido('El rol no es válido')
  return valido
}

export function normalizarPaciente(entrada: typeof pacienteEntrada.static, hoy: Date) {
  const nombre = (entrada.nombre ?? '').trim()
  if (nombre === '') invalido('El nombre es obligatorio')
  const fecha_nac = vacioANulo(entrada.fecha_nac)
  if (fecha_nac !== null) {
    const dia = parseFecha(fecha_nac)
    if (dia === null || dia < '1900-01-01' || dia > fechaLocal(hoy)) {
      invalido('La fecha de nacimiento no es válida')
    }
  }
  if (fueraDeRango(entrada.peso, { min: 1, max: 500 })) invalido('El peso debe estar entre 1 y 500 kg')
  if (fueraDeRango(entrada.talla, { min: 30, max: 260 })) invalido('La talla debe estar entre 30 y 260 cm')
  return {
    nombre,
    fecha_nac,
    sexo: vacioANulo(entrada.sexo),
    dni: vacioANulo(entrada.dni),
    telefono: vacioANulo(entrada.telefono),
    email: vacioANulo(entrada.email),
    objetivo: vacioANulo(entrada.objetivo),
    actividad_fisica: vacioANulo(entrada.actividad_fisica),
    intolerancias: vacioANulo(entrada.intolerancias),
    patologias: vacioANulo(entrada.patologias),
    notas: vacioANulo(entrada.notas),
    peso: entrada.peso ?? null,
    talla: entrada.talla ?? null,
    grupo_sanguineo: vacioANulo(entrada.grupo_sanguineo),
    consentimiento: entrada.consentimiento === 1 ? 1 : 0,
  }
}

export function normalizarRevision(entrada: typeof revisionEntrada.static, hoy: Date) {
  const fecha = vacioANulo(entrada.fecha)
  if (fecha === null) invalido('La fecha de la revisión es obligatoria')
  const dia = parseFecha(fecha)
  if (dia === null) invalido('La fecha de la revisión no es válida')
  // Se admite el día siguiente por si el reloj del navegador y el del servidor difieren.
  if (dia > sumarDias(fechaLocal(hoy), 1)) invalido('La fecha de la revisión no puede ser futura')
  if (fueraDeRango(entrada.peso, { min: 1, max: 500 })) invalido('El peso debe estar entre 1 y 500 kg')
  if (fueraDeRango(entrada.talla, { min: 30, max: 260 })) invalido('La talla debe estar entre 30 y 260 cm')
  if (fueraDeRango(entrada.envergadura, { min: 30, max: 300 })) {
    invalido('La envergadura debe estar entre 30 y 300 cm')
  }
  if (PLIEGUES.some((campo) => fueraDeMedida(entrada[campo], 100))) {
    invalido('Los pliegues deben estar entre 0 y 100 mm')
  }
  if (PERIMETROS.some((campo) => fueraDeMedida(entrada[campo], 300))) {
    invalido('Los perímetros deben estar entre 0 y 300 cm')
  }
  const datos = {
    fecha,
    peso: entrada.peso ?? null,
    talla: entrada.talla ?? null,
    envergadura: entrada.envergadura ?? null,
    pl_bicipital: entrada.pl_bicipital ?? null,
    pl_tricipital: entrada.pl_tricipital ?? null,
    pl_subescapular: entrada.pl_subescapular ?? null,
    pl_supraespinal: entrada.pl_supraespinal ?? null,
    pl_supracrestal: entrada.pl_supracrestal ?? null,
    pl_abdominal: entrada.pl_abdominal ?? null,
    pl_muslo_int: entrada.pl_muslo_int ?? null,
    pl_pierna_med: entrada.pl_pierna_med ?? null,
    per_antebrazo: entrada.per_antebrazo ?? null,
    per_brazo_rel: entrada.per_brazo_rel ?? null,
    per_brazo_cont: entrada.per_brazo_cont ?? null,
    per_hombros: entrada.per_hombros ?? null,
    per_pecho: entrada.per_pecho ?? null,
    per_cintura: entrada.per_cintura ?? null,
    per_caderas: entrada.per_caderas ?? null,
    per_muslo: entrada.per_muslo ?? null,
    per_muslo_cont: entrada.per_muslo_cont ?? null,
    per_gemelo: entrada.per_gemelo ?? null,
    notas: vacioANulo(entrada.notas),
  }
  const hayMedida = Object.values(datos).some((valor) => typeof valor === 'number')
  if (!hayMedida && datos.notas === null) {
    invalido('La revisión debe incluir al menos una medida o una nota')
  }
  return datos
}

export function normalizarProducto(entrada: typeof productoEntrada.static) {
  const nombre = (entrada.nombre ?? '').trim()
  if (nombre === '') invalido('El nombre es obligatorio')
  const precio_coste = entrada.precio_coste ?? 0
  const precio_venta = entrada.precio_venta ?? 0
  const stock_minimo = entrada.stock_minimo ?? 0
  if (precio_coste < 0 || precio_venta < 0) invalido('El precio no puede ser negativo')
  if (stock_minimo < 0) invalido('El stock mínimo no puede ser negativo')
  const iva = TIPOS_IVA.find((tipo) => tipo === (entrada.iva ?? 10))
  if (iva === undefined) invalido('El IVA debe ser 0, 4, 10 o 21 %')
  return {
    nombre,
    categoria_id: entrada.categoria_id ?? null,
    proveedor_id: entrada.proveedor_id ?? null,
    precio_coste,
    precio_venta,
    unidad: vacioANulo(entrada.unidad) ?? 'ud',
    stock_minimo,
    codigo_barras: vacioANulo(entrada.codigo_barras?.trim()),
    iva,
  }
}

export function normalizarProveedor(entrada: typeof proveedorEntrada.static) {
  const nombre = (entrada.nombre ?? '').trim()
  if (nombre === '') invalido('El nombre es obligatorio')
  return {
    nombre,
    telefono: vacioANulo(entrada.telefono),
    email: vacioANulo(entrada.email),
    notas: vacioANulo(entrada.notas),
  }
}

export function normalizarCategoria(nombre: string | undefined): string {
  const limpio = (nombre ?? '').trim()
  if (limpio === '') invalido('El nombre es obligatorio')
  return limpio
}

function exigirLineas<L>(lineas: L[] | undefined, entidad: 'compra' | 'venta' | 'devolución'): L[] {
  if (lineas === undefined || lineas.length === 0) invalido(`La ${entidad} debe tener al menos una línea`)
  return lineas
}

function normalizarLinea(linea: typeof lineaEntrada.static) {
  const producto_id = linea.producto_id ?? 0
  const cantidad = linea.cantidad ?? 0
  const precio_unitario = linea.precio_unitario ?? 0
  if (producto_id === 0) invalido('El producto es obligatorio')
  if (cantidad <= 0) invalido('La cantidad debe ser mayor que 0')
  if (precio_unitario < 0) invalido('El precio no puede ser negativo')
  return { producto_id, cantidad, precio_unitario }
}

function normalizarLineaVenta(linea: typeof lineaVentaEntrada.static) {
  const base = normalizarLinea(linea)
  const descuento = linea.descuento ?? 0
  if (descuento < 0) invalido('El descuento no puede ser negativo')
  if (descuento > base.cantidad * base.precio_unitario + 0.005) {
    invalido('El descuento de una línea no puede superar su importe')
  }
  return { ...base, descuento }
}

function normalizarMetodo(metodo: string | null | undefined, mensaje: string) {
  const valido = METODOS_PAGO.find((m) => m === metodo)
  if (valido === undefined) invalido(mensaje)
  return valido
}

function normalizarPagos(pagos: (typeof pagoEntrada.static)[] | undefined) {
  return (pagos ?? []).map((pago) => {
    const metodo = normalizarMetodo(pago.metodo, 'El método de pago no es válido')
    const importe = pago.importe ?? 0
    if (importe <= 0) invalido('El importe de cada pago debe ser mayor que 0')
    return { metodo, importe }
  })
}

function motivoObligatorio(motivo: string | null | undefined, mensaje: string): string {
  const limpio = (motivo ?? '').trim()
  if (limpio === '') invalido(mensaje)
  return limpio
}

// Día de una operación de caja: hoy si no llega, y nunca después de hoy + margen.
function normalizarDia(texto: string | null | undefined, rango: { hoy: Date; margen: number }): string {
  const valor = vacioANulo(texto)
  if (valor === null) return fechaLocal(rango.hoy)
  const dia = parseFecha(valor)
  if (dia === null) invalido('La fecha no es válida')
  if (dia > sumarDias(fechaLocal(rango.hoy), rango.margen)) invalido('La fecha no puede ser futura')
  return dia
}

export function normalizarCompra(entrada: typeof compraEntrada.static) {
  return {
    fecha: vacioANulo(entrada.fecha),
    proveedor_id: entrada.proveedor_id ?? null,
    notas: vacioANulo(entrada.notas),
    lineas: exigirLineas(entrada.lineas, 'compra').map(normalizarLinea),
  }
}

export function normalizarVenta(entrada: typeof ventaEntrada.static, hoy: Date) {
  const descuento_total = entrada.descuento_total ?? 0
  if (descuento_total < 0) invalido('El descuento no puede ser negativo')
  const entregado = entrada.entregado ?? null
  if (entregado !== null && entregado < 0) invalido('El efectivo entregado no puede ser negativo')
  return {
    // Se admite el día siguiente por si el reloj del navegador y el del servidor difieren.
    fecha: normalizarDia(entrada.fecha, { hoy, margen: 1 }),
    paciente_id: entrada.paciente_id ?? null,
    notas: vacioANulo(entrada.notas),
    lineas: exigirLineas(entrada.lineas, 'venta').map(normalizarLineaVenta),
    descuento_total,
    pagos: normalizarPagos(entrada.pagos),
    entregado,
  }
}

export function normalizarCorreccionVenta(entrada: typeof correccionVentaEntrada.static) {
  return {
    paciente_id: entrada.paciente_id ?? null,
    notas: vacioANulo(entrada.notas),
    pagos: normalizarPagos(entrada.pagos),
  }
}

export function normalizarAnulacion(entrada: typeof anulacionEntrada.static): string {
  return motivoObligatorio(entrada.motivo, 'Indica el motivo de la anulación')
}

export function normalizarDevolucion(entrada: typeof devolucionEntrada.static) {
  return {
    motivo: motivoObligatorio(entrada.motivo, 'Indica el motivo de la devolución'),
    metodo_reembolso: normalizarMetodo(entrada.metodo_reembolso, 'Indica cómo se devuelve el dinero'),
    notas: vacioANulo(entrada.notas),
    lineas: exigirLineas(entrada.lineas, 'devolución').map((linea) => {
      const venta_linea_id = linea.venta_linea_id ?? 0
      const cantidad = linea.cantidad ?? 0
      if (venta_linea_id === 0) invalido('Indica qué línea de la venta se devuelve')
      if (cantidad <= 0) invalido('La cantidad debe ser mayor que 0')
      return { venta_linea_id, cantidad, reingresa: linea.reingresa ?? true }
    }),
  }
}

export function normalizarCierre(entrada: typeof cierreEntrada.static, hoy: Date) {
  const fondo_inicial = entrada.fondo_inicial ?? 0
  const efectivo_contado = entrada.efectivo_contado ?? null
  if (fondo_inicial < 0) invalido('El fondo de caja no puede ser negativo')
  if (efectivo_contado === null) invalido('Indica el efectivo contado')
  if (efectivo_contado < 0) invalido('El efectivo contado no puede ser negativo')
  return {
    fecha: normalizarDia(entrada.fecha, { hoy, margen: 0 }),
    fondo_inicial,
    efectivo_contado,
    notas: vacioANulo(entrada.notas),
  }
}

function textoLimpio(valor: string | null | undefined): string {
  return vacioANulo(valor)?.trim() ?? ''
}

export function normalizarAjustes(entrada: typeof ajustesEntrada.static) {
  return {
    tienda_nombre: textoLimpio(entrada.tienda_nombre),
    tienda_nif: textoLimpio(entrada.tienda_nif),
    tienda_direccion: textoLimpio(entrada.tienda_direccion),
    tienda_telefono: textoLimpio(entrada.tienda_telefono),
    ticket_pie: textoLimpio(entrada.ticket_pie),
  }
}

export function normalizarMerma(entrada: typeof mermaEntrada.static) {
  const producto_id = entrada.producto_id ?? 0
  const cantidad = entrada.cantidad ?? 0
  if (producto_id === 0) invalido('El producto es obligatorio')
  if (cantidad <= 0) invalido('La cantidad debe ser mayor que 0')
  const motivo = MOTIVOS_MERMA.find((m) => m === entrada.motivo)
  if (motivo === undefined) invalido('El motivo de la merma no es válido')
  return {
    producto_id,
    proveedor_id: entrada.proveedor_id ?? null,
    cantidad,
    motivo,
    fecha: vacioANulo(entrada.fecha),
    notas: vacioANulo(entrada.notas),
  }
}

// Un recuento puede dejar un producto a 0, pero no contar dos veces el mismo.
export function normalizarRecuento(entrada: typeof recuentoEntrada.static) {
  const lineas = entrada.lineas ?? []
  if (lineas.length === 0) invalido('El recuento debe tener al menos un producto')
  const normalizadas = lineas.map((linea) => {
    const producto_id = linea.producto_id ?? 0
    const contado = linea.contado ?? null
    if (producto_id === 0) invalido('El producto es obligatorio')
    if (contado === null) invalido('Indica las unidades contadas')
    if (contado < 0) invalido('Las unidades contadas no pueden ser negativas')
    return { producto_id, contado }
  })
  if (new Set(normalizadas.map((l) => l.producto_id)).size !== normalizadas.length) {
    invalido('Un producto aparece dos veces en el recuento')
  }
  return {
    motivo: motivoObligatorio(entrada.motivo, 'Indica el motivo del recuento'),
    notas: vacioANulo(entrada.notas),
    lineas: normalizadas,
  }
}

export type PacienteDatos = ReturnType<typeof normalizarPaciente>
export type RevisionDatos = ReturnType<typeof normalizarRevision>
export type ProductoDatos = ReturnType<typeof normalizarProducto>
export type ProveedorDatos = ReturnType<typeof normalizarProveedor>
export type CompraDatos = ReturnType<typeof normalizarCompra>
export type VentaDatos = ReturnType<typeof normalizarVenta>
export type CorreccionVentaDatos = ReturnType<typeof normalizarCorreccionVenta>
export type DevolucionDatos = ReturnType<typeof normalizarDevolucion>
export type CierreDatos = ReturnType<typeof normalizarCierre>
export type AjustesDatos = ReturnType<typeof normalizarAjustes>
export type MermaDatos = ReturnType<typeof normalizarMerma>
export type RecuentoDatos = ReturnType<typeof normalizarRecuento>
