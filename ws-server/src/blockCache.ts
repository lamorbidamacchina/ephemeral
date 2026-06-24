import { pool } from './db';

const CACHE_TTL_MS = 60_000;

interface CacheEntry { blocked: boolean; expiresAt: number }
const cache = new Map<string, CacheEntry>();

function cacheKey(fromUserId: string, toUserId: string) {
  return `${fromUserId}:${toUserId}`;
}

export async function isBlocked(fromUserId: string, toUserId: string): Promise<boolean> {
  const k = cacheKey(fromUserId, toUserId);
  const now = Date.now();
  const entry = cache.get(k);
  if (entry) {
    if (entry.expiresAt > now) return entry.blocked;
    cache.delete(k); // expired — evict so the Map doesn't grow unbounded
  }

  // toUserId is the potential blocker — check their flag
  const [rows] = await pool.execute(
    `SELECT CASE WHEN user_a = ? THEN blocked_by_a ELSE blocked_by_b END AS blocked
     FROM conversations
     WHERE (user_a = ? AND user_b = ?) OR (user_a = ? AND user_b = ?)`,
    [toUserId, toUserId, fromUserId, fromUserId, toUserId]
  );

  const result = rows as any[];
  const blocked = result.length > 0 && result[0].blocked === 1;
  cache.set(k, { blocked, expiresAt: now + CACHE_TTL_MS });
  return blocked;
}
