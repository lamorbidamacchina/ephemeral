import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { requireAuth } from '@/lib/auth';

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = requireAuth(req);
    const { id } = await params;

    // Verify caller belongs to this conversation and get both user IDs
    const [rows] = await pool.execute(
      'SELECT user_a, user_b FROM conversations WHERE id = ? AND (user_a = ? OR user_b = ?)',
      [id, userId, userId]
    );
    const convs = rows as any[];
    if (convs.length === 0) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const { user_a, user_b } = convs[0];

    // 1. Delete pending messages in both directions (no FK to conversations)
    await pool.execute(
      `DELETE FROM pending_messages
       WHERE (from_user_id = ? AND to_user_id = ?)
          OR (from_user_id = ? AND to_user_id = ?)`,
      [user_a, user_b, user_b, user_a]
    );

    // 2. Delete tombstones (FK references conversations — must go before the conversation row)
    await pool.execute(
      'DELETE FROM message_tombstones WHERE conversation_id = ?',
      [id]
    );

    // 3. Delete the conversation itself
    await pool.execute('DELETE FROM conversations WHERE id = ?', [id]);

    return NextResponse.json({ ok: true });

  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Delete conversation error:', error);
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 });
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = requireAuth(req);
    const { id } = await params;

    const [rows] = await pool.execute(
      `SELECT
         c.id,
         CASE WHEN c.user_a = ? THEN c.user_b ELSE c.user_a END AS other_user_id,
         u.email AS other_user_email,
         CASE WHEN c.user_a = ? THEN c.contact_name_a ELSE c.contact_name_b END AS contact_name,
         CASE WHEN c.user_a = ? THEN c.blocked_by_a ELSE c.blocked_by_b END AS blocked_by_me
       FROM conversations c
       JOIN users u ON u.id = CASE WHEN c.user_a = ? THEN c.user_b ELSE c.user_a END
       WHERE c.id = ? AND (c.user_a = ? OR c.user_b = ?)`,
      [userId, userId, userId, userId, id, userId, userId]
    );

    const rows_ = rows as any[];

    if (rows_.length === 0) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    const row = rows_[0];
    return NextResponse.json({ ...row, blocked_by_me: row.blocked_by_me === 1 }, { status: 200 });

  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Get conversation error:', error);
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = requireAuth(req);
    const { id } = await params;
    const { contactName } = await req.json();

    const [rows] = await pool.execute(
      'SELECT user_a FROM conversations WHERE id = ? AND (user_a = ? OR user_b = ?)',
      [id, userId, userId]
    );
    const convs = rows as any[];
    if (convs.length === 0) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const column = convs[0].user_a === userId ? 'contact_name_a' : 'contact_name_b';
    const name = typeof contactName === 'string' ? contactName.trim().slice(0, 255) || null : null;

    await pool.execute(
      `UPDATE conversations SET ${column} = ? WHERE id = ?`,
      [name, id]
    );

    return NextResponse.json({ ok: true });

  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Patch conversation error:', error);
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 });
  }
}
