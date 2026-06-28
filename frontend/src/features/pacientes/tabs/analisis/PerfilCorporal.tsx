import { useEffect, useRef, type RefObject } from 'react'
import type { Revision } from '@/types'

interface Props {
  last: Revision
  prev: Revision | null
}

interface Punto {
  key: keyof Revision
  label: string
  textX: number
  y: number
  anchor: 'start' | 'end'
  bodyX: number
}

const FRONTAL: Punto[] = [
  { key: 'per_hombros', label: 'Hombros',  textX: 155, y: 78,  anchor: 'end',   bodyX: 315 },
  { key: 'per_cintura', label: 'Cintura',  textX: 155, y: 135, anchor: 'end',   bodyX: 345 },
  { key: 'per_muslo',   label: 'Muslo',    textX: 155, y: 199, anchor: 'end',   bodyX: 331 },
  { key: 'per_pecho',   label: 'Pecho',    textX: 620, y: 86,  anchor: 'start', bodyX: 394 },
  { key: 'per_gemelo',  label: 'Gemelo',   textX: 620, y: 270, anchor: 'start', bodyX: 433 },
]

const POSTERIOR: Punto[] = [
  { key: 'per_hombros', label: 'Espalda',     textX: 155, y: 78,  anchor: 'end',   bodyX: 366 },
  { key: 'per_caderas', label: 'Caderas',     textX: 155, y: 147, anchor: 'end',   bodyX: 340 },
  { key: 'per_muslo',   label: 'Femoral',     textX: 155, y: 208, anchor: 'end',   bodyX: 360 },
  { key: 'per_caderas', label: 'Glúteo',      textX: 620, y: 166, anchor: 'start', bodyX: 393 },
  { key: 'per_gemelo',  label: 'Pantorrilla', textX: 620, y: 270, anchor: 'start', bodyX: 437 },
]

function animarTextos(svg: SVGSVGElement, duration = 1800) {
  svg.querySelectorAll<SVGTextElement>('[data-countup]').forEach((el) => {
    const target = parseFloat(el.dataset['countup'] ?? '0')
    const dec = parseInt(el.dataset['dec'] ?? '1', 10)
    const t0 = performance.now()
    const tick = (now: number) => {
      const p = Math.min((now - t0) / duration, 1)
      const e = p < 0.5 ? 2 * p * p : -1 + (4 - 2 * p) * p
      el.textContent = (e * target).toFixed(dec) + ' cm'
      if (p < 1) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  })
}

function PanelSVG({
  imagen,
  titulo,
  puntos,
  last,
  prev,
  svgRef,
}: {
  imagen: string
  titulo: string
  puntos: Punto[]
  last: Revision
  prev: Revision | null
  svgRef: RefObject<SVGSVGElement | null>
}) {
  return (
    <div className="rounded-card bg-surface p-3 shadow-card flex flex-col gap-2">
      <div className="text-sm font-bold">{titulo}</div>
      <svg ref={svgRef as RefObject<SVGSVGElement>} viewBox="0 0 900 350" className="w-full">
        <image href={imagen} x="215" y="0" width="320" height="336" preserveAspectRatio="xMidYMid meet" />
        {puntos.map((p, i) => {
          const val = last[p.key] as number | null
          if (val == null) return null
          const delta =
            prev != null && prev[p.key] != null
              ? Math.round((val - (prev[p.key] as number)) * 10) / 10
              : null
          const hasDelta = delta != null && delta !== 0
          const mejora = delta != null && delta < 0
          const lineX1 = p.anchor === 'end' ? p.textX + 16 : p.textX - 16

          return (
            <g key={`${p.key}-${i}`}>
              <line x1={lineX1} y1={p.y} x2={p.bodyX} y2={p.y} stroke="#cbd5e1" strokeDasharray="4,3" />
              <circle cx={p.bodyX} cy={p.y} r={4} fill="#ef4444" />
              <text x={p.textX} y={p.y - 14} textAnchor={p.anchor} fontSize={12} fill="#64748b" fontFamily="inherit">
                {p.label}
              </text>
              <text
                x={p.textX} y={p.y + 3}
                textAnchor={p.anchor}
                fontSize={21} fill="#0f172a" fontFamily="inherit" fontWeight="700"
                data-countup={val} data-dec="1"
              >
                {val.toFixed(1)} cm
              </text>
              {hasDelta && (
                <text x={p.textX} y={p.y + 17} textAnchor={p.anchor} fontSize={11} fill={mejora ? '#0E9F6E' : '#b91c1c'} fontFamily="inherit">
                  {mejora ? '↓' : '↑'} {Math.abs(delta!).toFixed(1)} cm
                </text>
              )}
            </g>
          )
        })}
      </svg>
    </div>
  )
}

export function PerfilCorporal({ last, prev }: Props) {
  const frontalRef = useRef<SVGSVGElement | null>(null)
  const posteriorRef = useRef<SVGSVGElement | null>(null)

  useEffect(() => {
    if (frontalRef.current) animarTextos(frontalRef.current)
    if (posteriorRef.current) animarTextos(posteriorRef.current)
  }, [last, prev])

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <PanelSVG imagen="/silueta-frontal.png" titulo="Perfil corporal frontal" puntos={FRONTAL} last={last} prev={prev} svgRef={frontalRef} />
      <PanelSVG imagen="/silueta-posterior.png" titulo="Perfil corporal posterior" puntos={POSTERIOR} last={last} prev={prev} svgRef={posteriorRef} />
    </div>
  )
}
