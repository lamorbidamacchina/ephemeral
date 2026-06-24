import crypto from 'crypto';
import { pool } from './db';
import { PendingMessage } from './store';

export async function writeTombstone(msg: PendingMessage): Promise<void> {
  try {
    // Find or create the conversation record
    const [rows] = await pool.execute(
      `SELECT id FROM conversations
       WHERE (user_a = ? AND user_b = ?)
          OR (user_a = ? AND user_b = ?)`,
      [msg.fromUserId, msg.toUserId, msg.toUserId, msg.fromUserId]
    );

    const conversations = rows as any[];
    let conversationId: string;

    if (conversations.length > 0) {
      conversationId = conversations[0].id;
    } else {
      conversationId = crypto.randomUUID();
      await pool.execute(
        'INSERT INTO conversations (id, user_a, user_b) VALUES (?, ?, ?)',
        [conversationId, msg.fromUserId, msg.toUserId]
      );
    }

    // Write tombstone — no message content, metadata only
    await pool.execute(
      'INSERT INTO message_tombstones (id, conversation_id, sender_id, sent_at) VALUES (?, ?, ?, ?)',
      [crypto.randomUUID(), conversationId, msg.fromUserId, new Date(msg.sentAt)]
    );

    console.log(`Tombstone written for expired message ${msg.messageId}`);
  } catch (error) {
    console.error('Failed to write tombstone:', error);
  }
}
