import type { ComponentProps } from 'react'
import { cva } from 'class-variance-authority'
import type { VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/cn'

const estilos = cva(
  'relative inline-flex items-center justify-center rounded-lg border font-semibold transition-colors disabled:cursor-not-allowed',
  {
    variants: {
      variant: {
        primary: 'border-transparent bg-primary text-primary-foreground hover:bg-primary-dark',
        outline: 'border-border bg-surface text-ink hover:bg-surface-2',
        danger: 'border-danger/30 bg-surface text-danger hover:bg-danger/5',
        ghost: 'border-transparent bg-transparent text-ink-muted hover:bg-surface-2',
      },
      size: {
        md: 'px-4 py-2 text-[15px]',
        sm: 'px-3 py-1.5 text-[13px]',
      },
      // Al cargar, el botón se ve activo con spinner; el disabled normal se atenúa.
      isLoading: { true: '', false: 'disabled:opacity-50' },
    },
    defaultVariants: { variant: 'primary', size: 'md', isLoading: false },
  },
)

type Props = ComponentProps<'button'> & VariantProps<typeof estilos>

export function Button({ variant, size, isLoading, className, children, disabled, ...props }: Props) {
  const cargando = isLoading === true
  return (
    <button
      data-slot="button"
      disabled={disabled === true || cargando}
      aria-busy={cargando || undefined}
      className={cn(estilos({ variant, size, isLoading: cargando }), className)}
      {...props}
    >
      {cargando && (
        <span className="absolute inset-0 flex items-center justify-center">
          {/* Spinner en el color del texto del botón; no desplaza el contenido. */}
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent opacity-80" />
        </span>
      )}
      {/* El contenido conserva su espacio (invisible mantiene el ancho) para no descuadrar. */}
      <span className={cn('inline-flex items-center gap-2', cargando && 'invisible')}>{children}</span>
    </button>
  )
}
