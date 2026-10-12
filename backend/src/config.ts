import { accessSync, constants, mkdirSync } from 'node:fs'
import { homedir } from 'node:os'
import { basename, dirname, join, resolve } from 'node:path'
import { parseArgs } from 'node:util'

export interface Opciones {
  dataDir: string
  host: string
  port: number
  abrirNavegador: boolean
  https: boolean
}

// true cuando corre como binario compilado (bun build --compile) y no con el runtime de Bun.
export function esBinario(): boolean {
  return !/^bun(\.exe)?$/i.test(basename(process.execPath))
}

function carpetaConfigUsuario(): string {
  if (process.platform === 'win32') return process.env.APPDATA ?? join(homedir(), 'AppData', 'Roaming')
  if (process.platform === 'darwin') return join(homedir(), 'Library', 'Application Support')
  return process.env.XDG_CONFIG_HOME ?? join(homedir(), '.config')
}

function esEscribible(carpeta: string): boolean {
  try {
    accessSync(carpeta, constants.W_OK)
    return true
  } catch {
    return false
  }
}

// Prioridad: --data-dir, NUTRICLINICA_DATA, la carpeta del ejecutable (instalación portable)
// y, si no se puede escribir en ella, la carpeta de configuración del usuario.
function resolverDataDir(explicito: string | undefined): string {
  const indicado = explicito ?? process.env.NUTRICLINICA_DATA
  if (indicado !== undefined && indicado !== '') return resolve(indicado)
  const portable = esBinario() ? dirname(process.execPath) : process.cwd()
  return esEscribible(portable) ? portable : join(carpetaConfigUsuario(), 'NutriClinica')
}

export function leerOpciones(argumentos: string[]): Opciones {
  const { values } = parseArgs({
    args: argumentos,
    options: {
      'data-dir': { type: 'string' },
      host: { type: 'string', default: '127.0.0.1' },
      port: { type: 'string', default: '5001' },
      'no-browser': { type: 'boolean', default: false },
      https: { type: 'boolean', default: false },
    },
  })
  const port = Number.parseInt(values.port, 10)
  if (Number.isNaN(port) || port < 0 || port > 65535) throw new Error(`Puerto no válido: ${values.port}`)
  return {
    dataDir: resolverDataDir(values['data-dir']),
    host: values.host,
    port,
    abrirNavegador: !values['no-browser'],
    https: values.https,
  }
}

// prepararDatos crea <dataDir>/bbdd y <dataDir>/fotos y devuelve sus rutas.
export function prepararDatos(dataDir: string): { rutaBD: string; fotosDir: string } {
  const fotosDir = join(dataDir, 'fotos')
  mkdirSync(join(dataDir, 'bbdd'), { recursive: true })
  mkdirSync(fotosDir, { recursive: true })
  return { rutaBD: join(dataDir, 'bbdd', 'nutriclinica.db'), fotosDir }
}
