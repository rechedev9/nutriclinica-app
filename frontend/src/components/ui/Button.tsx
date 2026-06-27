import { forwardRef } from 'react'
import type { ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

type Variant = 'primary' | 'outline' | 'danger' | 'ghost'
type Size = 'md' | 'sm'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
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
  { variant = 'primary', size = 'md', className, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    />
  )
})
