import { NextResponse } from 'next/server'
import OpenAI from 'openai'
import { getDashboardData } from '@/lib/csv-reader'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
})

export async function POST(request: Request) {
  try {
    const { type = 'general' } = await request.json()
    
    // Get user's movie data
    const data = await getDashboardData()
    
    // Get top rated movies for context
    const topRated = data.watched
      .filter(m => parseFloat(m.rating) >= 8)
      .sort((a, b) => parseFloat(b.rating) - parseFloat(a.rating))
      .slice(0, 20)
      .map(m => `${m.title} (${m.rating}★)`)
      .join(', ')
    
    const watchlist = data.wants
      .slice(0, 10)
      .map(m => m.title)
      .join(', ')
    
    // Create prompt based on type
    let prompt = ''
    
    if (type === 'watchlist') {
      prompt = `Based on this user's top-rated movies: ${topRated}

Their watchlist includes: ${watchlist}

From their watchlist, recommend which 5 movies they should watch FIRST and why, based on their taste. Format as a JSON array with: title, reason, confidence (0-100).`
    } else {
      prompt = `Based on this user's top-rated movies (${topRated}), recommend 5 NEW movies they haven't seen yet that match their taste. Consider their average rating of ${data.watchedStats.avgRating}/10.

Format as JSON array with: title, reason, confidence (0-100), genres (array).`
    }
    
    // Call OpenAI
    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You are a movie recommendation expert. Analyze viewing patterns and provide personalized recommendations. Always respond with valid JSON only.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 1000,
    })
    
    const content = response.choices[0]?.message?.content || '[]'
    
    // Parse recommendations
    let recommendations
    try {
      recommendations = JSON.parse(content)
    } catch {
      // If JSON parsing fails, return a formatted error
      recommendations = [
        {
          title: 'Error generating recommendations',
          reason: 'Please try again or check your API key',
          confidence: 0
        }
      ]
    }
    
    return NextResponse.json({ recommendations })
    
  } catch (error: any) {
    console.error('Error generating recommendations:', error)
    
    // Provide helpful error messages
    if (error.code === 'insufficient_quota') {
      return NextResponse.json(
        { 
          error: 'OpenAI API quota exceeded. Please add credits to your OpenAI account.',
          recommendations: []
        },
        { status: 402 }
      )
    }
    
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { 
          error: 'OpenAI API key not configured. Add OPENAI_API_KEY to .env.local',
          recommendations: []
        },
        { status: 500 }
      )
    }
    
    return NextResponse.json(
      { 
        error: 'Failed to generate recommendations',
        recommendations: []
      },
      { status: 500 }
    )
  }
}

