import type { Metadata } from 'next'
import './globals.css'
import Link from 'next/link'

export const metadata: Metadata = {
  title: '🎬 Movie Tracker Dashboard',
  description: 'Personal movie tracking with AI-powered recommendations',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gradient-to-br from-primary-500 via-secondary-500 to-primary-600">
        <nav className="bg-white/10 backdrop-blur-md border-b border-white/20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <Link href="/" className="flex items-center space-x-2">
                <span className="text-2xl">🎬</span>
                <span className="text-white font-bold text-xl">Movie Tracker</span>
              </Link>
              <div className="flex space-x-6">
                <Link 
                  href="/" 
                  className="text-white hover:text-white/80 transition-colors"
                >
                  Dashboard
                </Link>
                <Link 
                  href="/recommendations" 
                  className="text-white hover:text-white/80 transition-colors"
                >
                  AI Recommendations
                </Link>
              </div>
            </div>
          </div>
        </nav>
        <main className="py-8 px-4">
          {children}
        </main>
        <footer className="text-center text-white/60 py-8 text-sm">
          <p>Generated automatically • Updated daily via GitHub Actions</p>
        </footer>
      </body>
    </html>
  )
}

