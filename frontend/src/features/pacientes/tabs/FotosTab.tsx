import { useState, useRef } from 'react'
import { usePacienteContext } from './context'
import { useFotos, useUploadFoto, useDeleteFoto } from '../hooks/useFotos'
import { Button } from '@/components/ui/Button'
import { CenteredSpinner } from '@/components/ui/Spinner'
import { useConfirm } from '@/components/ui/ConfirmDialog'
import { fmtDatetime } from '@/lib/format/fecha'
import { cn } from '@/lib/cn'
import type { Foto } from '@/types'

export function FotosTab() {
  const p = usePacienteContext()
  const { data: fotos, isLoading } = useFotos(p.id)
  const upload = useUploadFoto(p.id)
  const del = useDeleteFoto(p.id)
  const confirm = useConfirm()
  const inputRef = useRef<HTMLInputElement>(null)
  const [pending, setPending] = useState<File[]>([])
  const [nota, setNota] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const [lightbox, setLightbox] = useState<Foto | null>(null)

  if (isLoading) return <CenteredSpinner />

  function addFiles(files: FileList | null) {
    if (!files) return
    setPending((prev) => [...prev, ...Array.from(files)])
  }

  async function subir() {
    for (const file of pending) {
      await upload.mutateAsync({ file, nota })
    }
    setPending([])
    setNota('')
  }

  async function borrar(f: Foto) {
    const ok = await confirm({ title: '¿Eliminar foto?', confirmText: 'Eliminar', danger: true })
    if (ok) {
      await del.mutateAsync(f.id)
      setLightbox(null)
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
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7 xl:grid-cols-8">
          {fotos.map((f) => (
            <button
              key={f.id}
              onClick={() => setLightbox(f)}
              className="group relative h-28 overflow-hidden rounded-card bg-surface-2 shadow-card"
            >
              <img
                src={`/fotos/${f.filename}`}
                alt={f.nota ?? ''}
                className="h-full w-full object-cover transition-transform group-hover:scale-105"
                loading="lazy"
              />
            </button>
          ))}
        </div>
      )}

      {lightbox && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 p-4"
          onClick={() => setLightbox(null)}
        >
          <div className="max-h-[90vh] max-w-[90vw]" onClick={(e) => e.stopPropagation()}>
            <img src={`/fotos/${lightbox.filename}`} alt="" className="max-h-[80vh] rounded-lg object-contain" />
            <div className="mt-3 flex items-center justify-between text-white">
              <div className="text-sm">
                {lightbox.fecha && <span>{fmtDatetime(lightbox.fecha)}</span>}
                {lightbox.nota && <span className="ml-2 opacity-80">· {lightbox.nota}</span>}
              </div>
              <Button variant="danger" size="sm" onClick={() => borrar(lightbox)}>
                Eliminar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
