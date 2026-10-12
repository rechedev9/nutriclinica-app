import { treaty } from '@elysiajs/eden'
import type { App } from '@nutriclinica/backend'

// Cliente HTTP tipado de extremo a extremo: Eden deriva rutas, cuerpos y respuestas
// del tipo de la app Elysia del backend. Mismo origen → cookies de sesión incluidas.

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
    this.name = 'ApiError'
  }
}

// mensajeError devuelve un texto apto para mostrar al usuario. Para un ApiError
// usa el mensaje curado del servidor (ya genérico en los 500); para cualquier
// otro error (red, parseo) devuelve un texto neutro y no expone detalles JS.
export function mensajeError(e: unknown): string {
  if (e instanceof ApiError) return e.message
  return 'Ha ocurrido un error. Inténtalo de nuevo.'
}

// Estado 0: no hubo respuesta HTTP (servidor caído, sin red).
export const MENSAJE_SIN_CONEXION = 'No se puede conectar con el servidor'

export function esErrorDeRed(e: unknown): boolean {
  return e instanceof ApiError && e.status === 0
}

// El servidor responde 401 de forma legítima en estas rutas (sondeo de sesión y login).
const RUTAS_SIN_MANEJO_401 = ['/api/me', '/api/login', '/api/logout']

let manejadorSesionCaducada: (() => void) | null = null

// registrarManejadorSesionCaducada fija qué hacer ante un 401 inesperado.
export function registrarManejadorSesionCaducada(fn: () => void) {
  manejadorSesionCaducada = fn
}

// Evita repetir el aviso cuando varias peticiones en vuelo fallan con 401 a la vez.
let sesionCaducadaGestionada = false

// Un login correcto rearma el manejo de sesión caducada para la próxima vez.
export function sesionIniciada() {
  sesionCaducadaGestionada = false
}

function tratar401(respuesta: Response) {
  if (respuesta.status !== 401) return
  const ruta = new URL(respuesta.url).pathname
  if (RUTAS_SIN_MANEJO_401.some((r) => ruta.startsWith(r))) return
  if (sesionCaducadaGestionada) return
  sesionCaducadaGestionada = true
  manejadorSesionCaducada?.()
}

export const servidor = treaty<App>(window.location.origin, {
  // Las fechas viajan como texto AAAA-MM-DD: Eden no debe convertirlas a Date.
  parseDate: false,
  fetch: { credentials: 'include' },
  onResponse: tratar401,
}).api

interface RespuestaEden<T> {
  data: T | null
  error: { status: unknown; value: unknown } | null
  response: unknown
}

// El servidor responde los errores como { error: "mensaje para el usuario" }.
function mensajeDelServidor(estado: number, cuerpo: unknown): string {
  if (typeof cuerpo === 'object' && cuerpo !== null && 'error' in cuerpo && typeof cuerpo.error === 'string') {
    return cuerpo.error
  }
  return `Error ${estado}`
}

// pedir desenvuelve una respuesta de Eden: devuelve los datos o lanza un ApiError.
export async function pedir<T>(promesa: Promise<RespuestaEden<T>>): Promise<T> {
  const { data, error, response } = await promesa
  // Eden no rechaza si falla la red: devuelve un error 503 sin objeto Response.
  if (response === undefined) throw new ApiError(0, MENSAJE_SIN_CONEXION)
  if (error !== null) {
    const estado = Number(error.status)
    throw new ApiError(estado, mensajeDelServidor(estado, error.value))
  }
  if (data === null) throw new ApiError(500, 'Respuesta vacía del servidor')
  return data
}
