import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import pool from '@/lib/db';
import { sendVerificationEmail } from '@/lib/mailer';
import { validatePassword, validateEmail } from '@/lib/auth';
import { logger } from '@/lib/logger';
import { ipHit } from '@/lib/rate-limiter';

export async function POST(req: NextRequest) {
  try {
    if (ipHit(req, 'register', 5, 60 * 60 * 1000)) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    const { email: rawEmail, password } = await req.json();
    const email = rawEmail?.trim().toLowerCase() ?? '';

    // Basic validation
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }
    
    if (!validateEmail(email)) {
      return NextResponse.json(
        { error: 'Please enter a valid email address' },
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

    // Check if email already exists
    const [existing] = await pool.execute(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );

    if ((existing as any[]).length > 0) {
      return NextResponse.json(
        { error: 'An account with this email already exists' },
        { status: 409 }
      );
    }

    // Hash password and create user
    const id = crypto.randomUUID();
    const hashedPassword = await bcrypt.hash(password, 12);

    await pool.execute(
      'INSERT INTO users (id, email, password, verified) VALUES (?, ?, ?, FALSE)',
      [id, email, hashedPassword]
    );

    // Create verification token (expires in 24 hours)
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await pool.execute(
      'INSERT INTO verification_tokens (token, user_id, expires_at) VALUES (?, ?, ?)',
      [token, id, expiresAt]
    );

    // Send verification email
    await sendVerificationEmail(email, token);

    return NextResponse.json(
      { message: 'Account created. Please check your email to verify your account.' },
      { status: 201 }
    );

  } catch (error) {
    logger.error('Register endpoint', error);
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    );
  }
}