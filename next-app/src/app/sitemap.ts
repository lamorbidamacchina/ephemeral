import type { MetadataRoute } from 'next';

const base = process.env.NEXT_PUBLIC_APP_URL || 'https://sendephemeral.com';

// lastModified is hardcoded so it reflects when the page content actually
// changed. `new Date()` stamps every page with the build date, which Google
// learns to ignore. Bump the date by hand when you edit a page.
// `/login` is intentionally absent — it is noindex (see (auth)/login/layout.tsx).
const pages = [
  { path: '',          lastModified: '2026-06-24', priority: 1 },
  { path: '/about',    lastModified: '2026-07-07', priority: 0.7 },
  { path: '/faq',      lastModified: '2026-06-24', priority: 0.7 },
  { path: '/privacy',  lastModified: '2026-06-24', priority: 0.7 },
  { path: '/terms',    lastModified: '2026-06-24', priority: 0.7 },
  { path: '/register', lastModified: '2026-06-24', priority: 0.7 },
];

export default function sitemap(): MetadataRoute.Sitemap {
  return pages.map(({ path, lastModified, priority }) => ({
    url: `${base}${path}`,
    lastModified,
    changeFrequency: 'monthly',
    priority,
  }));
}
