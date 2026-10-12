import * as Dialog from '@radix-ui/react-dialog'
import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

interface Props {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  className?: string
}

export function Modal({ open, onClose, title, children, className }: Props) {
  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 animate-fadeIn bg-black/40" />
        {/* Wrapper flex que centra sin usar transform (así no choca con la animación). */}
        <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center p-4">
          <Dialog.Content
            aria-describedby={undefined}
            className={cn(
              'pointer-events-auto max-h-[90vh] w-[min(560px,92vw)] animate-slideUp overflow-y-auto rounded-card bg-surface p-6 shadow-md outline-none',
              className,
            )}
          >
            <div className="mb-4 flex items-center justify-between">
            <Dialog.Title className="text-lg font-bold text-ink">{title}</Dialog.Title>
            <Dialog.Close className="rounded-md p-1 text-ink-muted hover:bg-surface-2" aria-label="Cerrar">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </Dialog.Close>
          </div>
            {children}
          </Dialog.Content>
        </div>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
