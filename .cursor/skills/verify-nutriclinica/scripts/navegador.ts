import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, isAbsolute, relative, resolve } from 'node:path'

interface Pendiente {
  resolver: (valor: unknown) => void
  rechazar: (error: Error) => void
}

const estadoDir = argumento(0)
const baseUrl = argumento(1)
const evidenciaDir = argumento(2)
const comando = argumento(3)
const opciones = leerOpciones(process.argv.slice(6))

const pagina = await abrirPagina()
const pendientes = new Map<number, Pendiente>()
let siguiente = 0

pagina.addEventListener('message', (evento) => {
  if (typeof evento.data !== 'string') return
  const mensaje = leerJson(evento.data)
  if (!esRegistro(mensaje) || typeof mensaje.id !== 'number') return
  const pendiente = pendientes.get(mensaje.id)
  if (pendiente === undefined) return
  pendientes.delete(mensaje.id)
  if (esRegistro(mensaje.error) && typeof mensaje.error.message === 'string') {
    pendiente.rechazar(new Error(mensaje.error.message))
    return
  }
  pendiente.resolver(mensaje.result)
})

try {
  await ejecutar(comando)
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
} finally {
  pagina.close()
}

function argumento(indice: number): string {
  const valor = process.argv[indice + 2]
  if (valor === undefined || valor === '') {
    console.error('uso: navegador.ts <estado> <url> <evidencia> <comando> [opciones]')
    process.exit(1)
  }
  return valor
}

async function abrirPagina(): Promise<WebSocket> {
  const puerto = readFileSync(resolve(estadoDir, 'chrome.port'), 'utf8').trim()
  const origen = `http://127.0.0.1:${puerto}`
  const guardado = resolve(estadoDir, 'chrome.target')
  if (existsSync(guardado)) {
    const conocido = await socketDe(origen, readFileSync(guardado, 'utf8').trim())
    if (conocido !== '') return abrirSocket(conocido)
  }
  const creada = await crearPestana(origen)
  const id = typeof creada.id === 'string' ? creada.id : ''
  const socket = typeof creada.webSocketDebuggerUrl === 'string' ? creada.webSocketDebuggerUrl : ''
  if (id === '' || socket === '') throw new Error('Chrome no abrió una pestaña')
  writeFileSync(guardado, id)
  return abrirSocket(socket)
}

async function crearPestana(origen: string): Promise<Record<string, unknown>> {
  const destino = `${origen}/json/new?${encodeURIComponent('about:blank')}`
  const put = await fetch(destino, { method: 'PUT' })
  if (put.ok) {
    const cuerpo = leerJson(await put.text())
    if (esRegistro(cuerpo)) return cuerpo
  }
  const get = await fetch(destino)
  const cuerpo = leerJson(await get.text())
  if (!esRegistro(cuerpo)) throw new Error('Chrome rechazó abrir una pestaña')
  return cuerpo
}

async function socketDe(origen: string, id: string): Promise<string> {
  if (id === '') return ''
  const lista = leerJson(await (await fetch(`${origen}/json/list`)).text())
  if (!Array.isArray(lista)) return ''
  const paginaConocida = lista.find((entrada) => esRegistro(entrada) && entrada.id === id)
  if (!esRegistro(paginaConocida) || typeof paginaConocida.webSocketDebuggerUrl !== 'string') return ''
  return paginaConocida.webSocketDebuggerUrl
}

function abrirSocket(url: string): Promise<WebSocket> {
  const socket = new WebSocket(url)
  return new Promise((resolver, rechazar) => {
    const tope = setTimeout(() => rechazar(new Error('Chrome no acepta el socket de la pestaña')), 10000)
    socket.addEventListener('open', () => {
      clearTimeout(tope)
      resolver(socket)
    })
    socket.addEventListener('error', () => {
      clearTimeout(tope)
      rechazar(new Error('no se pudo abrir el socket de la pestaña'))
    })
  })
}

