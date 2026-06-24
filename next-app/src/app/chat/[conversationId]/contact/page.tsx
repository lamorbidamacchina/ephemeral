'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { computeFingerprint } from '@/lib/crypto';
import { checkPeerFingerprint, setSeenFingerprint } from '@/lib/peer-keys';

export default function ContactPage() {
  const router = useRouter();
  const params = useParams();
  const conversationId = params.conversationId as string;

  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [otherUserId, setOtherUserId] = useState('');
  const [blocked, setBlocked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [confirmingBlock, setConfirmingBlock] = useState(false);
  const [error, setError] = useState('');
  const [fingerprint, setFingerprint] = useState<string | null>(null);
  const [fingerprintChanged, setFingerprintChanged] = useState(false);

  useEffect(() => {
    async function init() {
      const refresh = await fetch('/api/auth/refresh', { method: 'POST', credentials: 'include' });
      if (!refresh.ok) { router.replace('/login'); return; }

      const res = await fetch(`/api/conversations/${conversationId}`, { credentials: 'include' });
      if (!res.ok) { router.replace('/'); return; }

      const conv = await res.json();
      setEmail(conv.other_user_email);
      setName(conv.contact_name ?? '');
      setOtherUserId(conv.other_user_id);
      setBlocked(conv.blocked_by_me ?? false);
      setLoading(false);
    }
    init();
  }, [conversationId, router]);

  // Load the contact's security code (fingerprint) and flag if it changed (TOFU)
  useEffect(() => {
    if (!otherUserId) return;
    async function loadFingerprint() {
      const res = await fetch(`/api/users/${otherUserId}/key`, { credentials: 'include' });
      if (!res.ok) return;
      const { publicKey } = await res.json();
      const fp = await computeFingerprint(publicKey);
      setFingerprint(fp);
      setFingerprintChanged(checkPeerFingerprint(otherUserId, fp) === 'changed');
    }
    loadFingerprint();
  }, [otherUserId]);

  function acknowledgeFingerprint() {
    if (fingerprint) setSeenFingerprint(otherUserId, fingerprint);
    setFingerprintChanged(false);
  }

  async function handleSave(e: { preventDefault(): void }) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const res = await fetch(`/api/conversations/${conversationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contactName: name }),
        credentials: 'include',
      });
      if (res.ok) {
        router.push(`/chat/${conversationId}`);
      } else {
        setError('Could not save. Please try again.');
        setSaving(false);
      }
    } catch {
      setError('Could not reach the server.');
      setSaving(false);
    }
  }

  async function handleBlock() {
    setError('');
    try {
      const res = await fetch(`/api/conversations/${conversationId}/block`, {
        method: 'POST',
        credentials: 'include',
      });
      if (res.ok) {
        setBlocked(true);
        setConfirmingBlock(false);
      } else {
        setError('Could not block. Please try again.');
      }
    } catch {
      setError('Could not reach the server.');
    }
  }

  async function handleUnblock() {
    setError('');
    try {
      const res = await fetch(`/api/conversations/${conversationId}/block`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (res.ok) {
        setBlocked(false);
      } else {
        setError('Could not unblock. Please try again.');
      }
    } catch {
      setError('Could not reach the server.');
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
        <button
          onClick={() => router.push(`/chat/${conversationId}`)}
          className="text-zinc-400 hover:text-zinc-200 transition"
        >
          <ArrowLeft size={20} />
        </button>
        <p className="text-sm font-medium text-white">Contact info</p>
      </header>

      <form onSubmit={handleSave} className="flex flex-col gap-6 px-4 py-6">

        {/* Email — read only */}
        <div className="space-y-1">
          <p className="text-xs text-zinc-500 uppercase tracking-wide">Email</p>
          <p className="text-sm text-zinc-300 px-3 py-2.5 rounded-lg bg-zinc-900 border border-zinc-800">
            {email}
          </p>
        </div>

        {/* Name — editable */}
        <div className="space-y-1">
          <label htmlFor="contact-name" className="text-xs text-zinc-500 uppercase tracking-wide">
            Name
          </label>
          <input
            id="contact-name"
            type="text"
            autoFocus
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Add a name…"
            maxLength={255}
            className="w-full rounded-lg bg-zinc-900 border border-zinc-800 px-3 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600 transition"
          />
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-emerald-600 text-white text-sm font-medium px-4 py-2.5 hover:bg-emerald-500 transition disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save'}
        </button>

      </form>

      {/* Security code (fingerprint) — for out-of-band verification */}
      <div className="px-4 pb-2">
        <div className="border-t border-zinc-800 pt-6 space-y-2">
          <p className="text-xs text-zinc-500 uppercase tracking-wide">Security code</p>

          {fingerprintChanged && (
            <div className="rounded-lg bg-amber-950/60 border border-amber-800/40 px-3 py-2.5 space-y-2">
              <p className="text-xs text-amber-300 leading-snug">
                ⚠️ This contact&apos;s security code has changed since you last saw it.
                Compare it with them in person or over a trusted channel before you keep
                trusting this chat.
              </p>
              <button
                type="button"
                onClick={acknowledgeFingerprint}
                className="rounded-lg bg-amber-700 text-white text-xs font-medium px-3 py-2 hover:bg-amber-600 transition"
              >
                I&apos;ve verified this code
              </button>
            </div>
          )}

          <p className="font-mono text-xs text-emerald-400 leading-loose tracking-wider break-words px-3 py-2.5 rounded-lg bg-zinc-900 border border-zinc-800">
            {fingerprint ?? '…'}
          </p>
          <p className="text-xs text-zinc-500 leading-snug">
            Compare this with the code on {email}&apos;s device to confirm no one is
            intercepting your messages.
          </p>
        </div>
      </div>

      {/* Block / Unblock */}
      <div className="px-4 pb-8 flex flex-col gap-3">
        <div className="border-t border-zinc-800 pt-6">
          {blocked ? (
            <>
              <p className="text-xs text-zinc-500 mb-3">
                You've blocked {email}. They cannot send you messages.
              </p>
              <button
                type="button"
                onClick={handleUnblock}
                className="w-full rounded-lg bg-zinc-800 text-zinc-200 text-sm font-medium px-4 py-2.5 hover:bg-zinc-700 transition"
              >
                Unblock contact
              </button>
            </>
          ) : confirmingBlock ? (
            <>
              <p className="text-xs text-zinc-500 mb-3">
                Block {email}? They won't be able to send you messages.
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleBlock}
                  className="flex-1 rounded-lg bg-red-700 text-white text-sm font-medium px-4 py-2.5 hover:bg-red-600 transition"
                >
                  Block
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmingBlock(false)}
                  className="flex-1 rounded-lg bg-zinc-800 text-zinc-200 text-sm font-medium px-4 py-2.5 hover:bg-zinc-700 transition"
                >
                  Cancel
                </button>
              </div>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmingBlock(true)}
              className="w-full rounded-lg bg-zinc-900 border border-zinc-800 text-red-400 text-sm font-medium px-4 py-2.5 hover:bg-zinc-800 transition"
            >
              Block contact
            </button>
          )}
        </div>
      </div>

    </div>
  );
}
