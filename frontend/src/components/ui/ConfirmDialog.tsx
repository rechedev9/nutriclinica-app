import * as AlertDialog from '@radix-ui/react-alert-dialog'
import { createContext, useCallback, useContext, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Button } from './Button'

interface ConfirmOptions {
  title: string
  message?: string
  confirmText?: string
  danger?: boolean
}

type ConfirmFn = (opts: ConfirmOptions) => Promise<boolean>

const ConfirmContext = createContext<ConfirmFn | null>(null)

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const [opts, setOpts] = useState<ConfirmOptions>({ title: '' })
  const resolver = useRef<(v: boolean) => void>()

  const confirm = useCallback<ConfirmFn>((o) => {
    setOpts(o)
    setOpen(true)
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve
    })
  }, [])

  function close(result: boolean) {
    setOpen(false)
    resolver.current?.(result)
  }

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <AlertDialog.Root open={open} onOpenChange={(o) => !o && close(false)}>
        <AlertDialog.Portal>
          <AlertDialog.Overlay className="fixed inset-0 z-[60] animate-fadeIn bg-black/40" />
          <AlertDialog.Content className="fixed left-1/2 top-1/2 z-[60] w-[min(420px,92vw)] -translate-x-1/2 -translate-y-1/2 animate-slideUp rounded-card bg-surface p-6 shadow-md">
            <AlertDialog.Title className="text-lg font-bold text-ink">{opts.title}</AlertDialog.Title>
            {opts.message && (
              <AlertDialog.Description className="mt-2 text-[15px] text-ink-muted">
                {opts.message}
              </AlertDialog.Description>
            )}
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => close(false)}>
                Cancelar
              </Button>
              <Button variant={opts.danger ? 'danger' : 'primary'} onClick={() => close(true)}>
                {opts.confirmText ?? 'Confirmar'}
              </Button>
            </div>
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog.Root>
    </ConfirmContext.Provider>
  )
}

export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext)
  if (!ctx) throw new Error('useConfirm debe usarse dentro de ConfirmProvider')
  return ctx
}
