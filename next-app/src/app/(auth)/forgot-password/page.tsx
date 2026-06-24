'use client';

import { useState } from 'react';
import Link from 'next/link';
import GuestMenu from '@/components/GuestMenu';

export default function ForgotPasswordPage() {
  const [email, setEmail]     = useState('');
  const [error, setError]     = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Something went wrong.');
        return;
      }

      setSuccess(true);
    } catch {
      setError('Could not reach the server. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="min-h-full flex flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm text-center">
          <h1 className="text-3xl font-semibold tracking-tight text-white mb-4">Check your email</h1>
          <p className="text-sm text-zinc-400 mb-8">
            If an account exists for <span className="text-zinc-200">{email}</span>, you'll receive a
            password reset link shortly.
          </p>
          <Link href="/login" className="text-sm text-zinc-400 hover:text-zinc-200 transition">
            Back to sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full flex flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        <div className="flex justify-end mb-2"><GuestMenu /></div>

        {/* Header */}
        <div className="mb-10 text-center">
          <div className="inline-block rounded-xl bg-emerald-600 px-6 py-3 mb-3">
            <span className="text-white text-3xl leading-none" style={{ fontFamily: 'var(--font-pacifico)' }}>Ephemeral</span>
          </div>
          <p className="text-sm text-zinc-400">Reset your password.</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-zinc-300 mb-1.5">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full rounded-lg bg-zinc-900 border border-zinc-800 px-4 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600 transition"
              placeholder="you@example.com"
            />
          </div>

          {error && (
            <p className="text-sm text-red-400" role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-emerald-600 text-white font-medium text-sm py-3 hover:bg-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-zinc-950 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Sending…' : 'Send reset link'}
          </button>
        </form>

        {/* Footer */}
        <p className="mt-8 text-center text-sm text-zinc-500">
          Remember your password?{' '}
          <Link href="/login" className="text-zinc-300 hover:text-white transition">
            Sign in
          </Link>
        </p>

      </div>
    </div>
  );
}
