import { existsSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { crearApp } from './app'
import { leerOpciones, prepararDatos } from './config'
import type { Contexto } from './contexto'
import { abrirBD } from './db/cliente'
import { sembrarStock, sembrarUsuarios, usuariosConPasswordInicial } from './db/semilla'
import { rutaSegura } from './lib/rutas'
import { spaEmbebida } from './spa-embebida'

// spaDeCarpeta sirve la SPA construida en disco (ejecución desde el código fuente).
function spaDeCarpeta(carpeta: string): Contexto['spa'] {
  if (!existsSync(join(carpeta, 'index.html'))) return null
  return async (ruta) => {
    const destino = rutaSegura(carpeta, ruta)
    if (destino === null) return null
    const archivo = Bun.file(destino)
    return (await archivo.exists()) ? archivo : null
  }
}

function abrirNavegador(url: string): void {
  const comandos: Record<string, string[]> = {
    win32: ['cmd', '/c', 'start', '', url],
    darwin: ['open', url],
  }
  try {
    Bun.spawn(comandos[process.platform] ?? ['xdg-open', url], { stdout: 'ignore', stderr: 'ignore' })
  } catch (error) {
    console.warn('No se pudo abrir el navegador:', error)
  }
}

function puertoOcupado(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'EADDRINUSE'
}

const opciones = leerOpciones(Bun.argv.slice(2))
const { rutaBD, fotosDir } = prepararDatos(opciones.dataDir)
console.log(`Directorio de datos: ${opciones.dataDir}`)

const db = abrirBD(rutaBD)
await sembrarUsuarios(db)
sembrarStock(db)
const pendientes = await usuariosConPasswordInicial(db)
if (pendientes.length > 0) {
  console.warn(
    `AVISO DE SEGURIDAD: los usuarios ${pendientes.join(', ')} conservan su contraseña por defecto. ` +
      'Cámbiala en la app (sección Usuarios) antes de usar datos reales.',
  )
}

const spa = spaEmbebida() ?? spaDeCarpeta(resolve(import.meta.dir, '../../frontend/dist'))
if (spa === null) console.warn('AVISO: no hay interfaz construida. Usa el servidor de Vite o ejecuta el build.')

const app = crearApp({ db, fotosDir, https: opciones.https, spa })
try {
  app.listen({ hostname: opciones.host, port: opciones.port })
} catch (error) {
  if (!puertoOcupado(error)) throw error
  console.warn(`Puerto ${opciones.port} ocupado, usando uno libre...`)
  app.listen({ hostname: opciones.host, port: 0 })
}

const puerto = app.server?.port ?? opciones.port
// Escuchando en todas las interfaces, el navegador local entra por 127.0.0.1.
const anfitrion = opciones.host === '0.0.0.0' ? '127.0.0.1' : opciones.host
console.log(`\n  NutriClínica corriendo en http://${opciones.host}:${puerto}\n`)
if (opciones.abrirNavegador) setTimeout(() => abrirNavegador(`http://${anfitrion}:${puerto}`), 600)

async function cerrar(): Promise<void> {
  console.log('Cerrando NutriClínica...')
  await app.stop()
  db.$client.close()
  process.exit(0)
}
process.on('SIGINT', cerrar)
process.on('SIGTERM', cerrar)
