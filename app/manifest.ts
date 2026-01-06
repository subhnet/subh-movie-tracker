import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
    return {
        name: 'CinePath Movie Tracker',
        short_name: 'CinePath',
        description: 'Your personal cinematic universe tracker.',
        start_url: '/',
        display: 'standalone',
        background_color: '#0f1014', // Matches our dark theme
        theme_color: '#3b82f6', // Matches our primary blue
        icons: [
            {
                src: '/favicon.ico',
                sizes: 'any',
                type: 'image/x-icon',
            },
        ],
    }
}
