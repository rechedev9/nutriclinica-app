export interface Usuario {
  id: number
  usuario: string
  rol: string | null
  creado: string | null
}

export interface UsuarioInput {
  usuario: string
  password: string
  rol?: string | null
}

export interface Me {
  id: number
  usuario: string
  rol: string
}
