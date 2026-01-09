import type { Metadata } from 'next'
import './globals.css'
import Navbar from './components/Navbar'
import { Analytics } from '@vercel/analytics/next'
import { SpeedInsights } from '@vercel/speed-insights/next'

export const metadata: Metadata = {
  title: {
    default: 'CinePath - Your Personal Movie Universe',
    template: '%s | CinePath'
  },
  description: 'Track, organize, and discover your favorite movies and TV shows with intelligent AI recommendations. Your personal ad-free cinematic dashboard.',
  keywords: ['Movie Tracker', 'TV Show Tracker', 'Personal Movie Database', 'CinePath', 'Film Collection', 'AI Movie Recommendations'],
  authors: [{ name: 'Subhransu', url: 'https://subhnet.vercel.app' }],
  creator: 'Subhransu',
  publisher: 'SubhNet',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://cinepath.vercel.app',
    siteName: 'CinePath',
    title: 'CinePath - Track & Discover Movies',
    description: 'The ultimate tool for movie lovers. Track what you watch, get AI recommendations, and build your digital collection.',
    images: [
      {
        url: '/og-image.png', // We'll need to create this later or user can add it
        width: 1200,
        height: 630,
        alt: 'CinePath Dashboard Preview',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'CinePath - Your Personal Movie Universe',
    description: 'Track, organize, and discover movies with AI.',
    creator: '@subhnet',
  },
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon-16x16.png',
    apple: '/apple-touch-icon.png',
  },
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 5,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        {/* Preconnect to external domains for faster resource loading */}
        <link rel="preconnect" href="https://image.tmdb.org" />
        <link rel="dns-prefetch" href="https://image.tmdb.org" />
        <link rel="preconnect" href="https://m.media-amazon.com" />
        <link rel="dns-prefetch" href="https://m.media-amazon.com" />
      </head>
      <body className="min-h-screen bg-gradient-to-br from-primary-500 via-secondary-500 to-primary-600">
        <Navbar />
        <main className="pt-24 pb-12 px-4 sm:px-6 lg:px-8">
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
