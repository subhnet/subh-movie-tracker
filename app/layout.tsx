import type { Metadata } from 'next'
import './globals.css'
import Navbar from './components/Navbar'
import { Analytics } from '@vercel/analytics/next'
import { SpeedInsights } from '@vercel/speed-insights/next'

export const metadata: Metadata = {
  title: 'CinePath - Your Personal Movie Collection',
  description: 'Track, organize, and discover your favorite movies and TV shows with intelligent recommendations',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gradient-to-br from-primary-500 via-secondary-500 to-primary-600">
        <Navbar />
        <main className="py-12 px-4 sm:px-6 lg:px-8">
          {children}
        </main>
        <footer className="text-center text-white/70 py-10 text-sm border-t border-white/10 mt-12">
          <p className="font-medium">
            Built with ❤️ for movie lovers by{' '}
            <a 
              href="https://subhnet.vercel.app" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-white hover:text-blue-300 font-semibold transition-colors underline decoration-white/30 hover:decoration-blue-300 underline-offset-2"
            >
              Subhransu
            </a>
          </p>
        </footer>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  )
}

