import type { IMCClase } from '@/lib/calc'
import { cn } from '@/lib/cn'

const CLASES: Record<IMCClase, string> = {
  'imc-normal': 'bg-success/15 text-emerald-700 dark:text-emerald-300',
  'imc-obesidad': 'bg-danger/15 text-red-700 dark:text-red-300',
  'imc-bajo': 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
  'imc-sobrepeso': 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
}

type Props = {
  clase: IMCClase
  children: string
  className?: string
}

export function ImcBadge({ clase, children, className }: Props) {
  return <span className={cn('rounded-sm px-1.5 py-0.5 tabular-nums', CLASES[clase], className)}>{children}</span>
}
