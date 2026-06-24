import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import pool from '@/lib/db';
import { sendPasswordResetEmail } from '@/lib/mailer';
import { ipHit } from '@/lib/rate-limiter';

export async function POST(req: NextRequest) {
  try {
    if (ipHit(req, 'forgot', 5, 60 * 60 * 1000)) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    const { email } = await req.json();

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Always return success even if email not found
    // to prevent email enumeration attacks
    const [rows] = await pool.execute(
      'SELECT id FROM users WHERE email = ? AND verified = TRUE',
      [email]
    );

    const users = rows as any[];

    if (users.length > 0) {
      const token = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 1 * 60 * 60 * 1000); // 1 hour

      await pool.execute(
        'INSERT INTO verification_tokens (token, user_id, expires_at) VALUES (?, ?, ?)',
        [token, users[0].id, expiresAt]
      );

      await sendPasswordResetEmail(email, token);
    } 

    return NextResponse.json(
      { message: 'If an account exists with this email, you will receive a password reset link shortly.' },
      { status: 200 }
    );

  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    );
  }
}