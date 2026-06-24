import jwt from 'jsonwebtoken';

export interface AuthPayload {
  userId: string;
}

interface WsTokenClaims extends AuthPayload {
  purpose?: string;
}

export function verifyToken(token: string): AuthPayload {
  const payload = jwt.verify(
    token,
    process.env.JWT_SECRET!
  ) as WsTokenClaims;

  // Only accept the dedicated short-lived handshake token minted by
  // next-app's GET /api/auth/token. A raw session JWT (no `purpose`) is
  // rejected, so a stolen session cookie can't be replayed against the relay.
  if (payload.purpose !== 'ws') {
    throw new Error('INVALID_TOKEN_PURPOSE');
  }

  return { userId: payload.userId };
}
