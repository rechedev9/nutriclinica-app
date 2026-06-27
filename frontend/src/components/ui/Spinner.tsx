import { cn } from '@/lib/cn'

export function Spinner({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'h-5 w-5 animate-spin rounded-full border-2 border-border border-t-primary',
        className,
      )}
    />
  )
}

export function CenteredSpinner() {
  return (
    <div className="flex flex-1 items-center justify-center p-12">
      <Spinner className="h-8 w-8" />
    </div>
  )
}
