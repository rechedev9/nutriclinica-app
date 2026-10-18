import { Elysia } from 'elysia'
import type { Contexto } from './contexto'
import { registrarAuditoria } from './datos/auditoria'
import { ErrorHttp } from './lib/errores'
import { actorDe, anotacionDe } from './modulos/acceso'
import { moduloAuth } from './modulos/auth'
import { moduloExportar } from './modulos/exportar'
import { moduloFotos } from './modulos/fotos'
import { moduloInicio } from './modulos/inicio'
import { moduloPacientes } from './modulos/pacientes'
import { moduloStock } from './modulos/stock'
import { moduloUsuarios } from './modulos/usuarios'
import { moduloVentas } from './modulos/ventas'

const CABECERAS_SEGURIDAD = {
  'x-content-type-options': 'nosniff',
  'x-frame-options': 'DENY',
  'referrer-policy': 'no-referrer',
  'content-security-policy':
    "default-src 'self'; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; " +
    "script-src 'self' 'unsafe-inline'; font-src 'self' data:; object-src 'none'; " +
    "base-uri 'self'; frame-ancestors 'none'",
}

// Se auditan las mutaciones y las exportaciones (salida de datos), no las lecturas.
function esAuditable(metodo: string, ruta: string): boolean {
  if (ruta === '/api/estado') return false
  if (metodo === 'GET') return ruta.startsWith('/api/exportar')
  return ['POST', 'PUT', 'DELETE'].includes(metodo) && ruta.startsWith('/api/')
}

function accionAuditoria(metodo: string, ruta: string): string {
  if (metodo === 'POST' && ruta === '/api/login') return 'Acceso'
  if (metodo === 'POST' && ruta === '/api/logout') return 'Salida'
  return metodo
}

// codigoSqlite busca el código de error de SQLite en el error o en su causa (Drizzle lo envuelve).
function codigoSqlite(error: unknown): string {
  if (typeof error !== 'object' || error === null) return ''
  if ('code' in error && typeof error.code === 'string' && error.code.startsWith('SQLITE_')) return error.code
  return 'cause' in error ? codigoSqlite(error.cause) : ''
}

function traducirError(codigo: string | number, error: unknown): { estado: number; mensaje: string } {
  if (error instanceof ErrorHttp) return { estado: error.estado, mensaje: error.message }
  if (codigo === 'VALIDATION') {
    const enRuta = typeof error === 'object' && error !== null && 'type' in error && error.type === 'params'
    return { estado: 400, mensaje: enRuta ? 'id inválido' : 'Datos no válidos' }
  }
  if (codigo === 'PARSE') return { estado: 400, mensaje: 'JSON inválido' }
  if (codigo === 'NOT_FOUND') return { estado: 404, mensaje: 'No encontrado' }
  const sqlite = codigoSqlite(error)
  if (sqlite === 'SQLITE_CONSTRAINT_FOREIGNKEY') {
    return { estado: 400, mensaje: 'El registro hace referencia a un elemento que no existe' }
  }
  if (sqlite.startsWith('SQLITE_CONSTRAINT')) return { estado: 409, mensaje: 'El registro ya existe' }
  console.error('Error interno:', error)
  return { estado: 500, mensaje: 'Error interno del servidor' }
}

async function servirSpa(ctx: Contexto, ruta: string): Promise<Response> {
  if (ruta.startsWith('api/') || ruta.startsWith('fotos/')) throw new ErrorHttp(404, 'No encontrado')
  if (ctx.spa === null) {
    throw new ErrorHttp(404, 'Interfaz no disponible: en desarrollo usa el servidor de Vite')
  }
  const estatico = ruta === '' ? null : await ctx.spa(ruta)
  // Cualquier otra ruta es del router del cliente: se sirve index.html.
  const archivo = estatico ?? (await ctx.spa('index.html'))
  if (archivo === null) throw new ErrorHttp(404, 'No encontrado')
  // Los assets llevan hash en el nombre; index.html debe revalidarse siempre.
  const cache = estatico !== null && ruta.startsWith('assets/') ? 'public, max-age=31536000, immutable' : 'no-cache'
  return new Response(archivo, { headers: { 'cache-control': cache } })
}

export function crearApp(ctx: Contexto) {
  return new Elysia()
    .onRequest(({ set }) => {
      Object.assign(set.headers, CABECERAS_SEGURIDAD)
    })
    .onError(({ code, error, set }) => {
      const { estado, mensaje } = traducirError(code, error)
      set.status = estado
      return { error: mensaje }
    })
    .onAfterResponse(({ request, set }) => {
      const ruta = new URL(request.url).pathname
      if (!esAuditable(request.method, ruta)) return
      const estado = typeof set.status === 'number' ? set.status : 200
      const { pacienteId, detalle } = anotacionDe(request)
      try {
        registrarAuditoria(ctx.db, {
          usuario: actorDe(request),
          metodo: accionAuditoria(request.method, ruta),
          ruta,
          estado,
          paciente_id: pacienteId,
          detalle,
        })
      } catch (error) {
        console.error(`auditoría: no se pudo registrar ${request.method} ${ruta}:`, error)
      }
    })
    .use(moduloAuth(ctx))
    .use(moduloPacientes(ctx))
    .use(moduloFotos(ctx))
    .use(moduloExportar(ctx))
    .use(moduloStock(ctx))
    .use(moduloUsuarios(ctx))
    .use(moduloVentas(ctx))
    .use(moduloInicio(ctx))
    .get('/', () => servirSpa(ctx, ''))
    .get('/*', ({ params }) => servirSpa(ctx, params['*']))
}

export type App = ReturnType<typeof crearApp>
