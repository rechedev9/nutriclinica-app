import { toast } from 'sonner'
import { registrarManejadorSesionCaducada } from '@/lib/api/client'
import { queryClient } from '@/lib/api/queryClient'
import { router } from '@/router'

// Un 401 fuera de /api/me y /api/login significa sesión caducada: se vacía la
// caché, se lleva al login y se avisa una sola vez.
registrarManejadorSesionCaducada(() => {
  queryClient.clear()
  void router.navigate('/login', { replace: true })
  toast.error('La sesión ha caducado. Vuelve a iniciar sesión.', { id: 'sesion-caducada' })
})
