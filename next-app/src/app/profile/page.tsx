'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Bell } from 'lucide-react';
import { useCrypto } from '@/lib/crypto-context';
import { clearStoredKeyPair } from '@/lib/crypto';
import {
  getPushStatus,
  subscribeToPush,
  unsubscribeFromPush,
  isStandalone,
  type PushStatus,
} from '@/lib/push';

export default function ProfilePage() {
  const router = useRouter();
  const { fingerprint } = useCrypto();

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(true);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword]         = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving]   = useState(false);
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState(false);

  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [pushStatus, setPushStatus] = useState<PushStatus>('unsupported');
  const [pushBusy, setPushBusy] = useState(false);
  const [pushError, setPushError] = useState('');

  useEffect(() => {
    async function init() {
      const refresh = await fetch('/api/auth/refresh', { method: 'POST', credentials: 'include' });
      if (!refresh.ok) { router.replace('/login'); return; }

      const res = await fetch('/api/users/me', { credentials: 'include' });
      if (!res.ok) { router.replace('/login'); return; }
      const data = await res.json();
      setEmail(data.email);
      setLoading(false);

      try {
        setPushStatus(await getPushStatus());
      } catch {
        setPushStatus('unsupported');
      }
    }
    init();
  }, [router]);

  async function handleToggleNotifications() {
    setPushError('');
    setPushBusy(true);
    try {
      if (pushStatus === 'subscribed') {
        setPushStatus(await unsubscribeFromPush());
      } else {
        setPushStatus(await subscribeToPush());
      }
    } catch {
      setPushError('Could not update notifications. Please try again.');
    } finally {
      setPushBusy(false);
    }
  }

  async function handleDeleteAccount() {
    setDeleting(true);
    try {
      await clearStoredKeyPair();
      await fetch('/api/users/me', { method: 'DELETE', credentials: 'include' });
    } finally {
      router.replace('/login');
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setPwError('');
    setPwSuccess(false);

    if (newPassword !== confirmPassword) {
      setPwError('New passwords do not match.');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) {
        setPwError(data.error || 'Something went wrong.');
      } else {
        setPwSuccess(true);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch {
      setPwError('Could not reach the server.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <p className="text-sm text-zinc-500">Loading…</p>
      </div>
    );
  }

  return (
    <div className="min-h-full flex flex-col w-full max-w-sm mx-auto">

      {/* Header */}
      <header className="px-3 py-3 border-b border-zinc-800 flex items-center gap-3 sticky top-0 z-10 bg-zinc-950">
        <Link href="/" className="text-zinc-400 hover:text-zinc-200 transition">
          <ArrowLeft size={20} />
        </Link>
        <p className="text-sm font-semibold text-white flex-1">Profile</p>
      </header>

      <div className="flex-1 px-4 py-6 space-y-8">

        {/* Account */}
        <section className="space-y-1">
          <p className="text-xs text-zinc-500 uppercase tracking-wider px-1">Account</p>
          <div className="rounded-xl bg-zinc-900 border border-zinc-800 px-4 py-3">
            <p className="text-xs text-zinc-500 mb-0.5">Email</p>
            <p className="text-sm text-white">{email}</p>
          </div>
        </section>

        {/* Fingerprint */}
        <section className="space-y-1">
          <p className="text-xs text-zinc-500 uppercase tracking-wider px-1">Security</p>
          <div className="rounded-xl bg-zinc-900 border border-zinc-800 px-4 py-3 space-y-1">
            <p className="text-xs text-zinc-500">Your fingerprint</p>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Share this with your contacts out-of-band to verify your identity.
            </p>
            <p className="font-mono text-xs text-emerald-400 leading-loose tracking-wider break-all pt-1">
              {fingerprint ?? '…'}
            </p>
          </div>
        </section>

        {/* Notifications */}
        <section className="space-y-1">
          <p className="text-xs text-zinc-500 uppercase tracking-wider px-1">Notifications</p>
          <div className="rounded-xl bg-zinc-900 border border-zinc-800 px-4 py-4 space-y-3">
            <div className="flex items-start gap-3">
              <Bell size={18} className="text-zinc-400 mt-0.5 shrink-0" />
              <div className="space-y-0.5">
                <p className="text-sm text-white">Push notifications</p>
                <p className="text-xs text-zinc-500 leading-relaxed">
                  Get a silent wake-up alert when a message arrives. The alert never
                  contains the message or who sent it.
                </p>
              </div>
            </div>

            {pushStatus === 'unsupported' && !isStandalone() ? (
              <p className="text-xs text-amber-400/90 leading-relaxed">
                On iPhone, add Ephemeral to your Home Screen first (Share → Add to
                Home Screen), then open it from there to enable notifications.
              </p>
            ) : pushStatus === 'unsupported' ? (
              <p className="text-xs text-zinc-500">
                This device or browser doesn’t support push notifications.
              </p>
            ) : pushStatus === 'denied' ? (
              <p className="text-xs text-amber-400/90 leading-relaxed">
                Notifications are blocked. Enable them for Ephemeral in your
                browser or system settings, then reload this page.
              </p>
            ) : (
              <button
                onClick={handleToggleNotifications}
                disabled={pushBusy}
                className={`w-full rounded-lg text-sm font-medium py-2.5 transition disabled:opacity-50 ${
                  pushStatus === 'subscribed'
                    ? 'bg-zinc-800 text-white hover:bg-zinc-700'
                    : 'bg-emerald-600 text-white hover:bg-emerald-500'
                }`}
              >
                {pushBusy
                  ? 'Working…'
                  : pushStatus === 'subscribed'
                    ? 'Turn off notifications'
                    : 'Turn on notifications'}
              </button>
            )}

            {pushError && <p className="text-sm text-red-400">{pushError}</p>}
          </div>
        </section>

        {/* Change password */}
        <section className="space-y-1">
          <p className="text-xs text-zinc-500 uppercase tracking-wider px-1">Change password</p>
          <form
            onSubmit={handleChangePassword}
            className="rounded-xl bg-zinc-900 border border-zinc-800 px-4 py-4 space-y-3"
          >
            <div className="space-y-2">
              <input
                type="password"
                value={currentPassword}
                onChange={e => setCurrentPassword(e.target.value)}
                placeholder="Current password"
                required
                className="w-full rounded-lg bg-zinc-800 border border-zinc-700 px-3 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500 transition"
              />
              <input
                type="password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="New password"
                required
                className="w-full rounded-lg bg-zinc-800 border border-zinc-700 px-3 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500 transition"
              />
              <input
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                required
                className="w-full rounded-lg bg-zinc-800 border border-zinc-700 px-3 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500 transition"
              />
            </div>

            {pwError && <p className="text-sm text-red-400">{pwError}</p>}
            {pwSuccess && <p className="text-sm text-emerald-400">Password updated.</p>}

            <button
              type="submit"
              disabled={saving}
              className="w-full rounded-lg bg-emerald-600 text-white text-sm font-medium py-2.5 hover:bg-emerald-500 transition disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Update password'}
            </button>
          </form>
        </section>

        {/* Delete account */}
        <section className="space-y-1 pb-8">
          <p className="text-xs text-zinc-500 uppercase tracking-wider px-1">Danger zone</p>
          <div className="rounded-xl bg-zinc-900 border border-zinc-800 px-4 py-4">
            {!confirmDelete ? (
              <button
                onClick={() => setConfirmDelete(true)}
                className="text-sm text-red-500 hover:text-red-400 transition"
              >
                Delete account
              </button>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-zinc-300">
                  This will permanently delete your account, all conversations, and all pending messages. This cannot be undone.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={handleDeleteAccount}
                    disabled={deleting}
                    className="flex-1 rounded-lg bg-red-600 text-white text-sm font-medium py-2.5 hover:bg-red-500 transition disabled:opacity-50"
                  >
                    {deleting ? 'Deleting…' : 'Yes, delete my account'}
                  </button>
                  <button
                    onClick={() => setConfirmDelete(false)}
                    disabled={deleting}
                    className="flex-1 rounded-lg bg-zinc-800 text-white text-sm py-2.5 hover:bg-zinc-700 transition disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>

      </div>
    </div>
  );
}
