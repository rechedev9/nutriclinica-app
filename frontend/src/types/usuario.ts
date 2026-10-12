import type { Treaty } from '@elysiajs/eden'
import type { servidor } from '@/lib/api/client'

// Tipos derivados de las respuestas del backend (Eden): la fuente de verdad es la API.
export type Usuario = Treaty.Data<typeof servidor.usuarios.get>[number]
export type Me = Treaty.Data<typeof servidor.me.get>

export interface UsuarioInput {
  usuario: string
  password: string
  rol?: string | null
}
