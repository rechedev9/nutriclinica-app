import { cp, mkdir, rm } from 'node:fs/promises'
import { join, relative, resolve } from 'node:path'

// Build de NutriClínica: construye la SPA y compila un binario autónomo por plataforma
// con la SPA embebida. Uso: bun run compilar [filtro...]  (p. ej. `bun run compilar linux`).

const raiz = resolve(import.meta.dir, '..')
const salida = join(raiz, 'dist')
const spa = join(raiz, 'frontend', 'dist')
const temporal = join(salida, '.compilar')
const deploy = join(raiz, 'deploy')

const OBJETIVOS = [
  { target: 'bun-windows-x64', archivo: 'NutriClinica-win-amd64.exe' },
  { target: 'bun-darwin-arm64', archivo: 'NutriClinica-mac-arm64' },
  { target: 'bun-darwin-x64', archivo: 'NutriClinica-mac-amd64' },
  { target: 'bun-linux-x64', archivo: 'NutriClinica-linux-amd64' },
] as const

async function ejecutar(comando: string[], cwd: string): Promise<void> {
  const proceso = Bun.spawn(comando, { cwd, stdout: 'inherit', stderr: 'inherit' })
  if ((await proceso.exited) !== 0) throw new Error(`Falló: ${comando.join(' ')}`)
}

// Los import con `type: 'file'` embeben cada archivo tal cual; su valor es la ruta interna.
async function escribirEntrada(): Promise<string> {
  const rutas = (await Array.fromAsync(new Bun.Glob('**/*').scan({ cwd: spa }))).map((r) => r.replaceAll('\\', '/'))
  if (!rutas.includes('index.html')) throw new Error('La SPA no se ha construido (falta frontend/dist/index.html)')
  const desdeTemporal = (destino: string) => relative(temporal, destino).replaceAll('\\', '/')
  const imports = rutas.map((r, i) => `import a${i} from '${desdeTemporal(join(spa, r))}' with { type: 'file' }`)
  const mapa = rutas.map((r, i) => `  ${JSON.stringify(r)}: a${i},`)
  const fuente = [
    `import { arrancar } from '${desdeTemporal(join(raiz, 'backend/src/arranque.ts'))}'`,
    `import { spaDeArchivos } from '${desdeTemporal(join(raiz, 'backend/src/spa.ts'))}'`,
    ...imports,
    '',
    'await arrancar(spaDeArchivos({',
    ...mapa,
    '}))',
    '',
  ].join('\n')
  const entrada = join(temporal, 'entrada.ts')
  await Bun.write(entrada, fuente)
  return entrada
}

async function compilar(entrada: string, objetivo: (typeof OBJETIVOS)[number]): Promise<void> {
  console.log(`    -> ${objetivo.target}`)
  const comando = ['bun', 'build', '--compile', '--minify', `--target=${objetivo.target}`]
  // El icono del .exe solo se puede incrustar compilando desde Windows.
  if (objetivo.target === 'bun-windows-x64' && process.platform === 'win32') {
    comando.push(`--windows-icon=${join(raiz, 'icono_nutri.ico')}`)
  }
  comando.push(`--outfile=${join(salida, objetivo.archivo)}`, entrada)
  await ejecutar(comando, raiz)
}

async function ensamblar(carpeta: string, archivos: [origen: string, nombre: string][]): Promise<void> {
  await mkdir(carpeta, { recursive: true })
  for (const [origen, nombre] of archivos) await cp(origen, join(carpeta, nombre))
}

const filtros = Bun.argv.slice(2)
const objetivos = OBJETIVOS.filter((o) => filtros.length === 0 || filtros.some((f) => o.archivo.includes(f)))
if (objetivos.length === 0) throw new Error(`Ningún objetivo coincide con: ${filtros.join(', ')}`)

console.log('==> Build del frontend...')
await ejecutar(['bun', 'run', 'build'], join(raiz, 'frontend'))

console.log('==> Compilando binarios...')
await mkdir(temporal, { recursive: true })
const entrada = await escribirEntrada()
for (const objetivo of objetivos) await compilar(entrada, objetivo)
await rm(temporal, { recursive: true })

const hechos = new Set<string>(objetivos.map((o) => o.archivo))
if (hechos.has('NutriClinica-win-amd64.exe')) {
  await ensamblar(join(salida, 'NutriClinica-Windows'), [
    [join(salida, 'NutriClinica-win-amd64.exe'), 'NutriClinica.exe'],
    [join(raiz, 'icono_nutri.ico'), 'icono_nutri.ico'],
    [join(deploy, 'Crear acceso directo.bat'), 'Crear acceso directo.bat'],
    [join(deploy, 'crear-acceso-directo.ps1'), 'crear-acceso-directo.ps1'],
    [join(deploy, 'LEEME.txt'), 'LEEME.txt'],
  ])
}
if (hechos.has('NutriClinica-mac-arm64') && hechos.has('NutriClinica-mac-amd64')) {
  await ensamblar(join(salida, 'NutriClinica-macOS'), [
    [join(salida, 'NutriClinica-mac-arm64'), 'NutriClinica-mac-arm64'],
    [join(salida, 'NutriClinica-mac-amd64'), 'NutriClinica-mac-amd64'],
    [join(deploy, 'NutriClinica.command'), 'NutriClinica.command'],
    [join(deploy, 'LEEME.txt'), 'LEEME.txt'],
  ])
}

console.log(`==> Listo: ${salida}`)
