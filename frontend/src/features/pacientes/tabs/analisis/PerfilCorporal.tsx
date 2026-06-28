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
  { key: 'per_hombros', label: 'Hombros',  textX: 52,  y: 97,  anchor: 'end',   bodyX: 300 },
  { key: 'per_cintura', label: 'Cintura',  textX: 52,  y: 169, anchor: 'end',   bodyX: 338 },
  { key: 'per_muslo',   label: 'Muslo',    textX: 52,  y: 249, anchor: 'end',   bodyX: 320 },
  { key: 'per_pecho',   label: 'Pecho',    textX: 680, y: 108, anchor: 'start', bodyX: 399 },
  { key: 'per_gemelo',  label: 'Gemelo',   textX: 680, y: 338, anchor: 'start', bodyX: 447 },
]

const POSTERIOR: Punto[] = [
  { key: 'per_hombros', label: 'Espalda',    textX: 52,  y: 97,  anchor: 'end',   bodyX: 364 },
  { key: 'per_caderas', label: 'Caderas',    textX: 52,  y: 184, anchor: 'end',   bodyX: 331 },
  { key: 'per_muslo',   label: 'Femoral',    textX: 52,  y: 260, anchor: 'end',   bodyX: 356 },
  { key: 'per_caderas', label: 'Glúteo',     textX: 680, y: 207, anchor: 'start', bodyX: 397 },
  { key: 'per_gemelo',  label: 'Pantorrilla', textX: 680, y: 338, anchor: 'start', bodyX: 452 },
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
      <svg ref={svgRef as RefObject<SVGSVGElement>} viewBox="0 0 900 432" className="w-full">
        <image href={imagen} x="175" y="0" width="400" height="420" preserveAspectRatio="xMidYMid meet" />
        {puntos.map((p, i) => {
          const val = last[p.key] as number | null
          if (val == null) return null
          const delta = prev != null ? Math.round(((val - (prev[p.key] as number ?? val)) * 10)) / 10 : null
          const hasDelta = delta != null && delta !== 0
          const mejora = delta != null && delta < 0
          const lineX1 = p.anchor === 'end' ? p.textX + 8 : p.textX - 8

          return (
            <g key={`${p.key}-${i}`}>
              <line
                x1={lineX1} y1={p.y}
                x2={p.bodyX} y2={p.y}
                stroke="#cbd5e1" strokeDasharray="4,3"
              />
              <circle cx={p.bodyX} cy={p.y} r={4} fill="#ef4444" />
              <text
                x={p.textX} y={p.y - 18}
                textAnchor={p.anchor}
                fontSize={15} fill="#64748b" fontFamily="inherit"
              >
                {p.label}
              </text>
              <text
                x={p.textX} y={p.y + 4}
                textAnchor={p.anchor}
                fontSize={26} fill="#0f172a" fontFamily="inherit" fontWeight="700"
                data-countup={val} data-dec="1"
              >
                {val.toFixed(1)} cm
              </text>
              {hasDelta && (
                <text
                  x={p.textX} y={p.y + 22}
                  textAnchor={p.anchor}
                  fontSize={14} fill={mejora ? '#0E9F6E' : '#b91c1c'} fontFamily="inherit"
                >
                  {mejora ? '↓' : '↑'} {Math.abs(delta).toFixed(1)} cm
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
      <PanelSVG
        imagen="/silueta-frontal.png"
        titulo="Perfil corporal frontal"
        puntos={FRONTAL}
        last={last}
        prev={prev}
        svgRef={frontalRef}
      />
      <PanelSVG
        imagen="/silueta-posterior.png"
        titulo="Perfil corporal posterior"
        puntos={POSTERIOR}
        last={last}
        prev={prev}
        svgRef={posteriorRef}
      />
    </div>
  )
}
