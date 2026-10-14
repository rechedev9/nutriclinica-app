// Paleta categórica corta derivada de la marca (tonos de primary) más acentos sobrios.
const CLARA = ['#0f7b92', '#5fb3c4', '#0a6577', '#c8923a', '#7a6fb0', '#6b7f95'] as const
const OSCURA = ['#3fb0c7', '#8fd0dc', '#1f8fa8', '#e0ae5a', '#a398d6', '#93a4ba'] as const

export function paletaCategorica(isDark: boolean): readonly string[] {
  return isDark ? OSCURA : CLARA
}

// Color de la posición i, repitiendo la paleta si hay más series que colores.
export function colorCategorico({ isDark, indice }: { isDark: boolean; indice: number }): string {
  const paleta = paletaCategorica(isDark)
  return paleta[indice % paleta.length] ?? '#0f7b92'
}

// Añade opacidad (0 a 1) a un color #rrggbb.
export function conAlfa({ color, alfa }: { color: string; alfa: number }): string {
  const a = Math.round(Math.min(Math.max(alfa, 0), 1) * 255)
    .toString(16)
    .padStart(2, '0')
  return `${color}${a}`
}
