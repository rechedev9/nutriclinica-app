import { MOTIVOS_MERMA, ROLES } from './db/esquema'
import { ErrorHttp } from './lib/errores'
import { fechaLocal, parseFecha, sumarDias } from './lib/fechas'
import { vacioANulo } from './lib/texto'
import type {
  compraEntrada,
  lineaEntrada,
  mermaEntrada,
  pacienteEntrada,
  productoEntrada,
  proveedorEntrada,
  revisionEntrada,
  ventaEntrada,
} from './modelos'

// Reglas de negocio de las entradas. Equivalen a los esquemas Zod del frontend y
// responden siempre 400 con el mensaje del contrato.

export const MIN_PASSWORD = 8

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
  return {
    nombre,
    categoria_id: entrada.categoria_id ?? null,
    proveedor_id: entrada.proveedor_id ?? null,
    precio_coste,
    precio_venta,
    unidad: vacioANulo(entrada.unidad) ?? 'ud',
    stock_minimo,
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

function normalizarLineas(lineas: (typeof lineaEntrada.static)[] | undefined, entidad: 'compra' | 'venta') {
  if (lineas === undefined || lineas.length === 0) invalido(`La ${entidad} debe tener al menos una línea`)
  return lineas.map((linea) => {
    const producto_id = linea.producto_id ?? 0
    const cantidad = linea.cantidad ?? 0
    const precio_unitario = linea.precio_unitario ?? 0
    if (producto_id === 0) invalido('El producto es obligatorio')
    if (cantidad <= 0) invalido('La cantidad debe ser mayor que 0')
    if (precio_unitario < 0) invalido('El precio no puede ser negativo')
    return { producto_id, cantidad, precio_unitario }
  })
}

export function normalizarCompra(entrada: typeof compraEntrada.static) {
  return {
    fecha: vacioANulo(entrada.fecha),
    proveedor_id: entrada.proveedor_id ?? null,
    notas: vacioANulo(entrada.notas),
    lineas: normalizarLineas(entrada.lineas, 'compra'),
  }
}

export function normalizarVenta(entrada: typeof ventaEntrada.static) {
  return {
    fecha: vacioANulo(entrada.fecha),
    paciente_id: entrada.paciente_id ?? null,
    notas: vacioANulo(entrada.notas),
    lineas: normalizarLineas(entrada.lineas, 'venta'),
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

export type PacienteDatos = ReturnType<typeof normalizarPaciente>
export type RevisionDatos = ReturnType<typeof normalizarRevision>
export type ProductoDatos = ReturnType<typeof normalizarProducto>
export type ProveedorDatos = ReturnType<typeof normalizarProveedor>
export type CompraDatos = ReturnType<typeof normalizarCompra>
export type VentaDatos = ReturnType<typeof normalizarVenta>
export type MermaDatos = ReturnType<typeof normalizarMerma>
