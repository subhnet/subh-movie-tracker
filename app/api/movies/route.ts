import { NextResponse } from 'next/server'
import { getDashboardData } from '@/lib/csv-reader'

export async function GET() {
  try {
    const data = await getDashboardData()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching movies:', error)
    return NextResponse.json(
      { error: 'Failed to fetch movies' },
      { status: 500 }
    )
  }
}

