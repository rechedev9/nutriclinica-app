import { forwardRef } from 'react'
import type { ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

type Variant = 'primary' | 'outline' | 'danger' | 'ghost'
type Size = 'md' | 'sm'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  isLoading?: boolean
}

const variants: Record<Variant, string> = {
  primary: 'bg-primary text-white hover:bg-primary-dark border border-transparent',
  outline: 'bg-white text-ink border border-border hover:bg-surface-2',
  danger: 'bg-white text-danger border border-danger/30 hover:bg-danger/5',
  ghost: 'bg-transparent text-ink-muted hover:bg-surface-2 border border-transparent',
}

const sizes: Record<Size, string> = {
  md: 'px-4 py-2 text-[15px]',
  sm: 'px-3 py-1.5 text-[13px]',
}

export const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  { variant = 'primary', size = 'md', isLoading = false, className, children, disabled, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || isLoading}
      aria-busy={isLoading || undefined}
      className={cn(
        'relative inline-flex items-center justify-center rounded-lg font-semibold transition-colors disabled:cursor-not-allowed',
        // Cuando NO carga, atenúa el disabled normal; al cargar el botón se ve activo con spinner.
        !isLoading && 'disabled:opacity-50',
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    >
      {isLoading && (
        <span className="absolute inset-0 flex items-center justify-center">
          {/* Spinner en el color del texto del botón; no desplaza el contenido. */}
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent opacity-80" />
        </span>
      )}
      {/* El contenido conserva su espacio (invisible mantiene el ancho) para no descuadrar. */}
      <span className={cn('inline-flex items-center gap-2', isLoading && 'invisible')}>{children}</span>
    </button>
  )
})
