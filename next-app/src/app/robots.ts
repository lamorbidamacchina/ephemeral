import type { MetadataRoute } from 'next';

const base = process.env.NEXT_PUBLIC_APP_URL || 'https://sendephemeral.com';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', '/chat/', '/profile', '/wstest'],
    },
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
