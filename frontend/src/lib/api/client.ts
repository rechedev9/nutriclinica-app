// Cliente HTTP tipado sobre fetch. Mismo origen → cookies de sesión incluidas.

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

function tratar401(url: string, status: number) {
  if (status !== 401) return
  if (RUTAS_SIN_MANEJO_401.some((r) => url.startsWith(r))) return
  if (sesionCaducadaGestionada) return
  sesionCaducadaGestionada = true
  manejadorSesionCaducada?.()
}

async function fetchConRed(url: string, opts: RequestInit): Promise<Response> {
  try {
    return await fetch(url, opts)
  } catch {
    throw new ApiError(0, MENSAJE_SIN_CONEXION)
  }
}

async function parseError(res: Response): Promise<string> {
  try {
    const data = await res.json()
    if (data && typeof data.error === 'string') return data.error
  } catch {
    /* sin cuerpo JSON */
  }
  return `Error ${res.status}`
}

export async function api<T = unknown>(
  method: string,
  url: string,
  body?: unknown,
): Promise<T> {
  const opts: RequestInit = {
    method,
    credentials: 'include',
    headers: {},
  }
  if (body !== undefined) {
    opts.headers = { 'Content-Type': 'application/json' }
    opts.body = JSON.stringify(body)
  }
  const res = await fetchConRed(url, opts)
  if (!res.ok) {
    tratar401(url, res.status)
    throw new ApiError(res.status, await parseError(res))
  }
  if (res.status === 204) return undefined as T
  const text = await res.text()
  return (text ? JSON.parse(text) : undefined) as T
}

// uploadFoto sube un archivo con FormData (sin Content-Type manual).
export async function uploadFoto(pacienteId: number, file: File, nota: string) {
  const fd = new FormData()
  fd.append('foto', file)
  if (nota) fd.append('nota', nota)
  const url = `/api/pacientes/${pacienteId}/fotos`
  const res = await fetchConRed(url, {
    method: 'POST',
    credentials: 'include',
    body: fd,
  })
  if (!res.ok) {
    tratar401(url, res.status)
    throw new ApiError(res.status, await parseError(res))
  }
  return res.json()
}
