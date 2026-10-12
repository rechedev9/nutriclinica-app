import { useState, useRef } from 'react'
import { usePacienteContext } from './context'
import { useFotos, useUploadFoto, useDeleteFoto } from '../hooks/useFotos'
import { Button } from '@/components/ui/Button'
import { CenteredSpinner } from '@/components/ui/Spinner'
import { ErrorState } from '@/components/ui/ErrorState'
import { useConfirm } from '@/components/ui/ConfirmDialog'
import { Modal } from '@/components/ui/Modal'
import { fmtDatetime } from '@/lib/format/fecha'
import { cn } from '@/lib/cn'
import type { Foto } from '@/types'
import { intentar } from '@/lib/api/intentar'

function FotoImg({ src, alt, className }: { src: string; alt: string; className: string }) {
  const [fallo, setFallo] = useState(false)
  if (fallo) {
    return (
      <div
        role="img"
        aria-label="Foto no disponible"
        className="flex h-full w-full flex-col items-center justify-center gap-1 bg-surface-2 p-2 text-center text-[11px] text-ink-muted"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <path d="m3 3 18 18" />
        </svg>
        Archivo no disponible
      </div>
    )
  }
  return <img src={src} alt={alt} className={className} loading="lazy" onError={() => setFallo(true)} />
}

export function FotosTab() {
  const p = usePacienteContext()
  const { data: fotos, isLoading, isError, error, refetch, isFetching } = useFotos(p.id)
  const upload = useUploadFoto(p.id)
  const del = useDeleteFoto(p.id)
  const confirm = useConfirm()
  const inputRef = useRef<HTMLInputElement>(null)
  const [pending, setPending] = useState<File[]>([])
  const [nota, setNota] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const [lightbox, setLightbox] = useState<Foto | null>(null)

  if (isLoading) return <CenteredSpinner />
  if (isError) return <ErrorState error={error} onRetry={() => void refetch()} isRetrying={isFetching} recurso="las fotos" />

  function addFiles(files: FileList | null) {
    if (!files) return
    setPending((prev) => [...prev, ...Array.from(files)])
  }

  async function subir() {
    for (const file of pending) {
      if (!(await intentar(upload.mutateAsync({ file, nota })))) return
    }
    setPending([])
    setNota('')
  }

  async function borrar(f: Foto) {
    const ok = await confirm({ title: '¿Eliminar foto?', confirmText: 'Eliminar', danger: true })
    if (ok) {
      if (await intentar(del.mutateAsync(f.id))) setLightbox(null)
    }
  }

  return (
    <div className="flex flex-col gap-4 p-6">
      <div
        onDragOver={(e) => {
          e.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragOver(false)
          addFiles(e.dataTransfer.files)
        }}
        onClick={() => inputRef.current?.click()}
        className={cn(
          'flex cursor-pointer flex-col items-center gap-2 rounded-card border-2 border-dashed p-8 text-center transition-colors',
          dragOver ? 'border-primary bg-primary-light' : 'border-border bg-surface',
        )}
      >
        <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="text-primary">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
        </svg>
        <div className="font-semibold">Arrastra fotos aquí o haz clic para seleccionar</div>
        <div className="text-sm text-ink-muted">JPG, PNG…</div>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => addFiles(e.target.files)}
        />
      </div>

      {pending.length > 0 && (
        <div className="rounded-card bg-surface p-4 shadow-card">
          <div className="mb-2 text-sm font-semibold">{pending.length} archivo(s) listo(s) para subir</div>
          <input
            className="mb-3 w-full rounded-lg border border-border bg-app px-3 py-2 outline-none focus:border-primary focus:bg-surface"
            placeholder="Nota (opcional, se aplica a todas)"
            value={nota}
            onChange={(e) => setNota(e.target.value)}
          />
          <div className="flex gap-2">
            <Button onClick={subir} isLoading={upload.isPending}>
              Subir
            </Button>
            <Button variant="ghost" onClick={() => setPending([])}>
              Cancelar
            </Button>
          </div>
        </div>
      )}

      {!fotos || fotos.length === 0 ? (
        <p className="py-8 text-center text-sm text-ink-muted">Sin fotos todavía.</p>
      ) : (
        <div className="flex flex-col gap-6">
          {(() => {
            const sorted = [...fotos].sort((a, b) => (b.fecha ?? '').localeCompare(a.fecha ?? ''))
            const grupos = new Map<string, typeof fotos>()
            for (const f of sorted) {
              const clave = f.fecha
                ? new Date(f.fecha).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })
                : 'Sin fecha'
              const grupo = grupos.get(clave) ?? []
              grupo.push(f)
              grupos.set(clave, grupo)
            }
            return Array.from(grupos.entries()).map(([mes, fots]) => (
              <div key={mes}>
                <div className="mb-3 flex items-center gap-3">
                  <span className="text-sm font-bold capitalize text-ink">{mes}</span>
                  <div className="h-px flex-1 bg-border" />
                  <span className="text-xs text-ink-muted">{fots.length} foto{fots.length !== 1 ? 's' : ''}</span>
                </div>
                <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7 xl:grid-cols-8">
                  {fots.map((f) => (
                    <button
                      key={f.id}
                      onClick={() => setLightbox(f)}
                      className="group relative h-28 overflow-hidden rounded-card bg-surface-2 shadow-card"
                    >
                      <FotoImg
                        src={`/fotos/${f.filename}`}
                        alt={f.nota ?? ''}
                        className="h-full w-full object-cover transition-transform group-hover:scale-105"
                      />
                    </button>
                  ))}
                </div>
              </div>
            ))
          })()}
        </div>
      )}

      <Modal open={lightbox != null} onClose={() => setLightbox(null)} title="Foto" className="w-[min(900px,92vw)]">
        {lightbox && (
          <div>
            <div className="flex max-h-[70vh] justify-center">
              <FotoImg
                src={`/fotos/${lightbox.filename}`}
                alt={lightbox.nota ?? 'Foto de progreso'}
                className="max-h-[70vh] rounded-lg object-contain"
              />
            </div>
            <div className="mt-3 flex items-center justify-between gap-3">
              <div className="text-sm">
                {lightbox.fecha && <span>{fmtDatetime(lightbox.fecha)}</span>}
                {lightbox.nota && <span className="ml-2 text-ink-muted">· {lightbox.nota}</span>}
              </div>
              <Button variant="danger" size="sm" onClick={() => borrar(lightbox)}>
                Eliminar
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
