import { pool } from './db';

// Whether two users share a conversation row. Used to gate presence subscriptions
// (R1) and message forwarding (R2) so a user can only watch / message someone they
// already have a conversation with. Symmetric: order of the two ids does not matter.

const CACHE_TTL_MS = 60_000;

interface CacheEntry { exists: boolean; expiresAt: number }
const cache = new Map<string, CacheEntry>();

function cacheKey(a: string, b: string) {
  // Symmetric key — sort so (a,b) and (b,a) hit the same entry.
  return a < b ? `${a}:${b}` : `${b}:${a}`;
}

export async function hasConversation(userA: string, userB: string): Promise<boolean> {
  const k = cacheKey(userA, userB);
  const now = Date.now();
  const entry = cache.get(k);
  if (entry) {
    if (entry.expiresAt > now) return entry.exists;
    cache.delete(k); // expired — evict so the Map doesn't grow unbounded
  }

  const [rows] = await pool.execute(
    `SELECT 1 FROM conversations
     WHERE (user_a = ? AND user_b = ?) OR (user_a = ? AND user_b = ?)
     LIMIT 1`,
    [userA, userB, userB, userA]
  );

  const exists = (rows as any[]).length > 0;
  cache.set(k, { exists, expiresAt: now + CACHE_TTL_MS });
  return exists;
}
