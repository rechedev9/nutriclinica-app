import { forwardRef } from 'react'
import type { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/cn'

const baseControl =
  'w-full rounded-lg border border-border bg-app px-3 py-2 text-[15px] outline-hidden transition-colors focus:border-primary focus:bg-surface'

export function Field({
  label,
  error,
  children,
  className,
}: {
  label?: string
  error?: string
  children: ReactNode
  className?: string
}) {
  return (
    <label className={cn('flex flex-col gap-1', className)}>
      {label && <span className="text-[13px] font-semibold text-ink-muted">{label}</span>}
      {children}
      {error && <span className="text-xs text-danger">{error}</span>}
    </label>
  )
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input(
  { className, ...props },
  ref,
) {
  return <input ref={ref} className={cn(baseControl, className)} {...props} />
})

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(function Select(
  { className, ...props },
  ref,
) {
  return <select ref={ref} className={cn(baseControl, 'cursor-pointer', className)} {...props} />
})

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea(
  { className, ...props },
  ref,
) {
  return <textarea ref={ref} className={cn(baseControl, 'min-h-[72px] resize-y', className)} {...props} />
})
