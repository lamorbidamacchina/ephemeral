import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import pool from '@/lib/db';
import { requireAuth } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const { userId } = requireAuth(req);
    const { publicKey } = await req.json();

    if (!publicKey) {
      return NextResponse.json({ error: 'Public key is required' }, { status: 400 });
    }

    // SPKI P-256 key is ~124 bytes base64; reject anything suspiciously large
    if (typeof publicKey !== 'string' || publicKey.length > 256) {
      return NextResponse.json({ error: 'Invalid public key' }, { status: 400 });
    }

    // Check whether the user already had a different public key
    const [existing] = await pool.execute(
      'SELECT public_key FROM users WHERE id = ?',
      [userId]
    );
    const rows = existing as any[];
    const oldKey = rows[0]?.public_key;
    const keyChanged = oldKey && oldKey !== publicKey;

    let droppedCount = 0;

    if (keyChanged) {
      // Find every pending message that was encrypted for the old key — they are now unreadable
      const [pending] = await pool.execute(
        `SELECT message_id, from_user_id, to_user_id, sent_at
         FROM pending_messages
         WHERE to_user_id = ?`,
        [userId]
      );
      const msgs = pending as any[];
      droppedCount = msgs.length;

      if (droppedCount > 0) {
        // Write a tombstone for each dropped message so the sender is notified
        for (const msg of msgs) {
          const [convRows] = await pool.execute(
            `SELECT id FROM conversations
             WHERE (user_a = ? AND user_b = ?) OR (user_a = ? AND user_b = ?)`,
            [msg.from_user_id, msg.to_user_id, msg.to_user_id, msg.from_user_id]
          );
          const convs = convRows as any[];

          let conversationId: string;
          if (convs.length > 0) {
            conversationId = convs[0].id;
          } else {
            conversationId = crypto.randomUUID();
            await pool.execute(
              'INSERT INTO conversations (id, user_a, user_b) VALUES (?, ?, ?)',
              [conversationId, msg.from_user_id, msg.to_user_id]
            );
          }

          await pool.execute(
            'INSERT INTO message_tombstones (id, conversation_id, sender_id, sent_at) VALUES (?, ?, ?, ?)',
            [crypto.randomUUID(), conversationId, msg.from_user_id, new Date(Number(msg.sent_at))]
          );
        }

        // Drop the now-unreadable pending messages
        await pool.execute(
          'DELETE FROM pending_messages WHERE to_user_id = ?',
          [userId]
        );
      }
    }

    // Store the new public key
    await pool.execute(
      'UPDATE users SET public_key = ? WHERE id = ?',
      [publicKey, userId]
    );

    return NextResponse.json({
      ok: true,
      // Client uses this to show the "new session" warning when messages were dropped
      droppedMessages: droppedCount,
    });

  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Store key error:', error);
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 });
  }
}
