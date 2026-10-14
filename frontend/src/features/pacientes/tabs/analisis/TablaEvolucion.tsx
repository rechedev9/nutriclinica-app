import { fmtFecha } from '@/lib/format/fecha'
import { fmtValor, fmtVariacion, variacion, type Punto, type ResumenSerie } from './ultimo-dato'

export interface FilaEvolucion {
  etiqueta: string
  resumen: ResumenSerie
  // Texto cuando la métrica no tiene ningún dato en todo el historial.
  vacio: string
}

interface Props {
  filas: FilaEvolucion[]
  hayEvolucion: boolean
  fechaPrimera: string | null
  fechaAnterior: string | null
  fechaUltima: string | null
}

function Cabecera({ titulo, fecha, fuerte = false }: { titulo: string; fecha?: string | null; fuerte?: boolean }) {
  return (
    <th className="py-1.5 pl-3 text-right align-bottom font-semibold">
      <span className={fuerte ? 'font-bold text-ink' : undefined}>{titulo}</span>
      {fecha != null && <span className="block text-[11px] font-normal tabular-nums">{fmtFecha(fecha)}</span>}
    </th>
  )
}

// Valor de una columna; si procede de otra revisión que la de la cabecera, lo indica con su fecha.
function Celda({
  punto,
  fechaColumna,
  fuerte = false,
}: {
  punto: Punto<number> | null
  fechaColumna: string | null
  fuerte?: boolean
}) {
  if (punto === null) return <td className="py-1.5 pl-3 text-right text-ink-muted">-</td>
  const deOtraFecha = punto.fecha !== fechaColumna
  return (
    <td className={`py-1.5 pl-3 text-right tabular-nums ${fuerte ? 'font-semibold' : 'text-ink-muted'}`}>
      {fmtValor(punto.valor)}
      {deOtraFecha && <span className="block text-[11px] font-normal text-ink-muted">{fmtFecha(punto.fecha)}</span>}
    </td>
  )
}

function CeldaVariacion({ delta }: { delta: number | null }) {
  return (
    <td className={`py-1.5 pl-3 text-right font-semibold tabular-nums ${delta === null ? 'text-ink-muted' : ''}`}>
      {fmtVariacion(delta)}
    </td>
  )
}

export function TablaEvolucion({ filas, hayEvolucion, fechaPrimera, fechaAnterior, fechaUltima }: Props) {
  return (
    <div className="min-w-0 rounded-card bg-surface p-4 shadow-card">
      <div className="mb-2 text-sm font-bold">Evolución</div>
      {!hayEvolucion && (
        <div className="mb-2 text-[13px] text-ink-muted">
          Solo hay una revisión. La comparación aparecerá al registrar la siguiente.
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="whitespace-nowrap text-ink-muted">
              <th className="py-1.5 text-left align-bottom font-semibold">Métrica</th>
              {hayEvolucion && <Cabecera titulo="Primera" fecha={fechaPrimera} />}
              {hayEvolucion && <Cabecera titulo="Anterior" fecha={fechaAnterior} />}
              <Cabecera titulo={hayEvolucion ? 'Última' : 'Valor'} fecha={fechaUltima} />
              {hayEvolucion && <Cabecera titulo="Δ Primera" fuerte />}
              {hayEvolucion && <Cabecera titulo="Δ Anterior" fuerte />}
            </tr>
          </thead>
          <tbody>
            {filas.map((f) => {
              const { primero, anterior, ultimo } = f.resumen
              return (
                <tr key={f.etiqueta} className="border-t border-border">
                  <td className="py-1.5 pr-2 font-medium">{f.etiqueta}</td>
                  {hayEvolucion && <Celda punto={primero} fechaColumna={fechaPrimera} />}
                  {hayEvolucion && <Celda punto={anterior} fechaColumna={fechaAnterior} />}
                  {ultimo === null ? (
                    <td className="py-1.5 pl-3 text-right text-xs text-ink-muted">{f.vacio}</td>
                  ) : (
                    <Celda punto={ultimo} fechaColumna={fechaUltima} fuerte />
                  )}
                  {hayEvolucion && <CeldaVariacion delta={variacion(primero, ultimo)} />}
                  {hayEvolucion && <CeldaVariacion delta={variacion(anterior, ultimo)} />}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
