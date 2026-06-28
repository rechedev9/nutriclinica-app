import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api/client'
import { qk } from '@/lib/api/queryKeys'
import { CenteredSpinner } from '@/components/ui/Spinner'
import { fmtDatetime } from '@/lib/format/fecha'
import type { AuditEntry } from '@/types'

function useAuditoria() {
  return useQuery({
    queryKey: qk.auditoria,
    queryFn: () => api<AuditEntry[]>('GET', '/api/auditoria?limite=300'),
  })
}

// Etiqueta legible para el método HTTP.
const accion: Record<string, string> = {
  POST: 'Alta',
  PUT: 'Edición',
  DELETE: 'Borrado',
  GET: 'Exportación',
}

export function AuditoriaPage() {
  const { data, isLoading } = useAuditoria()
  if (isLoading) return <CenteredSpinner />
  const rows = data ?? []

  return (
    <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-6">
      <div>
        <h2 className="text-xl font-bold">Registro de auditoría</h2>
        <p className="mt-1 text-sm text-ink-muted">
          Operaciones que crean, modifican, borran o exportan datos. Se muestran las 300 más recientes.
        </p>
      </div>

      {rows.length === 0 ? (
        <p className="py-8 text-center text-sm text-ink-muted">Sin actividad registrada todavía.</p>
      ) : (
        <div className="overflow-x-auto rounded-card bg-surface shadow-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-ink-muted">
                <th className="p-3 font-semibold">Fecha</th>
                <th className="p-3 font-semibold">Usuario</th>
                <th className="p-3 font-semibold">Acción</th>
                <th className="p-3 font-semibold">Recurso</th>
                <th className="p-3 font-semibold">Estado</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((e) => (
                <tr key={e.id} className="border-b border-border last:border-0">
                  <td className="p-3 text-ink-muted">{e.fecha ? fmtDatetime(e.fecha) : '—'}</td>
                  <td className="p-3 font-semibold">{e.usuario || '—'}</td>
                  <td className="p-3">{accion[e.metodo] ?? e.metodo}</td>
                  <td className="p-3 font-mono text-[13px] text-ink-muted">{e.ruta}</td>
                  <td className="p-3">
                    <span className={e.estado >= 400 ? 'text-danger' : 'text-success'}>{e.estado}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
