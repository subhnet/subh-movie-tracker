'use client'

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js'
import { Bar } from 'react-chartjs-2'

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
)

interface RatingChartProps {
  title: string
  distribution: Record<string, number>
  color?: string
}

export default function RatingChart({ title, distribution, color = 'rgba(59, 130, 246, 0.8)' }: RatingChartProps) {
  const data = {
    labels: Object.keys(distribution).sort((a, b) => Number(a) - Number(b)),
    datasets: [
      {
        label: 'Movies',
        data: Object.keys(distribution).sort((a, b) => Number(a) - Number(b)).map(k => distribution[k]),
        backgroundColor: color,
        borderRadius: 4,
        hoverBackgroundColor: color.replace('0.9)', '1)'),
      },
    ],
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: 'rgba(0,0,0,0.8)',
        padding: 10,
        cornerRadius: 8,
        titleFont: { size: 13 },
        bodyFont: { size: 12 },
        displayColors: false,
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: { color: 'rgba(255, 255, 255, 0.4)', font: { size: 10 } },
        grid: { color: 'rgba(255, 255, 255, 0.05)' },
        border: { display: false }
      },
      x: {
        ticks: { color: 'rgba(255, 255, 255, 0.6)', font: { size: 10, weight: 'bold' as const } },
        grid: { display: false },
        border: { display: false }
      }
    },
    layout: {
      padding: 0
    }
  }

  return (
    <div className="w-full h-full min-h-[160px]">
      {title && <h4 className="text-white/60 text-xs font-bold uppercase mb-4 tracking-wider">{title}</h4>}
      <Bar data={data} options={options} />
    </div>
  )
}