function enviar(method: string, params: Record<string, unknown>): Promise<unknown> {
  const id = siguiente + 1
  siguiente = id
  return new Promise((resolver, rechazar) => {
    const tope = setTimeout(() => {
      pendientes.delete(id)
      rechazar(new Error(`CDP sin respuesta: ${method}`))
    }, 20000)
    pendientes.set(id, {
      resolver: (valor) => {
        clearTimeout(tope)
        resolver(valor)
      },
      rechazar: (error) => {
        clearTimeout(tope)
        rechazar(error)
      },
    })
    pagina.send(JSON.stringify({ id, method, params }))
  })
}

async function ejecutar(nombre: string): Promise<void> {
  if (nombre === 'goto') {
    const destino = new URL(obligatorio('path'), baseUrl).toString()
    await enviar('Page.navigate', { url: destino })
    await esperar('document.readyState === "complete"', 15000)
    console.log(destino)
    return
  }
  if (nombre === 'fill') {
    const modo = modoRelleno()
    const resultado = await evaluar(expresionRellenar(modo.modo, modo.clave, obligatorio('value')))
    exigirOk(resultado, 'no se pudo rellenar')
    console.log(`relleno ${modo.modo}=${modo.clave}`)
    return
  }
  if (nombre === 'click') {
    const role = obligatorio('role')
    const exacto = opcion('name')
    const contiene = opcion('contains')
    if ((exacto === undefined) === (contiene === undefined)) {
      throw new Error('click necesita --name o --contains, no los dos')
    }
    const resultado = await evaluar(expresionClick(role, exacto ?? contiene ?? '', contiene !== undefined))
    exigirOk(resultado, 'no se pudo pulsar')
    console.log(`pulsado ${role} ${exacto ?? contiene}`)
    return
  }
  if (nombre === 'wait') {
    const texto = opcion('text')
    const ausente = opcion('absent')
    if (texto === undefined && ausente === undefined) throw new Error('wait necesita --text o --absent')
    const segundos = Number(opcion('timeout') ?? '10')
    await esperar(expresionVisible(texto, ausente), (Number.isFinite(segundos) ? segundos : 10) * 1000)
    console.log('visible')
    return
  }
  if (nombre === 'scroll') {
    const texto = obligatorio('text')
    exigirOk(await evaluar(expresionScroll(texto)), 'no se pudo desplazar')
    console.log(`desplazado ${texto}`)
    return
  }
  if (nombre === 'screenshot') {
    const destino = rutaEvidencia(obligatorio('path'))
    const captura = await enviar('Page.captureScreenshot', { format: 'png' })
    const datos = esRegistro(captura) && typeof captura.data === 'string' ? captura.data : ''
    if (datos === '') throw new Error('la captura llegó vacía')
    mkdirSync(dirname(destino), { recursive: true })
    writeFileSync(destino, Buffer.from(datos, 'base64'))
    console.log(destino)
    return
  }
  if (nombre === 'text') {
    const destino = rutaEvidencia(obligatorio('out'))
    const texto = await evaluar('document.body ? document.body.innerText : ""')
    if (typeof texto !== 'string') throw new Error('la página no devolvió texto')
    mkdirSync(dirname(destino), { recursive: true })
    writeFileSync(destino, texto)
    console.log(destino)
    return
  }
  if (nombre === 'fetch') {
    const ruta = obligatorio('path')
    const destino = rutaEvidencia(obligatorio('out'))
    const crudo = await evaluar(expresionFetch(ruta))
    if (!esRegistro(crudo) || typeof crudo.status !== 'number' || typeof crudo.body !== 'string') {
      throw new Error('la página no devolvió la respuesta')
    }
    mkdirSync(dirname(destino), { recursive: true })
    writeFileSync(destino, crudo.body)
    console.log(`${crudo.status} ${destino}`)
    if (crudo.status < 200 || crudo.status >= 300) throw new Error(`GET ${ruta} respondió ${crudo.status}`)
    return
  }
  if (nombre === 'location') {
    const actual = await evaluar('location.pathname + location.search')
    if (typeof actual !== 'string') throw new Error('sin ubicación')
    const patron = opcion('matches')
    if (patron !== undefined && new RegExp(patron).test(actual) === false) {
      throw new Error(`la ruta ${actual} no cumple ${patron}`)
    }
    console.log(actual)
    return
  }
  throw new Error(`comando desconocido: ${nombre}`)
}

