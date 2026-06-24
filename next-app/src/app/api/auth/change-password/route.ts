import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import pool from '@/lib/db';
import { requireAuth, validatePassword } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const { userId } = requireAuth(req);
    const { currentPassword, newPassword } = await req.json();

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: 'Current and new password are required' },
        { status: 400 }
      );
    }

    const { valid, errors } = validatePassword(newPassword);
    if (!valid) {
      return NextResponse.json(
        { error: `Password must contain ${errors.join(', ')}` },
        { status: 400 }
      );
    }

    const [rows] = await pool.execute(
      'SELECT password FROM users WHERE id = ?',
      [userId]
    );

    const users = rows as any[];
    if (users.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const match = await bcrypt.compare(currentPassword, users[0].password);
    if (!match) {
      return NextResponse.json(
        { error: 'Current password is incorrect' },
        { status: 401 }
      );
    }

    const hashed = await bcrypt.hash(newPassword, 12);
    await pool.execute('UPDATE users SET password = ? WHERE id = ?', [hashed, userId]);

    return NextResponse.json({ message: 'Password updated' });

  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
