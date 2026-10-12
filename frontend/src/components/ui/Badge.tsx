import type { ComponentProps } from 'react'
import { cva } from 'class-variance-authority'
import { cn } from '@/lib/cn'

const estilos = cva('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold', {
  variants: {
    // Con `style` el color lo pone quien lo usa (semáforos, categorías).
    tono: { marca: 'bg-primary-light text-primary', libre: '' },
  },
})

type Props = Pick<ComponentProps<'span'>, 'children' | 'className' | 'style'>

export function Badge({ children, className, style }: Props) {
  return (
    <span
      data-slot="badge"
      className={cn(estilos({ tono: style === undefined ? 'marca' : 'libre' }), className)}
      style={style}
    >
      {children}
    </span>
  )
}
