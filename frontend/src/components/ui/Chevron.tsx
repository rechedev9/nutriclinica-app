import { cn } from '@/lib/cn'

// Indica que una fila se despliega; gira al abrirla.
export function Chevron({ abierto }: { abierto: boolean }) {
  return (
    <svg
      className={cn('shrink-0 text-ink-muted transition-transform duration-150 ease-out', abierto && 'rotate-180')}
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  )
}
