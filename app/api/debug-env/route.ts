import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    hasKey: !!process.env.OPENROUTER_API_KEY,
    keyPrefix: process.env.OPENROUTER_API_KEY?.substring(0, 15) + '...',
    allEnvVars: Object.keys(process.env).filter(key => 
      key.includes('OPENROUTER') || key.includes('VERCEL')
    )
  })
}

