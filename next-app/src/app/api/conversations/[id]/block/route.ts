import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { requireAuth } from '@/lib/auth';

async function setBlock(req: NextRequest, params: Promise<{ id: string }>, blocked: boolean) {
  try {
    const { userId } = requireAuth(req);
    const { id } = await params;

    const [rows] = await pool.execute(
      'SELECT user_a FROM conversations WHERE id = ? AND (user_a = ? OR user_b = ?)',
      [id, userId, userId]
    );
    const convs = rows as any[];
    if (convs.length === 0) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const column = convs[0].user_a === userId ? 'blocked_by_a' : 'blocked_by_b';

    await pool.execute(
      `UPDATE conversations SET ${column} = ? WHERE id = ?`,
      [blocked, id]
    );

    return NextResponse.json({ ok: true });

  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Block conversation error:', error);
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 });
  }
}

export function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return setBlock(req, params, true);
}

export function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return setBlock(req, params, false);
}
