import type { ReactNode, CSSProperties } from 'react'
import { cn } from '@/lib/cn'

interface Props {
  children: ReactNode
  className?: string
  style?: CSSProperties
}

export function Badge({ children, className, style }: Props) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold',
        !style && 'bg-primary-light text-primary',
        className,
      )}
      style={style}
    >
      {children}
    </span>
  )
}
