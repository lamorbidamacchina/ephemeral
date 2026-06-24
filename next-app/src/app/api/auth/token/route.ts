import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { requireAuth } from '@/lib/auth';

// Lifetime of a WebSocket handshake token. Short enough that a leaked token
// (it travels in the JSON body, readable by JS) is near-useless, long enough
// to survive a normal connection attempt. The client fetches a fresh one for
// every (re)connection — see lib/socket-context.tsx.
const WS_TOKEN_TTL = '60s';

export async function GET(req: NextRequest) {
  try {
    const { userId } = requireAuth(req);

    // Mint a dedicated, short-lived handshake token instead of reflecting the
    // 7-day session JWT. The `purpose` claim stops a stolen session cookie from
    // being replayed directly against the relay — the ws-server only accepts
    // tokens minted here (see ws-server/src/auth.ts).
    const token = jwt.sign(
      { userId, purpose: 'ws' },
      process.env.JWT_SECRET!,
      { expiresIn: WS_TOKEN_TTL },
    );

    return NextResponse.json({ token }, { status: 200 });

  } catch {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }
}
