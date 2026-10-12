// Espera una mutación y devuelve si tuvo éxito. El aviso de error ya lo muestra el
// onError del hook, así que aquí se absorbe el rechazo para no dejar una promesa sin tratar.
export async function intentar(promesa: Promise<unknown>): Promise<boolean> {
  try {
    await promesa
    return true
  } catch {
    return false
  }
}
