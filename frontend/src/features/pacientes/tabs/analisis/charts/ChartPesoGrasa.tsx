import { Line } from 'react-chartjs-2'
import { useMemo } from 'react'
import type { ScriptableContext } from 'chart.js'
import { useChartTheme, tooltipPlugin } from '@/lib/chart/useChartTheme'

interface Props {
  labels: string[]
  peso: (number | null)[]
  grasa: (number | null)[]
}

// Relleno con degradado vertical que se desvanece hacia abajo.
function fade(rgb: string) {
  return (ctx: ScriptableContext<'line'>) => {
    const { chart } = ctx
    const { ctx: c, chartArea } = chart
    if (!chartArea) return 'transparent'
    const g = c.createLinearGradient(0, chartArea.top, 0, chartArea.bottom)
    g.addColorStop(0, `rgba(${rgb},0.28)`)
    g.addColorStop(1, `rgba(${rgb},0)`)
    return g
  }
}

export function ChartPesoGrasa({ labels, peso, grasa }: Props) {
  const t = useChartTheme()

  const data = useMemo(
    () => ({
      labels,
      datasets: [
        {
          label: 'Peso (kg)',
          data: peso,
          yAxisID: 'yPeso',
          borderColor: '#2DD4BF',
          backgroundColor: fade('45,212,191'),
          pointBackgroundColor: '#2DD4BF',
          pointBorderColor: t.isDark ? '#0B1220' : '#ffffff',
          borderWidth: 2.5,
          pointRadius: 3,
          pointHoverRadius: 6,
          tension: 0.45,
          fill: true,
          spanGaps: true,
        },
        {
          label: '% Masa grasa',
          data: grasa,
          yAxisID: 'yGrasa',
          borderColor: '#A78BFA',
          backgroundColor: fade('167,139,250'),
          pointBackgroundColor: '#A78BFA',
          pointBorderColor: t.isDark ? '#0B1220' : '#ffffff',
          borderWidth: 2.5,
          pointRadius: 3,
          pointHoverRadius: 6,
          tension: 0.45,
          fill: true,
          spanGaps: true,
        },
      ],
    }),
    [labels, peso, grasa, t.isDark],
  )

  const options = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index' as const, intersect: false },
      plugins: {
        legend: { position: 'bottom' as const, labels: { boxWidth: 12, usePointStyle: true, color: t.legend } },
        tooltip: tooltipPlugin(t),
      },
      scales: {
        yPeso: {
          type: 'linear' as const,
          position: 'left' as const,
          title: { display: true, text: 'kg', color: t.ticks },
          grid: { color: t.grid, drawBorder: false },
          ticks: { color: t.ticks },
        },
        yGrasa: {
          type: 'linear' as const,
          position: 'right' as const,
          title: { display: true, text: '%', color: t.ticks },
          grid: { drawOnChartArea: false, drawBorder: false },
          ticks: { color: t.ticks },
        },
        x: { grid: { color: t.grid, drawBorder: false }, ticks: { color: t.ticks } },
      },
    }),
    [t],
  )

  return <Line data={data} options={options} />
}
