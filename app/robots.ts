import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
    const baseUrl = 'https://cinepath.vercel.app' // Replace with actual domain

    return {
        rules: {
            userAgent: '*',
            allow: '/',
            disallow: ['/api/*', '/private/*'],

        },
        sitemap: `${baseUrl}/sitemap.xml`,
    }
}
