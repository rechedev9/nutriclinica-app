import type { Revision } from '@/types'

type ValueFn = (r: Revision) => number | null

function ymLabel(ym: string): string {
  const [y, m] = ym.split('-')
  return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString('es-ES', { month: 'short', year: '2-digit' })
}

// Port de buildMonthMultiData (index.html:1617): varias series por mes-año.
export function buildMonthMultiData(revs: Revision[], seriesFns: ValueFn[]) {
  const maps = seriesFns.map(() => new Map<string, number>())
  for (const r of revs) {
    const ym = (r.fecha ?? '').slice(0, 7)
    seriesFns.forEach((fn, i) => {
      const v = fn(r)
      if (v != null) maps[i]?.set(ym, Math.round(v * 10) / 10)
    })
  }
  const allYMs = [...new Set(maps.flatMap((m) => [...m.keys()]))].toSorted()
  const labels = allYMs.map((ym) => ymLabel(ym))
  const datasets = maps.map((m) => allYMs.map((ym) => m.get(ym) ?? null))
  return { labels, datasets }
}
