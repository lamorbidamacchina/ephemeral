import { pageMetadata } from '@/lib/seo';

export const metadata = pageMetadata({
  path: '/terms',
  title: 'Terms of Use',
  description:
    'Terms of use for Ephemeral. It is an experimental application built as a proof of concept, provided as-is with no guarantees about uptime, reliability, or message delivery.',
});

export default function TermsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
