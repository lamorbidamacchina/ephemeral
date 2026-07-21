import { pageMetadata } from '@/lib/seo';

export const metadata = pageMetadata({
  path: '/faq',
  title: 'FAQ',
  description:
    'Common questions about Ephemeral: creating an account without a phone number, how disappearing messages work, mobile support, encryption keys, and what happens when a message is not delivered.',
});

export default function FaqLayout({ children }: { children: React.ReactNode }) {
  return children;
}
