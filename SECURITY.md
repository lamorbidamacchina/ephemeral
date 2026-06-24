# Security Policy

## Reporting a vulnerability

Please report security vulnerabilities by email to **simone@lamorbidamacchina.com**. Do not open a public GitHub issue.

Include as much detail as possible: affected component, steps to reproduce, and your assessment of impact. You'll receive a response within a few days.

## Scope

In scope:
- Authentication and session management (next-app)
- Cryptographic implementation (key generation, ECDH, AES-GCM)
- WebSocket relay logic (ws-server)
- API routes that handle user data

Out of scope:
- Denial-of-service attacks
- Vulnerabilities in third-party dependencies (report those upstream)
- Issues requiring physical access to the device

## What the server can and cannot see

The relay server (`ws-server`) forwards encrypted ciphertext only. It never has access to private keys or plaintext message content — this is enforced by design, not policy. The shared secret used for AES-GCM encryption is derived client-side via ECDH and never transmitted to the server.
