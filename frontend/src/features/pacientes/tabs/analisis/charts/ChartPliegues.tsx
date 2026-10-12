import { Bar } from 'react-chartjs-2'
import { useMemo } from 'react'
import { useChartTheme, tooltipPlugin } from '@/lib/chart/useChartTheme'

export function ChartPliegues({ labels, data, colors }: { labels: string[]; data: number[]; colors: string[] }) {
  const t = useChartTheme()

  const chartData = useMemo(
    () => ({
      labels,
      datasets: [
        {
          label: 'Pliegues (mm)',
          data,
          backgroundColor: colors.map((c) => c + 'b3'),
          borderColor: colors,
          borderWidth: 1,
          borderRadius: 6,
          borderSkipped: false,
        },
      ],
    }),
    [labels, data, colors],
  )

  const options = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: tooltipPlugin(t) },
      scales: {
        x: { grid: { display: false, drawBorder: false }, ticks: { color: t.ticks } },
        y: {
          beginAtZero: true,
          grid: { color: t.grid, drawBorder: false },
          ticks: { color: t.ticks, callback: (v: string | number) => `${v} mm` },
        },
      },
    }),
    [t],
  )

  return <Bar data={chartData} options={options} />
}