function modoRelleno(): { modo: string; clave: string } {
  const pares = [
    ['name', opcion('name')],
    ['label', opcion('label')],
    ['placeholder', opcion('placeholder')],
    ['aria', opcion('aria')],
  ] as const
  const elegido = pares.find((par) => par[1] !== undefined)
  if (elegido === undefined || elegido[1] === undefined) {
    throw new Error('fill necesita --name, --label, --placeholder o --aria, y --value')
  }
  return { modo: elegido[0], clave: elegido[1] }
}

async function evaluar(expression: string): Promise<unknown> {
  const respuesta = await enviar('Runtime.evaluate', {
    expression,
    awaitPromise: true,
    returnByValue: true,
  })
  if (!esRegistro(respuesta)) throw new Error('respuesta CDP vacía')
  if (respuesta.exceptionDetails !== undefined) {
    throw new Error(`error en la página: ${JSON.stringify(respuesta.exceptionDetails)}`)
  }
  const result = respuesta.result
  if (!esRegistro(result) || !('value' in result)) return undefined
  return result.value
}

async function esperar(expression: string, ms: number): Promise<void> {
  const limite = Date.now() + ms
  let ultimo = ''
  while (Date.now() < limite) {
    const valor = await evaluar(expression)
    if (valor === true) return
    if (typeof valor === 'string') ultimo = valor
    await new Promise((resolver) => setTimeout(resolver, 200))
  }
  throw new Error(ultimo === '' ? `tiempo agotado esperando: ${expression.slice(0, 180)}` : ultimo)
}

function exigirOk(valor: unknown, prefijo: string): void {
  if (!esRegistro(valor) || valor.ok !== true) {
    throw new Error(`${prefijo}: ${esRegistro(valor) ? JSON.stringify(valor) : 'sin respuesta'}`)
  }
}

function rutaEvidencia(pedido: string): string {
  const destino = isAbsolute(pedido) ? pedido : resolve(evidenciaDir, pedido)
  const rel = relative(resolve(evidenciaDir), destino)
  if (rel === '' || rel.startsWith('..') || isAbsolute(rel)) {
    throw new Error(`la ruta queda fuera de la evidencia: ${pedido}`)
  }
  return destino
}

function leerOpciones(argv: string[]): Map<string, string> {
  const mapa = new Map<string, string>()
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i]
    if (token === undefined || !token.startsWith('--')) throw new Error(`opción no reconocida: ${token}`)
    const nombre = token.slice(2)
    const valor = argv[i + 1]
    if (valor === undefined || valor.startsWith('--')) throw new Error(`falta el valor de --${nombre}`)
    mapa.set(nombre, valor)
    i += 1
  }
  return mapa
}

function opcion(nombre: string): string | undefined {
  return opciones.get(nombre)
}

function obligatorio(nombre: string): string {
  const valor = opciones.get(nombre)
  if (valor === undefined) throw new Error(`falta --${nombre}`)
  return valor
}

function expresionRellenar(modo: string, clave: string, valor: string): string {
  return `(() => {
    const modo = ${JSON.stringify(modo)}
    const clave = ${JSON.stringify(clave)}
    const valor = ${JSON.stringify(valor)}
    const dialog = document.querySelector('[role="dialog"]')
    const raiz = dialog && modo !== 'name' ? dialog : document
    let el = null
    if (modo === 'name') el = document.querySelector('input[name="' + CSS.escape(clave) + '"], textarea[name="' + CSS.escape(clave) + '"]')
    if (modo === 'placeholder') el = raiz.querySelector('[placeholder="' + CSS.escape(clave) + '"]')
    if (modo === 'aria') el = raiz.querySelector('[aria-label="' + CSS.escape(clave) + '"]')
    if (modo === 'label') {
      const label = [...raiz.querySelectorAll('label')].find((candidato) => {
        const span = candidato.querySelector(':scope > span')
        return span !== null && (span.textContent || '').trim() === clave
      })
      el = label ? label.querySelector('input, textarea, select') : null
    }
    if (!el) return { ok: false, motivo: 'campo no encontrado', modo, clave }
    if (el instanceof HTMLInputElement && el.type === 'checkbox') {
      const quiere = valor === '1' || valor === 'true'
      if (el.checked !== quiere) el.click()
      return { ok: true }
    }
    // React ignora el valor asignado a pelo: hay que pasar por el setter nativo y disparar input.
    const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : el instanceof HTMLSelectElement ? HTMLSelectElement.prototype : HTMLInputElement.prototype
    const descripcion = Object.getOwnPropertyDescriptor(proto, 'value')
    if (descripcion === undefined || descripcion.set === undefined) return { ok: false, motivo: 'sin setter' }
    el.focus()
    descripcion.set.call(el, valor)
    el.dispatchEvent(new Event('input', { bubbles: true }))
    el.dispatchEvent(new Event('change', { bubbles: true }))
    return { ok: true }
  })()`
}

