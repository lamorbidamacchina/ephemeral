import { pool } from './db';
import { writeTombstone } from './tombstone';

const INTERVAL_MS = 60 * 60 * 1000; // every hour

async function cleanupExpiredMessages(): Promise<void> {
  try {
    const [rows] = await pool.execute(
      `SELECT message_id, from_user_id, to_user_id, payload, sent_at
       FROM pending_messages
       WHERE expires_at < NOW()`
    );
    const expired = rows as any[];
    if (expired.length === 0) return;

    // Write a tombstone for each expired message
    for (const row of expired) {
      await writeTombstone({
        messageId:  row.message_id,
        fromUserId: row.from_user_id,
        toUserId:   row.to_user_id,
        payload:    row.payload,
        sentAt:     Number(row.sent_at),
      });
    }

    // Delete the processed rows by ID so we don't race with new expiries
    const ids = expired.map((r: any) => r.message_id);
    const placeholders = ids.map(() => '?').join(', ');
    await pool.execute(
      `DELETE FROM pending_messages WHERE message_id IN (${placeholders})`,
      ids
    );

    console.log(`Cleanup: removed ${expired.length} expired pending message(s)`);
  } catch (err) {
    console.error('Cleanup job failed:', err);
  }
}

export function startCleanupJob(): void {
  // Run immediately on startup to catch anything that expired while the server was down
  cleanupExpiredMessages();
  setInterval(cleanupExpiredMessages, INTERVAL_MS);
}
