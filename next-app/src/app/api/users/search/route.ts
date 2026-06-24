import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { hit } from '@/lib/rate-limiter';

export async function GET(req: NextRequest) {
  try {
    const { userId } = requireAuth(req);

    if (hit(`search:user:${userId}`, 30, 60 * 60 * 1000)) {
      return NextResponse.json(
        { error: 'Too many searches. Please try again later.' },
        { status: 429 }
      );
    }

    const email = req.nextUrl.searchParams.get('email');

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    const [rows] = await pool.execute(
      `SELECT id, email
       FROM users
       WHERE LOWER(email) = LOWER(?)
       AND verified = TRUE`,
      [email]
    );

    const users = rows as any[];

    if (users.length === 0) {
      return NextResponse.json(
        { error: 'No verified user found with that email' },
        { status: 404 }
      );
    }

    if (users[0].id === userId) {
      return NextResponse.json(
        { error: "That's your own email address." },
        { status: 400 }
      );
    }

    return NextResponse.json(users[0], { status: 200 });

  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    console.error('User search error:', error);
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    );
  }
}