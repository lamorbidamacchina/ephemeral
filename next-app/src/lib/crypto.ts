// ─── IndexedDB helpers ────────────────────────────────────────────────────────

const IDB_DB_NAME = 'ephemeral-im-keys';
const IDB_STORE   = 'keys';
const IDB_PRIVATE = 'ecdh-private';
const IDB_PUBLIC  = 'ecdh-public-b64';

function openKeyDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(IDB_STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
  });
}

function idbGet(db: IDBDatabase, key: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const req = db.transaction(IDB_STORE, 'readonly').objectStore(IDB_STORE).get(key);
    req.onsuccess = () => resolve(req.result ?? null);
    req.onerror   = () => reject(req.error);
  });
}

function idbPut(db: IDBDatabase, key: string, value: any): Promise<void> {
  return new Promise((resolve, reject) => {
    const req = db.transaction(IDB_STORE, 'readwrite').objectStore(IDB_STORE).put(value, key);
    req.onsuccess = () => resolve();
    req.onerror   = () => reject(req.error);
  });
}

function idbDelete(db: IDBDatabase, key: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const req = db.transaction(IDB_STORE, 'readwrite').objectStore(IDB_STORE).delete(key);
    req.onsuccess = () => resolve();
    req.onerror   = () => reject(req.error);
  });
}

// ─── Key persistence ──────────────────────────────────────────────────────────

/**
 * Load the ECDH keypair from IndexedDB, or generate and store a fresh one.
 *
 * The private key is stored as a non-extractable CryptoKey — the raw bytes
 * never leave the browser's crypto engine, even our own code cannot read them.
 * The public key is stored as a base64 SPKI string ready to send to the server.
 */
export async function loadOrCreateKeyPair(): Promise<{
  publicKeyB64: string;
  privateKey: CryptoKey;
}> {
  const db = await openKeyDB();

  const storedPrivate  = await idbGet(db, IDB_PRIVATE);
  const storedPublicB64 = await idbGet(db, IDB_PUBLIC);

  if (storedPrivate instanceof CryptoKey && typeof storedPublicB64 === 'string') {
    return { privateKey: storedPrivate, publicKeyB64: storedPublicB64 };
  }

  // Generate with extractable=false — private key bytes never exposed to JS heap.
  // The public key is always extractable regardless of this flag (Web Crypto spec),
  // so we can still export it as SPKI for upload to the server.
  const pair = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    ['deriveKey'],
  );

  // Export public key (SPKI → base64) — sent to the server
  const pubBuf     = await crypto.subtle.exportKey('spki', pair.publicKey);
  const publicKeyB64 = btoa(String.fromCharCode(...new Uint8Array(pubBuf)));

  // Private key is already non-extractable; store the CryptoKey directly.
  const privateKey = pair.privateKey;

  await idbPut(db, IDB_PRIVATE, privateKey);
  await idbPut(db, IDB_PUBLIC,  publicKeyB64);

  return { privateKey, publicKeyB64 };
}

/** Delete the stored keypair from IndexedDB — call on explicit logout. */
export async function clearStoredKeyPair(): Promise<void> {
  const db = await openKeyDB();
  await idbDelete(db, IDB_PRIVATE);
  await idbDelete(db, IDB_PUBLIC);
}

// ─── Crypto operations ────────────────────────────────────────────────────────

/** Derive a shared AES-GCM key from our private key and their public key (base64 SPKI). */
export async function deriveSharedKey(
  privateKey: CryptoKey,
  theirPublicKeyB64: string,
): Promise<CryptoKey> {
  const pubBuf = Uint8Array.from(atob(theirPublicKeyB64), c => c.charCodeAt(0));
  const theirPublicKey = await crypto.subtle.importKey(
    'spki',
    pubBuf,
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    [],
  );
  // Step 1: extract the raw ECDH shared secret as HKDF key material
  const ecdhSecret = await crypto.subtle.deriveKey(
    { name: 'ECDH', public: theirPublicKey },
    privateKey,
    { name: 'HKDF' },
    false,
    ['deriveKey'],
  );

  // Step 2: HKDF-SHA256 → AES-GCM key, with domain-separation info string.
  // Fixed zero salt is correct here: there is no per-derivation entropy to inject
  // (NIST SP 800-56C §4). The info string binds the key to this app and version.
  return crypto.subtle.deriveKey(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt: new Uint8Array(32),
      info: new TextEncoder().encode('ephemeral-im-v1'),
    },
    ecdhSecret,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

/** Encrypt plaintext with AES-GCM. Returns base64(iv || ciphertext). */
export async function encryptMessage(
  plaintext: string,
  sharedKey: CryptoKey,
): Promise<string> {
  const iv       = crypto.getRandomValues(new Uint8Array(12));
  const encoded  = new TextEncoder().encode(plaintext);
  const cipher   = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, sharedKey, encoded);

  const combined = new Uint8Array(iv.byteLength + cipher.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(cipher), iv.byteLength);

  return btoa(String.fromCharCode(...combined));
}

/** Decrypt base64(iv || ciphertext) with AES-GCM. Throws on failure (wrong key / tampered). */
export async function decryptMessage(
  encryptedB64: string,
  sharedKey: CryptoKey,
): Promise<string> {
  const combined   = Uint8Array.from(atob(encryptedB64), c => c.charCodeAt(0));
  const iv         = combined.slice(0, 12);
  const ciphertext = combined.slice(12);
  const plaintext  = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, sharedKey, ciphertext);
  return new TextDecoder().decode(plaintext);
}

/** SHA-256 fingerprint of a base64 public key, space-separated 4-char uppercase hex groups. */
export async function computeFingerprint(publicKeyB64: string): Promise<string> {
  const bytes = Uint8Array.from(atob(publicKeyB64), c => c.charCodeAt(0));
  const hash  = await crypto.subtle.digest('SHA-256', bytes);
  const hex   = Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  return hex.match(/.{4}/g)!.join(' ').toUpperCase();
}
