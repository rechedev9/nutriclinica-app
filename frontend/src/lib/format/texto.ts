const DIACRITICOS = new RegExp('[\u0300-\u036f]', 'g')

// Minúsculas, sin acentos y sin espacios sobrantes: para comparar y buscar texto.
export function normaliza(s: string): string {
  return s.normalize('NFD').replace(DIACRITICOS, '').toLowerCase().trim()
}

// Resumen de una compra o una venta en una línea: «Whey 1 kg × 2, Creatina × 1».
export function resumenLineas(lineas: { producto_nombre: string | null; cantidad: number }[]): string {
  return lineas.map((l) => `${l.producto_nombre ?? 'Producto'} × ${l.cantidad}`).join(', ')
}
