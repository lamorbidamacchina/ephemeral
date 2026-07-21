import { pageMetadata } from '@/lib/seo';

export const metadata = pageMetadata({
  path: '/register',
  title: 'Create an account',
  description:
    'Sign up for Ephemeral with just an email address and a password. No phone number and no real name required — a temporary or alias email works fine.',
});

export default function RegisterLayout({ children }: { children: React.ReactNode }) {
  return children;
}
