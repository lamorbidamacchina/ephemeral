import type { Metadata } from 'next';

/**
 * Per-page metadata for a route segment.
 *
 * The root layout sets `alternates.canonical: '/'`, and App Router metadata is
 * inherited by every child route that does not override it. Because all of our
 * pages are client components (which cannot export `metadata`), each public
 * route needs a `layout.tsx` calling this helper — otherwise the page tells
 * Google its canonical is the homepage and gets dropped from the index.
 *
 * Metadata merging is shallow: declaring `openGraph` or `twitter` in a child
 * replaces the parent object wholesale, so every nested field is re-declared
 * here rather than inherited.
 */
export function pageMetadata({
  path,
  title,
  description,
  index = true,
}: {
  path: string;
  title: string;
  description: string;
  index?: boolean;
}): Metadata {
  const fullTitle = `${title} — Ephemeral`;

  return {
    title,
    description,
    alternates: { canonical: path },
    robots: index
      ? { index: true, follow: true, googleBot: { index: true, follow: true } }
      : { index: false, follow: true, googleBot: { index: false, follow: true } },
    openGraph: {
      type: 'website',
      siteName: 'Ephemeral',
      title: fullTitle,
      description,
      url: path,
      images: ['/icon-512.png'],
    },
    twitter: {
      card: 'summary',
      title: fullTitle,
      description,
      images: ['/icon-512.png'],
    },
  };
}
