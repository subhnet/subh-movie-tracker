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
    <div className="bg-white rounded-2xl p-6 shadow-xl">
      <h2 className="text-2xl font-bold text-gray-800 mb-4">{title}</h2>
      <div className="h-80">
        <Bar data={data} options={options} />
      </div>
    </div>
  )
}

