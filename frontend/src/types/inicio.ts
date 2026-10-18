import type { Treaty } from '@elysiajs/eden'
import type { servidor } from '@/lib/api/client'

export type ResumenInicio = Treaty.Data<typeof servidor.inicio.resumen.get>
