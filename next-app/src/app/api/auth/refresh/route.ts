import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { requireAuth } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const { userId } = requireAuth(req);

    // Issue a fresh JWT
    const token = jwt.sign(
      { userId },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    );

    const response = NextResponse.json(
      { message: 'Token refreshed' },
      { status: 200 }
    );

    response.cookies.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    });

    return response;

  } catch {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }
}