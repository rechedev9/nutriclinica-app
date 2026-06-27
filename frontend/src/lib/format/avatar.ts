// Iniciales y color de avatar (port de iniciales/colorFor de la SPA original).

// Paleta de avatares (coincide con theme.colors.avatar de tailwind.config).
export const AVATAR_COLORS = [
  '#0F7B92',
  '#7C3AED',
  '#DB2777',
  '#EA580C',
  '#0E9F6E',
  '#2563EB',
  '#D97706',
  '#DC2626',
]

export function iniciales(n: string): string {
  return n
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0] ?? '')
    .join('')
    .toUpperCase()
}

// Port exacto de colorFor (index.html:1395): hash → índice 0..7.
export function colorIndex(n: string): number {
  let h = 0
  for (let i = 0; i < n.length; i++) {
    h = (h * 31 + n.charCodeAt(i)) & 0xffff
  }
  return h % AVATAR_COLORS.length
}

export function avatarColor(n: string): string {
  return AVATAR_COLORS[colorIndex(n)] ?? AVATAR_COLORS[0]!
}
