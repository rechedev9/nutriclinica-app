import { Toaster } from 'sonner'
import { useTheme } from '@/lib/theme/ThemeProvider'

// Toaster de sonner alineado con el tema activo (claro/oscuro).
export function ToasterTema() {
  const { effective } = useTheme()
  return <Toaster position="top-right" richColors theme={effective} />
}
