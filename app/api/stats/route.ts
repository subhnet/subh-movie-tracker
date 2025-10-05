import { NextResponse } from 'next/server'
import { getDashboardData } from '@/lib/csv-reader'

export async function GET() {
  try {
    const data = await getDashboardData()
    
    const stats = {
      watched: data.watchedStats,
      wants: data.wantsStats,
      shows: data.showsStats,
      total: data.watched.length + data.wants.length + data.shows.length,
      completionRate: data.watched.length > 0
        ? ((data.watched.length / (data.watched.length + data.wants.length)) * 100).toFixed(1)
        : 0
    }
    
    return NextResponse.json(stats)
  } catch (error) {
    console.error('Error fetching stats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch stats' },
      { status: 500 }
    )
  }
}

