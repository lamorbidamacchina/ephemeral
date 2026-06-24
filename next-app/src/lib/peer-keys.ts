// Trust-on-first-use (TOFU) tracking of contacts' public-key fingerprints.
//
// We deliberately do NOT trust the server to tell us when a contact's key
// changed — the server is exactly the MITM this defends against, and could
// simply stay silent. Instead each device remembers the fingerprint it first
// saw for a contact and warns the user if it ever changes (the Signal/WhatsApp
// "your security code changed" model).
//
// Fingerprints are public, not secret, so localStorage is fine. Browser-only
// access is wrapped here so components never touch `window` directly.

const PREFIX = 'peerfp:';

function safeLocalStorage(): Storage | null {
  try {
    if (typeof window === 'undefined') return null;
    return window.localStorage;
  } catch {
    return null; // storage disabled (e.g. private mode) — degrade gracefully
  }
}

export function getSeenFingerprint(userId: string): string | null {
  return safeLocalStorage()?.getItem(PREFIX + userId) ?? null;
}

export function setSeenFingerprint(userId: string, fingerprint: string): void {
  safeLocalStorage()?.setItem(PREFIX + userId, fingerprint);
}

export type FingerprintStatus = 'first' | 'same' | 'changed';

/**
 * Compare a freshly fetched fingerprint against the one we last saw for this
 * contact. On first sight the fingerprint is recorded (TOFU) and `'first'` is
 * returned. A `'changed'` result is intentionally NOT recorded — the caller
 * records it (via setSeenFingerprint) only once the user acknowledges the new
 * code, so the warning persists until then.
 */
export function checkPeerFingerprint(userId: string, fingerprint: string): FingerprintStatus {
  const seen = getSeenFingerprint(userId);
  if (seen === null) {
    setSeenFingerprint(userId, fingerprint);
    return 'first';
  }
  return seen === fingerprint ? 'same' : 'changed';
}
