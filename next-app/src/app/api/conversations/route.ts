import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import pool from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { CONTACT_CAP } from '@/lib/limits';

// GET — list all conversations for the current user
export async function GET(req: NextRequest) {
  try {
    const { userId } = requireAuth(req);

    const [rows] = await pool.execute(
      `SELECT
         c.id,
         c.created_at,
         CASE WHEN c.user_a = ? THEN c.user_b ELSE c.user_a END AS other_user_id,
         u.email AS other_user_email,
         CASE WHEN c.user_a = ? THEN c.contact_name_a ELSE c.contact_name_b END AS contact_name,
         CASE WHEN c.user_a = ? THEN c.blocked_by_a ELSE c.blocked_by_b END AS blocked_by_me
       FROM conversations c
       JOIN users u ON u.id = CASE WHEN c.user_a = ? THEN c.user_b ELSE c.user_a END
       WHERE c.user_a = ? OR c.user_b = ?
       ORDER BY CASE WHEN c.user_a = ? THEN c.blocked_by_a ELSE c.blocked_by_b END ASC,
                c.created_at DESC`,
      [userId, userId, userId, userId, userId, userId, userId]
    );

    const result = (rows as any[]).map(row => ({ ...row, blocked_by_me: row.blocked_by_me === 1 }));
    return NextResponse.json(result, { status: 200 });

  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    console.error('List conversations error:', error);
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    );
  }
}

// POST — create or retrieve a conversation with another user
export async function POST(req: NextRequest) {
  try {
    const { userId } = requireAuth(req);
    const { otherUserId } = await req.json();

    if (!otherUserId) {
      return NextResponse.json(
        { error: 'otherUserId is required' },
        { status: 400 }
      );
    }

    if (otherUserId === userId) {
      return NextResponse.json(
        { error: 'Cannot start a conversation with yourself' },
        { status: 400 }
      );
    }

    // Check if conversation already exists (returning an existing one ignores the cap)
    const [existing] = await pool.execute(
      `SELECT id FROM conversations 
       WHERE (user_a = ? AND user_b = ?) 
       OR (user_a = ? AND user_b = ?)`,
      [userId, otherUserId, otherUserId, userId]
    );

    const conversations = existing as any[];

    if (conversations.length > 0) {
      return NextResponse.json(
        { id: conversations[0].id },
        { status: 200 }
      );
    }

    // Enforce contact cap before creating a new conversation
    const [countRows] = await pool.execute(
      'SELECT COUNT(*) AS cnt FROM conversations WHERE user_a = ? OR user_b = ?',
      [userId, userId]
    );
    if ((countRows as any[])[0].cnt >= CONTACT_CAP) {
      return NextResponse.json(
        { error: `You have reached the ${CONTACT_CAP}-contact limit. Remove a contact to add a new one.` },
        { status: 429 }
      );
    }

    // Create new conversation
    const id = crypto.randomUUID();
    await pool.execute(
      'INSERT INTO conversations (id, user_a, user_b) VALUES (?, ?, ?)',
      [id, userId, otherUserId]
    );

    return NextResponse.json({ id }, { status: 201 });

  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    console.error('Create conversation error:', error);
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    );
  }
}