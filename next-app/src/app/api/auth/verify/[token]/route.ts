import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    const [rows] = await pool.execute(
      'SELECT user_id, expires_at FROM verification_tokens WHERE token = ?',
      [token]
    );

    const tokens = rows as any[];

    if (tokens.length === 0) {
      return NextResponse.json(
        { error: 'Invalid or already used verification link' },
        { status: 400 }
      );
    }

    const { user_id, expires_at } = tokens[0];

    if (new Date() > new Date(expires_at)) {
      await pool.execute(
        'DELETE FROM verification_tokens WHERE token = ?',
        [token]
      );
      return NextResponse.json(
        { error: 'Verification link has expired. Please register again.' },
        { status: 400 }
      );
    }

    await pool.execute(
      'UPDATE users SET verified = TRUE WHERE id = ?',
      [user_id]
    );

    await pool.execute(
      'DELETE FROM verification_tokens WHERE token = ?',
      [token]
    );

    return NextResponse.redirect(
      new URL('/login?verified=true', process.env.NEXT_PUBLIC_APP_URL)
    );

  } catch (error) {
    console.error('Verify error:', error);
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    );
  }
}
