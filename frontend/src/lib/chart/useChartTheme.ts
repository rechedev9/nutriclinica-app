import { useMemo } from 'react'
import { useTheme } from '@/lib/theme/useTheme'

export interface ChartTheme {
  grid: string
  ticks: string
  legend: string
  tooltipBg: string
  tooltipText: string
  tooltipBorder: string
}

const light: ChartTheme = {
  grid: 'rgba(15,27,45,0.06)',
  ticks: '#647084',
  legend: '#0F1B2D',
  tooltipBg: '#ffffff',
  tooltipText: '#0F1B2D',
  tooltipBorder: '#E8EDF2',
}

const dark: ChartTheme = {
  grid: 'rgba(255,255,255,0.07)',
  ticks: '#93A4BA',
  legend: '#E5EDF5',
  tooltipBg: '#111C2E',
  tooltipText: '#E5EDF5',
  tooltipBorder: '#243042',
}

// Colores de Chart.js (grid, ejes, leyenda, tooltip) según el tema activo.
export function useChartTheme(): ChartTheme & { isDark: boolean } {
  const { effective } = useTheme()
  return useMemo(() => ({ ...(effective === 'dark' ? dark : light), isDark: effective === 'dark' }), [effective])
}

// Bloque común de plugins/opciones de tooltip y leyenda con el tema aplicado.
export function tooltipPlugin(t: ChartTheme) {
  return {
    backgroundColor: t.tooltipBg,
    titleColor: t.tooltipText,
    bodyColor: t.tooltipText,
    borderColor: t.tooltipBorder,
    borderWidth: 1,
    padding: 10,
    cornerRadius: 8,
    boxPadding: 4,
    usePointStyle: true,
  }
}
