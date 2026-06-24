'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, MoreVertical, Send } from 'lucide-react';
import { useSocket, type IncomingMessage } from '@/lib/socket-context';
import { useCrypto } from '@/lib/crypto-context';
import { deriveSharedKey, encryptMessage, decryptMessage, computeFingerprint } from '@/lib/crypto';
import { checkPeerFingerprint } from '@/lib/peer-keys';
import { MAX_MESSAGE_CHARS } from '@/lib/limits';

interface Message {
  id: string;
  text: string;
  fromMe: boolean;
  pulsing: boolean;
}

interface OtherUser {
  id: string;
  email: string;
  contactName: string | null;
}

export default function ChatPage() {
  const router = useRouter();
  const params = useParams();
  const conversationId = params.conversationId as string;

  const { socket, connected, registerHandler, unregisterHandler } = useSocket();
  const { privateKey, cryptoReady } = useCrypto();

  const [messages, setMessages]     = useState<Message[]>([]);
  const [otherUser, setOtherUser]   = useState<OtherUser | null>(null);
  const [sharedKey, setSharedKey]   = useState<CryptoKey | null>(null);
  const [peerOnline, setPeerOnline] = useState(false);
  const [inputText, setInputText]   = useState('');
  const [loading, setLoading]         = useState(true);
  const [menuOpen, setMenuOpen]       = useState(false);
  const [confirming, setConfirming]   = useState(false);
  const [removing, setRemoving]       = useState(false);
  const [blockedByMe, setBlockedByMe] = useState(false);
  const [sendError, setSendError]     = useState<string | null>(null);
  const [keyChanged, setKeyChanged]   = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  // Always-current ref so the message handler never captures a stale sharedKey
  const sharedKeyRef = useRef<CryptoKey | null>(null);
  // Buffer for encrypted messages that arrived before the shared key was ready
  const pendingEncryptedRef = useRef<IncomingMessage[]>([]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Load conversation info
  useEffect(() => {
    async function init() {
      const refresh = await fetch('/api/auth/refresh', { method: 'POST', credentials: 'include' });
      if (!refresh.ok) { router.replace('/login'); return; }

      const convRes = await fetch(`/api/conversations/${conversationId}`, { credentials: 'include' });
      if (!convRes.ok) { router.replace('/'); return; }
      const conv = await convRes.json();
      setOtherUser({ id: conv.other_user_id, email: conv.other_user_email, contactName: conv.contact_name ?? null });
      setBlockedByMe(conv.blocked_by_me ?? false);
      setLoading(false);
    }
    init();
  }, [conversationId, router]);

  // Derive shared key once we have our private key and the other user's ID
  useEffect(() => {
    if (!otherUser || !privateKey || !cryptoReady) return;

    async function derive() {
      const keyRes = await fetch(`/api/users/${otherUser!.id}/key`, { credentials: 'include' });
      if (!keyRes.ok) return;
      const { publicKey: theirPublicKeyB64 } = await keyRes.json();

      // Warn if this contact's key changed since we last saw it (possible MITM).
      // Messaging still proceeds — the banner is advisory; the user verifies and
      // acknowledges on the contact info page.
      const fp = await computeFingerprint(theirPublicKeyB64);
      setKeyChanged(checkPeerFingerprint(otherUser!.id, fp) === 'changed');

      const key = await deriveSharedKey(privateKey!, theirPublicKeyB64);
      sharedKeyRef.current = key;
      setSharedKey(key);
    }

    derive();
  }, [otherUser, privateKey, cryptoReady]);

  // Drain any messages that arrived before the shared key was ready
  useEffect(() => {
    if (!sharedKey || pendingEncryptedRef.current.length === 0) return;

    const pending = pendingEncryptedRef.current;
    pendingEncryptedRef.current = [];

    pending.forEach(msg => {
      decryptMessage(msg.payload, sharedKey)
        .then(plaintext => {
          addMessage({ id: msg.messageId, text: plaintext, fromMe: false });
          socket?.emit('delivery_ack', { messageId: msg.messageId });
        })
        .catch(() => {
          // Key mismatch — ACK to clean up relay, silently discard
          socket?.emit('delivery_ack', { messageId: msg.messageId });
        });
    });
  }, [sharedKey, socket]); // addMessage intentionally omitted — stable useCallback

  const addMessage = useCallback((msg: { id: string; text: string; fromMe: boolean }) => {
    setMessages(prev => {
      if (prev.some(m => m.id === msg.id)) return prev; // deduplicate on reconnect
      return [...prev, { ...msg, pulsing: false }];
    });

    setTimeout(() => {
      setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, pulsing: true } : m));
    }, 55000);

    setTimeout(() => {
      setMessages(prev => prev.filter(m => m.id !== msg.id));
    }, 60000);
  }, []);

  // Register incoming message handler
  useEffect(() => {
    if (!otherUser || !socket) return;
    const sock = socket;

    function handleIncoming(msg: IncomingMessage) {
      const key = sharedKeyRef.current;
      if (!key) {
        // Shared key not ready yet — buffer and process when it arrives
        pendingEncryptedRef.current.push(msg);
        return;
      }
      decryptMessage(msg.payload, key)
        .then(plaintext => {
          addMessage({ id: msg.messageId, text: plaintext, fromMe: false });
          sock.emit('delivery_ack', { messageId: msg.messageId });
        })
        .catch(() => {
          sock.emit('delivery_ack', { messageId: msg.messageId });
        });
    }

    registerHandler(otherUser.id, handleIncoming);
    return () => unregisterHandler(otherUser.id);
  }, [otherUser, socket, addMessage, registerHandler, unregisterHandler]);

  // Handle relay errors — specifically rate_limited
  useEffect(() => {
    if (!socket) return;
    function handleError(data: { messageId?: string; error: string }) {
      const message =
        data.error === 'rate_limited'
          ? 'Sending too fast — message not sent. Slow down and try again.'
          : data.error === 'queue_full'
          ? "This contact's inbox is full — they haven't been online recently. Try again later."
          : data.error === 'message_too_long'
          ? 'Message too long — not sent.'
          : null;
      if (!message) return;

      if (data.messageId) {
        setMessages(prev => prev.filter(m => m.id !== data.messageId));
      }
      setSendError(message);
      setTimeout(() => setSendError(null), 4000);
    }
    socket.on('error', handleError);
    return () => { socket.off('error', handleError); };
  }, [socket]);

  // Watch peer presence
  useEffect(() => {
    if (!otherUser || !socket) return;

    function handlePresence(data: { userId: string; online: boolean }) {
      if (data.userId === otherUser!.id) setPeerOnline(data.online);
    }

    socket.on('presence_update', handlePresence);
    socket.emit('watch_presence', { userId: otherUser.id });

    return () => {
      socket.emit('unwatch_presence', { userId: otherUser!.id });
      socket.off('presence_update', handlePresence);
    };
  }, [otherUser, socket]);

  async function handleRemove() {
    setRemoving(true);
    const res = await fetch(`/api/conversations/${conversationId}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    if (res.ok) {
      router.replace('/');
    } else {
      setRemoving(false);
      setConfirming(false);
      setMenuOpen(false);
    }
  }

  async function handleSend(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    const text = inputText.trim();
    if (!text || !socket || !otherUser || !sharedKey) return;

    const messageId  = crypto.randomUUID();
    const ciphertext = await encryptMessage(text, sharedKey);
    setInputText('');

    socket.emit('message', {
      messageId,
      toUserId: otherUser.id,
      payload:  ciphertext,
      sentAt:   Date.now(),
    });

    addMessage({ id: messageId, text, fromMe: true });
  }

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <p className="text-sm text-zinc-500">Loading…</p>
      </div>
    );
  }

  return (
    <div className="h-dvh flex flex-col max-w-sm mx-auto w-full">

      {/* Header */}
      <header className="px-3 py-3 border-b border-zinc-800 flex items-center gap-3 shrink-0 sticky top-0 z-10 bg-zinc-950">
        <Link href="/" className="text-zinc-400 hover:text-zinc-200 transition">
          <ArrowLeft size={20} />
        </Link>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white truncate">{otherUser?.contactName || otherUser?.email}</p>
        </div>

        {peerOnline && (
          <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
        )}

        {/* Three-dot menu */}
        <div className="relative">
          <button
            onClick={() => { setMenuOpen(o => !o); setConfirming(false); }}
            className="text-zinc-400 hover:text-zinc-200 transition p-1 -mr-1"
            title="More options"
          >
            <MoreVertical size={22} />
          </button>

          {menuOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => { setMenuOpen(false); setConfirming(false); }}
              />
              <div className="absolute right-0 top-full mt-1 z-20 bg-zinc-900 border border-zinc-800 rounded-lg shadow-xl overflow-hidden min-w-[160px]">
                {!confirming ? (
                  <>
                    <button
                      onClick={() => { setMenuOpen(false); router.push(`/chat/${conversationId}/contact`); }}
                      className="w-full text-left px-4 py-3 text-sm text-zinc-200 hover:bg-zinc-800 transition"
                    >
                      Contact info
                    </button>
                    <div className="border-t border-zinc-800" />
                    <button
                      onClick={() => setConfirming(true)}
                      className="w-full text-left px-4 py-3 text-sm text-zinc-200 hover:bg-zinc-800 transition"
                    >
                      Remove contact
                    </button>
                  </>
                ) : (
                  <div className="flex flex-col">
                    {blockedByMe && (
                      <p className="px-4 pt-3 pb-1 text-xs text-zinc-500 leading-snug">
                        This will also remove your block on this contact.
                      </p>
                    )}
                    <button
                      onClick={handleRemove}
                      disabled={removing}
                      className="w-full text-left px-4 py-3 text-sm text-red-400 hover:bg-zinc-800 transition disabled:opacity-50"
                    >
                      {removing ? 'Removing…' : 'Confirm removal'}
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </header>

      {/* Security-code change warning (possible MITM / new device) */}
      {keyChanged && (
        <div className="px-4 py-2.5 bg-amber-950/60 border-b border-amber-800/40 shrink-0">
          <p className="text-xs text-amber-300 leading-snug">
            ⚠️ {otherUser?.contactName || otherUser?.email}&apos;s security code has changed.
            They may have reinstalled the app or switched devices — or someone could be
            intercepting your messages.{' '}
            <Link href={`/chat/${conversationId}/contact`} className="underline font-medium">
              Verify it
            </Link>.
          </p>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.length === 0 && (
          <p className="text-center text-sm text-zinc-400 mt-8 px-6 leading-relaxed">
            Messages disappear after 60 seconds, or when you leave this chat.
          </p>
        )}

        {messages.map(msg => (
          <div key={msg.id} className={`flex ${msg.fromMe ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`relative max-w-[75%] rounded-2xl overflow-hidden
                ${msg.fromMe ? 'bg-zinc-800 rounded-br-sm' : 'bg-zinc-900 border border-zinc-800 rounded-bl-sm'}
                ${msg.pulsing ? 'animate-[pulse-bubble_0.8s_ease-in-out_infinite]' : ''}
              `}
            >
              <p className="text-sm text-white px-4 pt-3 pb-4 leading-relaxed break-words">
                {msg.text}
              </p>

              <div className="absolute bottom-0 left-0 right-0 h-0.5 overflow-hidden">
                <div
                  className={`h-full ${msg.fromMe ? 'bg-zinc-500' : 'bg-emerald-600'}`}
                  style={{ transformOrigin: 'left', animation: 'shrink-bar 60s linear forwards' }}
                />
              </div>
            </div>
          </div>
        ))}

        <div ref={messagesEndRef} />
      </div>

      {/* Rate-limit error banner */}
      {sendError && (
        <div className="px-4 py-2 bg-red-950/60 border-t border-red-800/40">
          <p className="text-xs text-red-400 text-center">{sendError}</p>
        </div>
      )}

      {/* Input */}
      <form
        onSubmit={handleSend}
        className="px-3 py-3 border-t border-zinc-800 flex items-center gap-2 shrink-0 pb-[max(12px,env(safe-area-inset-bottom))]"
      >
        <input
          type="text"
          autoFocus
          maxLength={MAX_MESSAGE_CHARS}
          value={inputText}
          onChange={e => setInputText(e.target.value)}
          placeholder="Message"
          className="flex-1 rounded-full bg-zinc-900 border border-zinc-800 px-4 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-600 transition"
        />
        <button
          type="submit"
          disabled={!inputText.trim() || !connected || !sharedKey}
          className="w-10 h-10 rounded-full bg-emerald-600 flex items-center justify-center text-white hover:bg-emerald-500 transition disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
        >
          <Send size={16} />
        </button>
      </form>

    </div>
  );
}
