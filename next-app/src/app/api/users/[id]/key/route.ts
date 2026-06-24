import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';
import pool from '@/lib/db';
import { requireAuth } from '@/lib/auth';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    requireAuth(req);

    const { id } = await params;

    const [rows] = await pool.execute(
      'SELECT public_key FROM users WHERE id = ?',
      [id]
    );

    const users = rows as any[];

    if (users.length === 0 || !users[0].public_key) {
      return NextResponse.json(
        { error: 'User or public key not found' },
        { status: 404 }
      );
    }

    const publicKey = users[0].public_key;

    // Generate fingerprint — SHA-256 of the decoded public-key bytes.
    // Must hash the raw bytes (not the base64 text) to match the client's
    // computeFingerprint(), so a code shown on one device matches the other.
    const fingerprint = createHash('sha256')
      .update(Buffer.from(publicKey, 'base64'))
      .digest('hex')
      .match(/.{1,4}/g)!
      .join(' ')
      .toUpperCase();

    return NextResponse.json({ publicKey, fingerprint }, { status: 200 });

  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    console.error('Get key error:', error);
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    );
  }
}