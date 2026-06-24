# Ephemeral

A privacy-first, end-to-end encrypted messaging app where messages disappear 60 seconds after being read. Delivered messages are never stored — the server is a blind relay that never sees plaintext.

EU-built and EU-hosted (Fly.io, Frankfurt). GDPR-native.

## Architecture

Two independently deployable services sharing a MySQL database:

| Service | Stack | Port |
|---|---|---|
| `next-app/` | Next.js 16, TypeScript — frontend + REST API | 3000 |
| `ws-server/` | Node.js + Socket.io — real-time message relay | 3001 |

If the recipient is online, messages are forwarded immediately and held in memory only — never written to disk. If the recipient is offline, the encrypted ciphertext is queued in MySQL with a 48-hour TTL (capped at 50 pending per recipient) and delivered when they reconnect — then deleted. The relay only ever forwards messages between users who already share a conversation. Tombstones (no content, metadata only) are written when a message expires undelivered.

## Cryptography

- **Key agreement:** ECDH P-256 (Web Crypto API)
- **Encryption:** AES-GCM 256-bit, random 12-byte IV per message
- **Private key:** stored in IndexedDB as a non-extractable `CryptoKey` — raw bytes never accessible to JavaScript
- **Fingerprint:** SHA-256 of public key, space-separated 4-char hex groups (like Signal safety numbers)

The server forwards ciphertext only. It cannot decrypt messages by design.

## Prerequisites

- Node.js 20+
- MySQL 8+

## Local setup

```bash
# 1. Clone the repo
git clone <repo-url>
cd ephemeral-app

# 2. Create the database and load the schema
mysql -u root -e "CREATE DATABASE ephemeral_dev;"
mysql -u root ephemeral_dev < db/schema.sql

# 3. Set up next-app
cd next-app
cp .env.local.example .env.local   # fill in DB credentials, JWT secret, SMTP
npm install
npm run dev                        # http://localhost:3000

# 4. Set up ws-server (separate terminal)
cd ws-server
cp .env.example .env               # fill in DB credentials, JWT secret (must match next-app)
npm install
npm run dev                        # ws://localhost:3001
```

The JWT_SECRET in both `.env` files must be the same value. Generate one with:

```bash
openssl rand -hex 32
```

## Deployment (Fly.io)

Each service has its own `fly.toml`. Before deploying, update `next-app/fly.toml`:

```toml
NEXT_PUBLIC_OWNER_NAME    = "Your Name"
NEXT_PUBLIC_CONTACT_EMAIL = "you@example.com"
```

Set secrets on Fly.io (never commit real values):

```bash
fly secrets set JWT_SECRET=<value> DB_PASSWORD=<value> --app <app-name>
```

If the app runs behind a proxy or CDN, set `TRUSTED_IP_HEADER` on `next-app` to the header your edge populates with the real client IP, so per-IP rate limiting keys on the actual client and can't be spoofed (e.g. `CF-Connecting-IP` for Cloudflare, `Fly-Client-IP` for raw Fly.io, `X-Real-IP` for nginx). Leave it unset for local dev. As a safety valve, `DISABLE_IP_RATE_LIMIT=true` turns off per-IP limiting entirely (account lockout and per-user limits stay active) — useful if a proxy misconfiguration ever collapses every request onto one IP.

## Database schema

See [`db/schema.sql`](db/schema.sql). Tables: `users`, `conversations`, `verification_tokens`, `push_subscriptions`, `pending_messages`, `message_tombstones`, `invites`.

## License

[AGPL-3.0](LICENSE) © Simone Ricci
