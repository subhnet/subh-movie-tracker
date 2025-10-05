import type { Metadata } from 'next'
import './globals.css'
import Link from 'next/link'
import AuthButton from './components/AuthButton'

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
        <nav className="bg-white/10 backdrop-blur-lg border-b border-white/20 sticky top-0 z-50 shadow-lg">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <Link href="/" className="flex items-center space-x-3 hover:opacity-90 transition-opacity">
                <span className="text-3xl">🎬</span>
                <span className="text-white font-bold text-xl tracking-tight">Movie Tracker</span>
              </Link>
              <div className="flex items-center space-x-2">
                <Link 
                  href="/" 
                  className="text-white font-medium px-4 py-2 rounded-lg hover:bg-white/20 transition-all duration-200"
                >
                  Dashboard
                </Link>
                <Link 
                  href="/recommendations" 
                  className="text-white font-medium px-4 py-2 rounded-lg hover:bg-white/20 transition-all duration-200"
                >
                  AI Recommendations
                </Link>
                <AuthButton />
              </div>
            </div>
          </div>
        </nav>
        <main className="py-12 px-4 sm:px-6 lg:px-8">
          {children}
        </main>
        <footer className="text-center text-white/70 py-10 text-sm border-t border-white/10 mt-12">
          <p className="font-medium">Generated automatically • Updated daily via GitHub Actions</p>
        </footer>
      </body>
    </html>
  )
}

