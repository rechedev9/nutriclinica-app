function empiezaPor(bytes: Uint8Array, firma: number[]): boolean {
  return firma.every((b, i) => bytes[i] === b)
}

// Extensiones con las que se guarda y se sirve una foto: nada que el navegador ejecute.
export const EXTENSIONES_IMAGEN = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'] as const

// extensionImagen inspecciona los primeros bytes (el tipo que declara el navegador no es
// una garantía) y devuelve la extensión del formato, o null si no es una imagen.
export function extensionImagen(bytes: Uint8Array): (typeof EXTENSIONES_IMAGEN)[number] | null {
  if (empiezaPor(bytes, [0xff, 0xd8, 0xff])) return '.jpg'
  if (empiezaPor(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return '.png'
  if (empiezaPor(bytes, [0x47, 0x49, 0x46, 0x38])) return '.gif'
  if (empiezaPor(bytes, [0x42, 0x4d])) return '.bmp'
  const esWebp = empiezaPor(bytes, [0x52, 0x49, 0x46, 0x46]) && empiezaPor(bytes.subarray(8), [0x57, 0x45, 0x42, 0x50])
  return esWebp ? '.webp' : null
}
