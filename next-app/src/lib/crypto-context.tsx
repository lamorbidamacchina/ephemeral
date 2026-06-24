'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { loadOrCreateKeyPair, computeFingerprint } from './crypto';

interface CryptoContextValue {
  privateKey: CryptoKey | null;
  publicKeyB64: string | null;
  fingerprint: string | null;
  cryptoReady: boolean;
  /** Number of pending messages dropped on this app load because the key changed. */
  droppedMessages: number;
}

const CryptoContext = createContext<CryptoContextValue>({
  privateKey: null,
  publicKeyB64: null,
  fingerprint: null,
  cryptoReady: false,
  droppedMessages: 0,
});

export function CryptoProvider({ children }: { children: React.ReactNode }) {
  const [privateKey, setPrivateKey]     = useState<CryptoKey | null>(null);
  const [publicKeyB64, setPublicKeyB64] = useState<string | null>(null);
  const [fingerprint, setFingerprint]   = useState<string | null>(null);
  const [cryptoReady, setCryptoReady]   = useState(false);
  const [droppedMessages, setDropped]   = useState(0);

  useEffect(() => {
    async function init() {
      try {
        const { privateKey, publicKeyB64 } = await loadOrCreateKeyPair();

        // Upload public key — server detects key change, drops stale pending messages,
        // and returns how many were dropped so we can warn the user.
        const res = await fetch('/api/users/keys', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ publicKey: publicKeyB64 }),
          credentials: 'include',
        });

        if (!res.ok) return; // Not authenticated yet (login/register page) — skip silently

        const data = await res.json();
        const fp   = await computeFingerprint(publicKeyB64);

        setPrivateKey(privateKey);
        setPublicKeyB64(publicKeyB64);
        setFingerprint(fp);
        setDropped(data.droppedMessages ?? 0);
        setCryptoReady(true);
      } catch {
        // Web Crypto unavailable or not authenticated — silently skip
      }
    }

    init();
  }, []);

  return (
    <CryptoContext.Provider value={{ privateKey, publicKeyB64, fingerprint, cryptoReady, droppedMessages }}>
      {children}
    </CryptoContext.Provider>
  );
}

export function useCrypto() {
  return useContext(CryptoContext);
}
