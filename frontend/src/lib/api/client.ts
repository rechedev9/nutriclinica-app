// Cliente HTTP tipado sobre fetch. Mismo origen → cookies de sesión incluidas.

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
    this.name = 'ApiError'
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
  const res = await fetch(url, opts)
  if (!res.ok) {
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
  const res = await fetch(`/api/pacientes/${pacienteId}/fotos`, {
    method: 'POST',
    credentials: 'include',
    body: fd,
  })
  if (!res.ok) throw new ApiError(res.status, await parseError(res))
  return res.json()
}
