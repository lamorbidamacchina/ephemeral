import { pageMetadata } from '@/lib/seo';

export const metadata = pageMetadata({
  path: '/about',
  title: 'About',
  description:
    'How Ephemeral works: messages are encrypted on your device and disappear 60 seconds after being read. When both people are online they pass through the server without ever being written to disk.',
});

export default function AboutLayout({ children }: { children: React.ReactNode }) {
  return children;
}
