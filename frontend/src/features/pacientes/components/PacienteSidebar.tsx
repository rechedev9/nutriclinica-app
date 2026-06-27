import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Paciente } from '@/types'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { Spinner } from '@/components/ui/Spinner'
import { fmtFecha } from '@/lib/format/fecha'
import { cn } from '@/lib/cn'

interface Props {
  pacientes: Paciente[]
  loading: boolean
  activeId: number | null
  onNew: () => void
}

function meta(p: Paciente): string {
  if (p.peso && p.talla) return `${p.peso} kg · ${p.talla} cm`
  if (p.fecha_nac) return `Nac. ${fmtFecha(p.fecha_nac)}`
  return ''
}

export function PacienteSidebar({ pacientes, loading, activeId, onNew }: Props) {
  const [q, setQ] = useState('')
  const navigate = useNavigate()
  const filtered = pacientes.filter((p) => p.nombre.toLowerCase().includes(q.toLowerCase()))

  return (
    <div className="flex w-[300px] shrink-0 flex-col border-r border-border bg-surface max-md:w-full">
      <div className="border-b border-border p-3.5">
        <div className="relative">
          <svg className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-muted" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
          <input
            className="w-full rounded-lg border border-border bg-surface-2 py-2 pl-9 pr-3 text-[15px] outline-none focus:border-primary focus:bg-surface"
            placeholder="Buscar paciente…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <button
          onClick={onNew}
          className="mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-lg bg-primary py-2 text-[15px] font-semibold text-white transition-colors hover:bg-primary-dark"
        >
          <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path d="M12 5v14M5 12h14" />
          </svg>
          Nuevo paciente
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-2 max-md:max-h-[40vh]">
        {loading ? (
          <div className="flex justify-center p-8">
            <Spinner />
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-sm text-ink-muted">Sin pacientes</div>
        ) : (
          filtered.map((p) => (
            <button
              key={p.id}
              onClick={() => navigate(`/pacientes/${p.id}`)}
              className={cn(
                'flex w-full items-center gap-2.5 rounded-lg border border-transparent p-3 text-left transition-colors hover:bg-surface-2',
                activeId === p.id && 'border-primary/20 bg-primary-light',
              )}
            >
              <Avatar nombre={p.nombre} className="h-[38px] w-[38px] text-[15px]" />
              <div className="min-w-0 flex-1">
                <div className="truncate text-[15px] font-semibold">{p.nombre}</div>
                <div className="text-[13px] text-ink-muted">{meta(p)}</div>
              </div>
              {p.num_fotos > 0 && <Badge>{p.num_fotos}</Badge>}
            </button>
          ))
        )}
      </div>
    </div>
  )
}
