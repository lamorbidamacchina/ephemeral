import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import pool from '@/lib/db';
import { validatePassword } from '@/lib/auth';
import { ipHit } from '@/lib/rate-limiter';

export async function POST(req: NextRequest) {
  try {
    if (ipHit(req, 'reset', 10, 15 * 60 * 1000)) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    const { token, password } = await req.json();

    if (!token || !password) {
      return NextResponse.json(
        { error: 'Token and password are required' },
        { status: 400 }
      );
    }

    const { valid, errors } = validatePassword(password);
    if (!valid) {
      return NextResponse.json(
        { error: `Password must contain ${errors.join(', ')}` },
        { status: 400 }
      );
    }

    // Find token
    const [rows] = await pool.execute(
      'SELECT user_id, expires_at FROM verification_tokens WHERE token = ?',
      [token]
    );

    const tokens = rows as any[];

    if (tokens.length === 0) {
      return NextResponse.json(
        { error: 'Invalid or expired reset link' },
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
        { error: 'Reset link has expired. Please request a new one.' },
        { status: 400 }
      );
    }

    // Update password and delete token
    const hashedPassword = await bcrypt.hash(password, 12);

    await pool.execute(
      'UPDATE users SET password = ? WHERE id = ?',
      [hashedPassword, user_id]
    );

    await pool.execute(
      'DELETE FROM verification_tokens WHERE token = ?',
      [token]
    );

    return NextResponse.json(
      { message: 'Password updated successfully. You can now log in.' },
      { status: 200 }
    );

  } catch (error) {
    console.error('Reset password error:', error);
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    );
  }
}