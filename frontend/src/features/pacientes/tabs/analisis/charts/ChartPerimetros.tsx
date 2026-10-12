import { Line } from 'react-chartjs-2'
import { useMemo } from 'react'
import { useChartTheme, tooltipPlugin } from '@/lib/chart/useChartTheme'

export interface Serie {
  label: string
  data: (number | null)[]
  color: string
  unit: 'mm' | 'cm'
}

export function ChartPerimetros({ labels, series }: { labels: string[]; series: Serie[] }) {
  const t = useChartTheme()
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
        pointBackgroundColor: s.color,
        pointBorderColor: t.isDark ? '#0B1220' : '#ffffff',
        yAxisID: s.unit === 'mm' ? 'yMm' : 'yCm',
        borderWidth: 2,
        pointRadius: 3,
        pointHoverRadius: 6,
        tension: 0.4,
        fill: false,
        spanGaps: true,
      })),
    }),
    [labels, series, t.isDark],
  )

  const options = useMemo(() => {
    const axis = (text: string, position: 'left' | 'right', area: boolean) => ({
      type: 'linear' as const,
      position,
      title: { display: true, text, color: t.ticks },
      grid: { color: t.grid, drawOnChartArea: area, drawBorder: false },
      ticks: { color: t.ticks },
    })
    return {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index' as const, intersect: false },
      plugins: {
        legend: { position: 'bottom' as const, labels: { boxWidth: 12, usePointStyle: true, color: t.legend } },
        tooltip: tooltipPlugin(t),
      },
      scales: {
        yCm: hasCm ? axis('cm', 'left', true) : { display: false },
        yMm: hasMm ? axis('mm', 'right', false) : { display: false },
        x: { grid: { color: t.grid, drawBorder: false }, ticks: { color: t.ticks } },
      },
    }
  }, [t, hasCm, hasMm])

  return <Line data={data} options={options} />
}
