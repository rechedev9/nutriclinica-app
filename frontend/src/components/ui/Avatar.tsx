import { avatarColor, iniciales } from '@/lib/format/avatar'
import { cn } from '@/lib/cn'

interface Props {
  nombre: string
  className?: string
}

export function Avatar({ nombre, className }: Props) {
  return (
    <div
      className={cn(
        'flex shrink-0 items-center justify-center rounded-xl font-bold text-white',
        className,
      )}
      style={{ backgroundColor: avatarColor(nombre) }}
    >
      {iniciales(nombre)}
    </div>
  )
}
