import { Line } from 'react-chartjs-2'
import { useMemo } from 'react'

interface Props {
  labels: string[]
  peso: (number | null)[]
  grasa: (number | null)[]
}

export function ChartPesoGrasa({ labels, peso, grasa }: Props) {
  const data = useMemo(
    () => ({
      labels,
      datasets: [
        {
          label: 'Peso (kg)',
          data: peso,
          yAxisID: 'yPeso',
          borderColor: '#2DD4BF',
          backgroundColor: 'rgba(45,212,191,0.12)',
          pointBackgroundColor: '#2DD4BF',
          borderWidth: 2.5,
          tension: 0.45,
          fill: true,
          spanGaps: true,
        },
        {
          label: '% Masa grasa',
          data: grasa,
          yAxisID: 'yGrasa',
          borderColor: '#A78BFA',
          backgroundColor: 'rgba(167,139,250,0.12)',
          pointBackgroundColor: '#A78BFA',
          borderWidth: 2.5,
          tension: 0.45,
          fill: true,
          spanGaps: true,
        },
      ],
    }),
    [labels, peso, grasa],
  )

  const options = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index' as const, intersect: false },
      plugins: { legend: { position: 'bottom' as const, labels: { boxWidth: 12 } } },
      scales: {
        yPeso: { type: 'linear' as const, position: 'left' as const, title: { display: true, text: 'kg' } },
        yGrasa: {
          type: 'linear' as const,
          position: 'right' as const,
          title: { display: true, text: '%' },
          grid: { drawOnChartArea: false },
        },
      },
    }),
    [],
  )

  return <Line data={data} options={options} />
}
