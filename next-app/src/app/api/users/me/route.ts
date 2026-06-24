import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { requireAuth } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const { userId } = requireAuth(req);

    const [rows] = await pool.execute(
      'SELECT id, email FROM users WHERE id = ?',
      [userId]
    );

    const users = rows as any[];
    if (users.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json(users[0]);

  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { userId } = requireAuth(req);

    // FK order: pending_messages → tombstones (needs conversations) → conversations → users (cascades tokens + subscriptions)
    await pool.execute(
      'DELETE FROM pending_messages WHERE from_user_id = ? OR to_user_id = ?',
      [userId, userId]
    );
    await pool.execute(
      'DELETE FROM message_tombstones WHERE conversation_id IN (SELECT id FROM conversations WHERE user_a = ? OR user_b = ?)',
      [userId, userId]
    );
    await pool.execute(
      'DELETE FROM conversations WHERE user_a = ? OR user_b = ?',
      [userId, userId]
    );
    await pool.execute('DELETE FROM users WHERE id = ?', [userId]);

    const response = NextResponse.json({ message: 'Account deleted' });
    response.cookies.set('token', '', { maxAge: 0, path: '/' });
    return response;

  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
