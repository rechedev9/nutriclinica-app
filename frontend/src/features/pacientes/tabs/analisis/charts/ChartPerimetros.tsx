import { Line } from 'react-chartjs-2'
import { useMemo } from 'react'

export interface Serie {
  label: string
  data: (number | null)[]
  color: string
  unit: 'mm' | 'cm'
}

export function ChartPerimetros({ labels, series }: { labels: string[]; series: Serie[] }) {
  const hasMm = series.some((s) => s.unit === 'mm')
  const hasCm = series.some((s) => s.unit === 'cm')

  const data = useMemo(
    () => ({
      labels,
      datasets: series.map((s) => ({
        label: s.label,
        data: s.data,
        borderColor: s.color,
        backgroundColor: s.color,
        yAxisID: s.unit === 'mm' ? 'yMm' : 'yCm',
        borderWidth: 2,
        tension: 0.4,
        fill: false,
        spanGaps: true,
      })),
    }),
    [labels, series],
  )

  const options = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index' as const, intersect: false },
      plugins: { legend: { position: 'bottom' as const, labels: { boxWidth: 12 } } },
      scales: {
        yCm: hasCm ? { type: 'linear' as const, position: 'left' as const, title: { display: true, text: 'cm' } } : { display: false },
        yMm: hasMm
          ? {
              type: 'linear' as const,
              position: 'right' as const,
              title: { display: true, text: 'mm' },
              grid: { drawOnChartArea: false },
            }
          : { display: false },
      },
    }),
    [hasCm, hasMm],
  )

  return <Line data={data} options={options} />
}
