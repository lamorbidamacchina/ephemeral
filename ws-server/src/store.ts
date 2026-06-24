import { pool } from './db';

// Offline queue is for genuinely-offline recipients only — short-lived by design.
const TTL_MS = 48 * 60 * 60 * 1000; // 48 hours

export interface PendingMessage {
  messageId:   string;
  fromUserId:  string;
  toUserId:    string;
  payload:     string;  // AES-GCM ciphertext — never decoded here
  sentAt:      number;  // unix ms
}

export async function addMessage(msg: PendingMessage): Promise<void> {
  const expiresAt = new Date(msg.sentAt + TTL_MS);
  await pool.execute(
    `INSERT INTO pending_messages
       (message_id, from_user_id, to_user_id, payload, sent_at, expires_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [msg.messageId, msg.fromUserId, msg.toUserId, msg.payload, msg.sentAt, expiresAt]
  );
}

export async function getPendingMessages(toUserId: string): Promise<PendingMessage[]> {
  const [rows] = await pool.execute(
    `SELECT message_id, from_user_id, to_user_id, payload, sent_at
     FROM pending_messages
     WHERE to_user_id = ? AND expires_at > NOW()
     ORDER BY sent_at ASC`,
    [toUserId]
  );
  return (rows as any[]).map(r => ({
    messageId:  r.message_id,
    fromUserId: r.from_user_id,
    toUserId:   r.to_user_id,
    payload:    r.payload,
    sentAt:     Number(r.sent_at),
  }));
}

export async function removeMessage(toUserId: string, messageId: string): Promise<void> {
  await pool.execute(
    'DELETE FROM pending_messages WHERE to_user_id = ? AND message_id = ?',
    [toUserId, messageId]
  );
}

/** Count a recipient's live (non-expired) offline messages — used to enforce the per-recipient cap. */
export async function countPending(toUserId: string): Promise<number> {
  const [rows] = await pool.execute(
    'SELECT COUNT(*) AS n FROM pending_messages WHERE to_user_id = ? AND expires_at > NOW()',
    [toUserId]
  );
  return Number((rows as any[])[0]?.n ?? 0);
}
