import { useEffect, useState } from 'react'
import { z } from 'zod'
import { SIN_DESCUENTO } from './carrito'
import type { Descuento, LineaCarrito } from './carrito'

// El carrito sobrevive a cambiar de pestaña o recargar mientras dure la sesión del navegador.
const CLAVE = 'nutri-carrito'

const descuento = z.object({ tipo: z.enum(['pct', 'eur']), valor: z.number() })

const esquema = z.object({
  lineas: z.array(
    z.object({
      producto_id: z.number(),
      nombre: z.string(),
      unidad: z.string().nullable(),
      cantidad: z.number(),
      precio_unitario: z.number(),
      descuento,
      stock: z.number(),
    }),
  ),
  descuento,
  pacienteId: z.number().nullable(),
  notas: z.string(),
})

export interface Carrito {
  lineas: LineaCarrito[]
  descuento: Descuento
  pacienteId: number | null
  notas: string
}

export const CARRITO_VACIO: Carrito = { lineas: [], descuento: SIN_DESCUENTO, pacienteId: null, notas: '' }

function leer(): Carrito {
  try {
    const guardado = sessionStorage.getItem(CLAVE)
    if (guardado === null) return CARRITO_VACIO
    const r = esquema.safeParse(JSON.parse(guardado))
    return r.success ? r.data : CARRITO_VACIO
  } catch {
    return CARRITO_VACIO
  }
}

export function useCarritoGuardado(pacienteInicial: number | null) {
  const [carrito, setCarrito] = useState<Carrito>(() => {
    const guardado = leer()
    return pacienteInicial === null ? guardado : { ...guardado, pacienteId: pacienteInicial }
  })
  useEffect(() => {
    try {
      sessionStorage.setItem(CLAVE, JSON.stringify(carrito))
    } catch {
      // Sin almacenamiento (modo privado): el carrito vive solo en memoria.
    }
  }, [carrito])
  return [carrito, setCarrito] as const
}
