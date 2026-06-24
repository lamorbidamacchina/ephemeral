'use client';

import { useState } from 'react';
import Link from 'next/link';
import GuestMenu from '@/components/GuestMenu';
import { useParams } from 'next/navigation';

export default function ResetPasswordPage() {
  const { token } = useParams<{ token: string }>();

  const [password, setPassword]   = useState('');
  const [confirm, setConfirm]     = useState('');
  const [error, setError]         = useState('');
  const [success, setSuccess]     = useState(false);
  const [loading, setLoading]     = useState(false);

  if (success) {
    return (
      <div className="min-h-full flex flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm text-center">
          <div className="flex justify-end mb-2"><GuestMenu /></div>
          <h1 className="text-3xl font-semibold tracking-tight text-white mb-4">Password updated</h1>
          <p className="text-sm text-zinc-400 mb-8">
            Your password has been changed. You can now sign in with your new password.
          </p>
          <Link href="/login" className="text-sm text-zinc-400 hover:text-zinc-200 transition">
            Sign in
          </Link>
        </div>
      </div>
    );
  }

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');

    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
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

  return (
    <div className="min-h-full flex flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        <div className="flex justify-end mb-2"><GuestMenu /></div>

        {/* Header */}
        <div className="mb-10 text-center">
          <div className="inline-block rounded-xl bg-emerald-600 px-6 py-3 mb-3">
            <span className="text-white text-3xl leading-none" style={{ fontFamily: 'var(--font-pacifico)' }}>Ephemeral</span>
          </div>
          <p className="text-sm text-zinc-400">Choose a new password.</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-zinc-300 mb-1.5">
              New password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="new-password"
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full rounded-lg bg-zinc-900 border border-zinc-800 px-4 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600 transition"
              placeholder="••••••••"
            />
            <p className="mt-1.5 text-xs text-zinc-500">
              Min 8 characters — uppercase, lowercase, number, special character.
            </p>
          </div>

          <div>
            <label htmlFor="confirm" className="block text-sm font-medium text-zinc-300 mb-1.5">
              Confirm password
            </label>
            <input
              id="confirm"
              type="password"
              autoComplete="new-password"
              required
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              className="w-full rounded-lg bg-zinc-900 border border-zinc-800 px-4 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600 transition"
              placeholder="••••••••"
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
            {loading ? 'Updating…' : 'Set new password'}
          </button>
        </form>

      </div>
    </div>
  );
}
