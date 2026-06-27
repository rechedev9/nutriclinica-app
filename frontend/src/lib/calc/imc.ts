export type IMCClase = 'imc-bajo' | 'imc-normal' | 'imc-sobrepeso' | 'imc-obesidad'

export interface IMCResult {
  val: number
  cls: IMCClase
  etiq: string
}

// Port exacto de calcIMC (index.html:862).
export function calcIMC(peso: number | null, talla: number | null): IMCResult | null {
  if (!peso || !talla) return null
  const val = Math.round((peso / (talla / 100) ** 2) * 10) / 10
  let cls: IMCClase = 'imc-normal'
  let etiq = 'Normal'
  if (val < 18.5) {
    cls = 'imc-bajo'
    etiq = 'Bajo peso'
  } else if (val < 25) {
    cls = 'imc-normal'
    etiq = 'Normal'
  } else if (val < 30) {
    cls = 'imc-sobrepeso'
    etiq = 'Sobrepeso'
  } else {
    cls = 'imc-obesidad'
    etiq = 'Obesidad'
  }
  return { val, cls, etiq }
}
