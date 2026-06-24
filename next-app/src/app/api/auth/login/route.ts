import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '@/lib/db';
import { ipHit, fail, isLockedOut } from '@/lib/rate-limiter';

const IP_LIMIT      = 20;
const ACCT_FAILS    = 5;
const WINDOW_15_MIN = 15 * 60 * 1000;

export async function POST(req: NextRequest) {
  try {
    // Per-IP rate limit — checked before parsing body to avoid bcrypt on every spray attempt
    if (ipHit(req, 'login', IP_LIMIT, WINDOW_15_MIN)) {
      return NextResponse.json(
        { error: 'Too many login attempts. Please try again later.' },
        { status: 429 }
      );
    }

    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Per-account lockout — checked after parsing email, before hitting the DB
    if (isLockedOut(`login:acct:${email}`)) {
      return NextResponse.json(
        { error: 'Account temporarily locked due to too many failed attempts. Try again later.' },
        { status: 429 }
      );
    }

    // Find user
    const [rows] = await pool.execute(
      'SELECT id, password, verified FROM users WHERE email = ?',
      [email]
    );

    const users = rows as any[];

    if (users.length === 0) {
      // Don't reveal whether the email exists
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    const user = users[0];

    // Check password
    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      // Record failure against the account — 5 wrong passwords in 15 min locks it for 15 min
      fail(`login:acct:${email}`, ACCT_FAILS, WINDOW_15_MIN, WINDOW_15_MIN);
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Check verified
    if (!user.verified) {
      return NextResponse.json(
        { error: 'Please verify your email address before logging in' },
        { status: 403 }
      );
    }

    // Issue JWT
    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    );

    const response = NextResponse.json(
      { message: 'Login successful' },
      { status: 200 }
    );

    // Set JWT as an httpOnly cookie
    response.cookies.set('token', token, {
      httpOnly: true,
      secure:   process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge:   60 * 60 * 24 * 7, // 7 days
      path:     '/',
    });

    return response;

  } catch (error) {
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    );
  }
}