import type { Metadata } from 'next'
import './globals.css'
import Navbar from './components/Navbar'

export const metadata: Metadata = {
  title: 'CineVault - Your Personal Movie Collection',
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
          <p className="font-medium">Built with ❤️ for movie lovers</p>
        </footer>
      </body>
    </html>
  )
}

