import { Bar } from 'react-chartjs-2'
import { useMemo } from 'react'

export function ChartPliegues({
  labels,
  data,
  colors,
}: {
  labels: string[]
  data: number[]
  colors: string[]
}) {
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
      plugins: { legend: { display: false } },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { callback: (v: string | number) => `${v} mm` },
        },
      },
    }),
    [],
  )

  return <Bar data={chartData} options={options} />
}
