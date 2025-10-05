'use client'

import { Bar } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js'

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
  distribution: Record<number, number>
  color: string
}

export default function RatingChart({ title, distribution, color }: RatingChartProps) {
  const labels = ['10★', '9★', '8★', '7★', '6★', '5★', '4★', '3★', '2★', '1★']
  const dataValues = [10, 9, 8, 7, 6, 5, 4, 3, 2, 1].map(r => distribution[r] || 0)

  const data = {
    labels,
    datasets: [
      {
        label: 'Count',
        data: dataValues,
        backgroundColor: color,
        borderColor: color.replace('0.8', '1'),
        borderWidth: 2,
        borderRadius: 8,
        hoverBackgroundColor: color.replace('0.8', '0.9'),
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
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleFont: { size: 14, weight: 'bold' as const },
        bodyFont: { size: 13 },
        padding: 12,
        cornerRadius: 8,
        callbacks: {
          label: function(context: any) {
            return `${context.parsed.y} ${title.includes('Shows') ? 'shows' : 'movies'}`
          }
        }
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          stepSize: 20,
          font: { size: 12 },
          color: '#666',
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.05)',
        },
      },
      x: {
        ticks: {
          font: { size: 13, weight: 'bold' as const },
          color: '#666',
        },
        grid: {
          display: false,
        },
      },
    },
  }

  return (
    <div className="relative group">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-purple-500/10 to-pink-500/10 rounded-2xl blur-xl group-hover:blur-2xl transition-all duration-300"></div>
      <div className="relative bg-gradient-to-br from-white/95 to-white/80 backdrop-blur-xl rounded-2xl p-8 shadow-xl border border-white/30">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-1 w-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"></div>
          <h2 className="text-xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">{title}</h2>
        </div>
        <div className="h-80">
          <Bar data={data} options={options} />
        </div>
      </div>
    </div>
  )
}

