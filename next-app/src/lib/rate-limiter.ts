// Sliding-window rate limiter — in-memory, single-process.
// Works correctly on a single Fly.io machine (standalone Next.js). For multi-instance
// deployments, replace with a Redis-backed solution (e.g. @upstash/ratelimit).

const events   = new Map<string, number[]>() // key → event timestamps
const lockouts = new Map<string, number>()   // key → locked-until ms

function prune(key: string, windowMs: number): number[] {
  const now = Date.now()
  const ts  = (events.get(key) ?? []).filter(t => now - t < windowMs)
  events.set(key, ts)
  return ts
}

/** True if the key is currently in a lockout period. */
export function isLockedOut(key: string): boolean {
  const until = lockouts.get(key)
  if (!until) return false
  if (Date.now() >= until) { lockouts.delete(key); return false }
  return true
}

/**
 * Record one event and return true if the rate limit is exceeded.
 * Call before doing expensive work (DB query, bcrypt) to reject early.
 */
export function hit(key: string, max: number, windowMs: number): boolean {
  if (isLockedOut(key)) return true
  const ts = prune(key, windowMs)
  ts.push(Date.now())
  events.set(key, ts)
  return ts.length > max
}

/**
 * Record one failure and apply a lockout once maxFails is reached within windowMs.
 * Returns true if the key is now locked out.
 */
export function fail(key: string, maxFails: number, windowMs: number, lockMs: number): boolean {
  const ts = prune(key, windowMs)
  ts.push(Date.now())
  events.set(key, ts)
  if (ts.length >= maxFails) {
    lockouts.set(key, Date.now() + lockMs)
    return true
  }
  return false
}

type HeaderReq = { headers: { get(k: string): string | null } }

/**
 * Extract the client IP from a request.
 *
 * Behind a proxy/CDN the only non-spoofable source is a header the edge sets and
 * the client cannot forge — but which header that is depends on the host, so it's
 * configurable via TRUSTED_IP_HEADER (e.g. "CF-Connecting-IP" for Cloudflare,
 * "Fly-Client-IP" for raw Fly.io, "X-Real-IP" for nginx). When it's set and
 * present, we trust it exclusively.
 *
 * When it's not configured (local dev, or a host without a known trusted header)
 * we fall back to X-Forwarded-For / X-Real-IP. That fallback is best-effort and
 * spoofable, so for any internet-facing deployment set TRUSTED_IP_HEADER. Never
 * point it at a header that holds the *proxy's* IP (e.g. Fly-Client-IP behind
 * Cloudflare) — that would collapse every user onto one key.
 */
export function clientIp(req: HeaderReq): string {
  const trusted = process.env.TRUSTED_IP_HEADER?.trim()
  if (trusted) {
    const v = req.headers.get(trusted)?.trim()
    if (v) return v
  }
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    req.headers.get('x-real-ip')?.trim() ||
    'unknown'
  )
}

/**
 * Escape hatch: when DISABLE_IP_RATE_LIMIT is truthy, per-IP limits are skipped.
 * Account-level lockout and per-user limits are unaffected. Lets an operator
 * recover instantly if a misconfigured proxy collapses every request onto one IP,
 * without losing brute-force protection on individual accounts.
 */
function ipLimitDisabled(): boolean {
  const v = process.env.DISABLE_IP_RATE_LIMIT?.trim().toLowerCase()
  return v === '1' || v === 'true' || v === 'yes'
}

/**
 * Per-IP rate-limit check: resolves the client IP and applies `hit` under the
 * key `${prefix}:ip:${ip}`. Returns false (never limited) when per-IP limiting is
 * disabled. Use this for all IP-keyed auth limits so the escape hatch is honored
 * in one place.
 */
export function ipHit(req: HeaderReq, prefix: string, max: number, windowMs: number): boolean {
  if (ipLimitDisabled()) return false
  return hit(`${prefix}:ip:${clientIp(req)}`, max, windowMs)
}
