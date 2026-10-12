const DIACRITICOS = new RegExp('[\u0300-\u036f]', 'g')

// Minúsculas, sin acentos y sin espacios sobrantes: para comparar y buscar texto.
export function normaliza(s: string): string {
  return s.normalize('NFD').replace(DIACRITICOS, '').toLowerCase().trim()
}
