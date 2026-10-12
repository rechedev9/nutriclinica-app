// Limitador por clave (IP) con ventana deslizante: protege el login de la fuerza bruta.
export class Limitador {
  private readonly intentos = new Map<string, number[]>()

  constructor(
    private readonly maximo: number,
    private readonly ventanaMs: number,
  ) {}

  // permite registra un intento y devuelve false si la clave supera el máximo en la ventana.
  permite(clave: string, ahora: number = Date.now()): boolean {
    const recientes = (this.intentos.get(clave) ?? []).filter((t) => t > ahora - this.ventanaMs)
    if (recientes.length >= this.maximo) {
      this.intentos.set(clave, recientes)
      return false
    }
    recientes.push(ahora)
    this.intentos.set(clave, recientes)
    return true
  }
}