function expresionClick(role: string, nombre: string, contiene: boolean): string {
  return `(() => {
    const role = ${JSON.stringify(role)}
    const nombre = ${JSON.stringify(nombre)}
    const contiene = ${JSON.stringify(contiene)}
    const normal = (texto) => texto.replace(/\\s+/g, ' ').trim()
    const descritos = [...document.querySelectorAll('a, button, input[type="submit"], [role]')].flatMap((el) => {
      const implicito = el.tagName === 'A' ? 'link' : el.tagName === 'BUTTON' || el.getAttribute('type') === 'submit' ? 'button' : ''
      const rol = el.getAttribute('role') || implicito
      const texto = normal(el.getAttribute('aria-label') || el.innerText || el.value || '')
      return rol === '' ? [] : [{ el, rol, texto }]
    })
    let coinciden = descritos.filter((item) => item.rol === role && (contiene ? item.texto.includes(nombre) : item.texto === nombre))
    const enDialogo = coinciden.filter((item) => item.el.closest('[role="dialog"]'))
    if (enDialogo.length > 0) coinciden = enDialogo
    const elegido = coinciden.find((item) => item.el.getClientRects().length > 0) || coinciden[0]
    if (!elegido) {
      return { ok: false, motivo: 'control no encontrado', vistos: descritos.filter((item) => item.rol === role).map((item) => item.texto).slice(0, 30) }
    }
    elegido.el.click()
    return { ok: true, texto: elegido.texto }
  })()`
}

function expresionVisible(texto: string | undefined, ausente: string | undefined): string {
  const presente = texto === undefined ? 'true' : `cuerpo.includes(${JSON.stringify(texto)})`
  const falta = ausente === undefined ? 'true' : `!cuerpo.includes(${JSON.stringify(ausente)})`
  const fallo = texto === undefined ? `sigue visible: ${ausente ?? ''}` : `no aparece: ${texto}`
  return `(() => {
    const cuerpo = document.body ? document.body.innerText : ''
    if (${presente} && ${falta}) return true
    return ${JSON.stringify(fallo)}
  })()`
}

function expresionScroll(texto: string): string {
  return `(() => {
    const buscado = ${JSON.stringify(texto)}
    const nodos = [...document.querySelectorAll('body *')].filter((el) => {
      const contenido = el.innerText || ''
      return contenido.includes(buscado) && contenido.length < 400
    })
    nodos.sort((a, b) => (a.innerText || '').length - (b.innerText || '').length)
    const el = nodos[0]
    if (!el) return { ok: false, motivo: 'texto no encontrado' }
    el.scrollIntoView({ block: 'center', inline: 'nearest' })
    return { ok: true }
  })()`
}

function expresionFetch(ruta: string): string {
  return `(async () => {
    const respuesta = await fetch(${JSON.stringify(ruta)}, { headers: { accept: 'application/json' } })
    return { status: respuesta.status, body: await respuesta.text() }
  })()`
}

function leerJson(texto: string): unknown {
  return JSON.parse(texto)
}

function esRegistro(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === 'object' && valor !== null && !Array.isArray(valor)
}
