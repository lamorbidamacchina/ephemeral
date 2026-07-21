import { pageMetadata } from '@/lib/seo';

export const metadata = pageMetadata({
  path: '/privacy',
  title: 'Privacy Policy',
  description:
    'What data Ephemeral collects, why, and what happens to it. Message content is never stored in readable form, and we do not track your activity, behaviour, or usage patterns.',
});

export default function PrivacyLayout({ children }: { children: React.ReactNode }) {
  return children;
}
