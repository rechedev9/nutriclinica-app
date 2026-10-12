// Port exacto de nombre_a_prefijo / nombre_a_carpeta de la app original. Las carpetas de
// fotos ya existen en disco con estos nombres: no cambies su salida (naming.test.ts la fija).

function sinAcentos(texto: string): string {
  return [...texto.normalize('NFKD')].filter((c) => (c.codePointAt(0) ?? 128) < 128).join('')
}

function palabras(texto: string): string[] {
  return sinAcentos(texto).split(/\s+/).filter(Boolean)
}

// "José Pérez Gómez" -> "jose_perez_gomez"
export function prefijo(nombre: string): string {
  return palabras(nombre)
    .map((p) => p.toLowerCase())
    .join('_')
}

// "José Pérez Gómez" -> "JosePerezGomez"
export function carpeta(nombre: string): string {
  return palabras(nombre)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase())
    .join('')
}
