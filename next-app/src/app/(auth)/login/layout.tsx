import { pageMetadata } from '@/lib/seo';

// Thin auth form with nothing to rank — kept out of the index and the sitemap.
export const metadata = pageMetadata({
  path: '/login',
  title: 'Log in',
  description: 'Log in to your Ephemeral account.',
  index: false,
});

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
