'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Ban, MoreVertical } from 'lucide-react';
import { useSocket } from '@/lib/socket-context';
import { useCrypto } from '@/lib/crypto-context';
import { clearStoredKeyPair } from '@/lib/crypto';

interface Contact {
  id: string;
  other_user_id: string;
  other_user_email: string;
  contact_name: string | null;
  blocked_by_me: boolean;
}

interface FoundUser {
  id: string;
  email: string;
}

export default function ContactsPage() {
  const router = useRouter();
  const { notifications } = useSocket();
  const { droppedMessages } = useCrypto();

  const [contacts, setContacts] = useState<Contact[]>([]);
  const [refreshing, setRefreshing] = useState(true);
  const [droppedDismissed, setDroppedDismissed] = useState(false);

  const [menuOpen, setMenuOpen] = useState(false);

  const [addOpen, setAddOpen] = useState(false);
  const [searchEmail, setSearchEmail] = useState('');
  const [foundUser, setFoundUser] = useState<FoundUser | null>(null);
  const [searchError, setSearchError] = useState('');
  const [searching, setSearching] = useState(false);
  const [adding, setAdding] = useState(false);
  const [userNotFound, setUserNotFound] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [inviteSuccess, setInviteSuccess] = useState(false);

  async function handleLogout() {
    await clearStoredKeyPair();
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    router.replace('/login');
  }

  useEffect(() => {
    async function init() {
      const refresh = await fetch('/api/auth/refresh', { method: 'POST', credentials: 'include' });
      if (!refresh.ok) {
        router.replace('/login');
        return;
      }
      const res = await fetch('/api/conversations', { credentials: 'include' });
      if (res.ok) setContacts(await res.json());
      setRefreshing(false);
    }
    init();
  }, [router]);

  // Re-fetch contact list when a message arrives from someone not yet in it
  useEffect(() => {
    if (notifications.length === 0) return;
    const knownIds = new Set(contacts.map(c => c.other_user_id));
    if (!notifications.some(n => !knownIds.has(n.fromUserId))) return;
    fetch('/api/conversations', { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setContacts(data); });
  }, [notifications, contacts]);

  const groupedContacts = useMemo(() => {
    const notifSet = new Set(notifications.map(n => n.fromUserId));
    const label = (c: Contact) => (c.contact_name || c.other_user_email).toLowerCase();
    const alpha = (a: Contact, b: Contact) => label(a).localeCompare(label(b));

    const withNotif = contacts.filter(c => !c.blocked_by_me && notifSet.has(c.other_user_id));
    const regular   = contacts.filter(c => !c.blocked_by_me && !notifSet.has(c.other_user_id)).sort(alpha);
    const blocked   = contacts.filter(c => c.blocked_by_me).sort(alpha);

    return { withNotif, regular, blocked };
  }, [contacts, notifications]);

  async function handleSearch(e: { preventDefault(): void }) {
    e.preventDefault();
    setSearchError('');
    setFoundUser(null);
    setUserNotFound(false);
    setInviteSuccess(false);
    setSearching(true);
    try {
      const res = await fetch(
        `/api/users/search?email=${encodeURIComponent(searchEmail)}`,
        { credentials: 'include' }
      );
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 404) setUserNotFound(true);
        else setSearchError(data.error || 'Something went wrong.');
      } else {
        setFoundUser(data);
      }
    } catch {
      setSearchError('Could not reach the server.');
    } finally {
      setSearching(false);
    }
  }

  async function handleInvite() {
    setInviting(true);
    setSearchError('');
    try {
      const res = await fetch('/api/invites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: searchEmail }),
        credentials: 'include',
      });
      const data = await res.json();
      if (res.ok) {
        setInviteSuccess(true);
        setUserNotFound(false);
      } else {
        setSearchError(data.error || 'Could not send invite.');
      }
    } catch {
      setSearchError('Could not reach the server.');
    } finally {
      setInviting(false);
    }
  }

  async function handleAdd() {
    if (!foundUser) return;
    setAdding(true);
    try {
      const res = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ otherUserId: foundUser.id }),
        credentials: 'include',
      });
      const data = await res.json();
      if (res.ok) router.push(`/chat/${data.id}`);
    } catch {
      setSearchError('Could not start conversation.');
      setAdding(false);
    }
  }

  function handleCancel() {
    setAddOpen(false);
    setSearchEmail('');
    setFoundUser(null);
    setSearchError('');
    setUserNotFound(false);
    setInviteSuccess(false);
  }

  const atContactCap = contacts.length >= 10;

  if (refreshing) return null;

  return (
    <div className="min-h-full flex flex-col w-full max-w-sm mx-auto">

      {/* Header */}
      <header className="px-3 py-3 border-b border-zinc-800 sticky top-0 z-10 bg-zinc-950 flex items-center">
        <div className="w-8 h-8 rounded-md bg-emerald-600 flex items-center justify-center shrink-0">
          <span className="text-white text-base leading-none" style={{ fontFamily: 'var(--font-pacifico)' }}>E</span>
        </div>

        <div className="flex-1" />

        {/* Three-dot menu */}
        <div className="relative">
          <button
            onClick={() => setMenuOpen(o => !o)}
            className="text-zinc-400 hover:text-zinc-200 transition p-1 -mr-1"
            title="More options"
          >
            <MoreVertical size={22} />
          </button>

          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 top-full mt-1 z-20 bg-zinc-900 border border-zinc-800 rounded-lg shadow-xl overflow-hidden min-w-[180px]">
                <Link href="/profile" onClick={() => setMenuOpen(false)}
                  className="block px-4 py-3 text-sm text-zinc-200 hover:bg-zinc-800 transition">
                  Profile
                </Link>
                <Link href="/about" onClick={() => setMenuOpen(false)}
                  className="block px-4 py-3 text-sm text-zinc-200 hover:bg-zinc-800 transition">
                  About
                </Link>
                <Link href="/faq" onClick={() => setMenuOpen(false)}
                  className="block px-4 py-3 text-sm text-zinc-200 hover:bg-zinc-800 transition">
                  FAQ
                </Link>
                <Link href="/terms" onClick={() => setMenuOpen(false)}
                  className="block px-4 py-3 text-sm text-zinc-200 hover:bg-zinc-800 transition">
                  Terms of Service
                </Link>
                <Link href="/privacy" onClick={() => setMenuOpen(false)}
                  className="block px-4 py-3 text-sm text-zinc-200 hover:bg-zinc-800 transition">
                  Privacy Policy
                </Link>
                <div className="border-t border-zinc-800" />
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-3 text-sm text-red-400 hover:bg-zinc-800 transition"
                >
                  Sign out
                </button>
              </div>
            </>
          )}
        </div>
      </header>

      {/* New-session warning — shown when the key changed and pending messages were dropped */}
      {droppedMessages > 0 && !droppedDismissed && (
        <div className="px-4 py-3 bg-amber-950/60 border-b border-amber-800/40 flex items-start justify-between gap-3">
          <p className="text-xs text-amber-400 leading-relaxed">
            You started a new session.{' '}
            {droppedMessages === 1
              ? '1 message sent to you'
              : `${droppedMessages} messages sent to you`}{' '}
            before this login could not be delivered.
          </p>
          <button
            onClick={() => setDroppedDismissed(true)}
            className="text-amber-600 hover:text-amber-400 text-xs shrink-0 transition"
          >
            ✕
          </button>
        </div>
      )}

      {/* Add contact */}
      <div className="border-b border-zinc-800">
        {!addOpen ? (
          <button
            onClick={() => setAddOpen(true)}
            className="w-full flex items-center gap-3 px-4 py-4 text-emerald-500 hover:bg-zinc-900 transition text-sm font-medium"
          >
            <span className="text-lg leading-none">+</span>
            New contact
          </button>
        ) : (
          <div className="px-4 py-4 space-y-3">
            {atContactCap && (
              <p className="text-xs text-amber-400">
                You have reached the 10-contact limit. Remove a contact to add a new one.
              </p>
            )}

            <form onSubmit={handleSearch} className="flex gap-2">
              <input
                type="email"
                autoFocus
                required
                value={searchEmail}
                onChange={e => setSearchEmail(e.target.value)}
                placeholder="Search by email"
                className="flex-1 rounded-lg bg-zinc-900 border border-zinc-800 px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600 transition"
              />
              <button
                type="submit"
                disabled={searching}
                className="rounded-lg bg-emerald-600 text-white text-sm font-medium px-4 py-2 hover:bg-emerald-500 transition disabled:opacity-50"
              >
                {searching ? '…' : 'Search'}
              </button>
            </form>

            {searchError && <p className="text-sm text-red-400">{searchError}</p>}

            {foundUser && (
              <div className="flex items-center justify-between rounded-lg bg-zinc-900 px-3 py-3">
                <span className="text-sm text-zinc-200">{foundUser.email}</span>
                {atContactCap ? (
                  <span className="text-xs text-zinc-500">Contact limit reached</span>
                ) : (
                  <button
                    onClick={handleAdd}
                    disabled={adding}
                    className="text-sm text-emerald-500 hover:text-emerald-400 font-medium transition disabled:opacity-50"
                  >
                    {adding ? '…' : 'Start chat →'}
                  </button>
                )}
              </div>
            )}

            {userNotFound && !inviteSuccess && (
              <div className="rounded-lg bg-zinc-900 px-3 py-3 space-y-2">
                <p className="text-sm text-zinc-400">
                  No account found for <span className="text-zinc-200">{searchEmail}</span>.
                </p>
                <button
                  onClick={handleInvite}
                  disabled={inviting}
                  className="text-sm text-emerald-500 hover:text-emerald-400 font-medium transition disabled:opacity-50"
                >
                  {inviting ? 'Sending…' : 'Invite to Ephemeral →'}
                </button>
              </div>
            )}

            {inviteSuccess && (
              <p className="text-sm text-emerald-400">
                Invite sent to {searchEmail}.
              </p>
            )}

            <button
              onClick={handleCancel}
              className="text-xs text-zinc-500 hover:text-zinc-300 transition"
            >
              Cancel
            </button>
          </div>
        )}
      </div>

      {/* Contact list */}
      <ul className="flex-1">
        {contacts.length === 0 ? (
          <li className="px-4 py-12 text-center">
            <p className="text-sm text-zinc-500">No contacts yet.</p>
            <p className="text-xs text-zinc-600 mt-1">Search for someone by email to start.</p>
          </li>
        ) : (
          <>
            {groupedContacts.withNotif.map((contact, i) => {
              const isLast = i === groupedContacts.withNotif.length - 1;
              const isSep = isLast && (groupedContacts.regular.length > 0 || groupedContacts.blocked.length > 0);
              return (
                <li key={contact.id}>
                  <Link href={`/chat/${contact.id}`} className={`flex items-center px-4 py-4 hover:bg-zinc-900 transition border-b ${isSep ? 'border-zinc-600' : 'border-zinc-800/50'}`}>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white truncate">{contact.contact_name || contact.other_user_email}</p>
                    </div>
                    <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 ml-2" />
                    <span className="text-zinc-600 text-xs ml-2">›</span>
                  </Link>
                </li>
              );
            })}

            {groupedContacts.regular.map((contact, i) => {
              const isLast = i === groupedContacts.regular.length - 1;
              const isSep = isLast && groupedContacts.blocked.length > 0;
              return (
                <li key={contact.id}>
                  <Link href={`/chat/${contact.id}`} className={`flex items-center px-4 py-4 hover:bg-zinc-900 transition border-b ${isSep ? 'border-zinc-600' : 'border-zinc-800/50'}`}>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white truncate">{contact.contact_name || contact.other_user_email}</p>
                    </div>
                    <span className="text-zinc-600 text-xs ml-2">›</span>
                  </Link>
                </li>
              );
            })}

            {groupedContacts.blocked.map(contact => (
              <li key={contact.id}>
                <Link href={`/chat/${contact.id}`} className="flex items-center px-4 py-4 hover:bg-zinc-900 transition border-b border-zinc-800/50">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white truncate">{contact.contact_name || contact.other_user_email}</p>
                  </div>
                  <Ban size={14} className="text-zinc-500 shrink-0 ml-2" />
                  <span className="text-zinc-600 text-xs ml-2">›</span>
                </Link>
              </li>
            ))}
          </>
        )}
      </ul>


    </div>
  );
}
