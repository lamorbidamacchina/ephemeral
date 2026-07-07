import type { MetadataRoute } from 'next';

const base = process.env.NEXT_PUBLIC_APP_URL || 'https://sendephemeral.com';

export default function sitemap(): MetadataRoute.Sitemap {
  const pages = ['', '/about', '/faq', '/privacy', '/terms', '/login', '/register'];
  return pages.map((path) => ({
    url: `${base}${path}`,
    lastModified: new Date(),
    changeFrequency: 'monthly',
    priority: path === '' ? 1 : 0.7,
  }));
}
