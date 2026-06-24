import webpush from 'web-push';
import { pool } from './db';

// Web Push wake-up notifications for offline recipients.
//
// Privacy: the payload carries NO message content and NO sender identity — it is
// only a signal that *something* arrived, matching the app's blind-relay model.
// (iOS/WebKit also requires every received push to show a visible notification,
// so a truly silent push isn't an option there anyway.)

const publicKey  = process.env.VAPID_PUBLIC_KEY?.trim();
const privateKey = process.env.VAPID_PRIVATE_KEY?.trim();
const subject    = process.env.VAPID_SUBJECT?.trim() || 'mailto:admin@example.com';

// Push is a non-critical add-on. A missing or malformed VAPID config must only
// disable push — it must NEVER crash the relay (that would take message delivery
// down with it). So we validate defensively and never throw at module load.
let enabled = false;
if (publicKey && privateKey) {
  try {
    webpush.setVapidDetails(subject, publicKey, privateKey);
    enabled = true;
  } catch (err) {
    console.error('Web Push disabled: invalid VAPID config.', err);
  }
} else {
  console.warn('Web Push disabled: VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY not set.');
}

// Content-free wake-up. The service worker renders a generic notification.
const PAYLOAD = JSON.stringify({
  title: 'New message',
  body:  'Open Ephemeral to read it.',
});

interface SubRow {
  id:       string;
  endpoint: string;
  p256dh:   string;
  auth:     string;
}

// Wake every device registered for this user. Fire-and-forget from the relay;
// failures are logged and dead subscriptions are pruned, never thrown upward.
export async function notifyOffline(userId: string): Promise<void> {
  if (!enabled) return;

  let subs: SubRow[];
  try {
    const [rows] = await pool.execute(
      `SELECT id, endpoint, p256dh_key, auth_key
         FROM push_subscriptions
        WHERE user_id = ?`,
      [userId]
    );
    subs = (rows as any[]).map(r => ({
      id:       r.id,
      endpoint: r.endpoint,
      p256dh:   r.p256dh_key,
      auth:     r.auth_key,
    }));
  } catch (err) {
    console.error('Failed to load push subscriptions:', err);
    return;
  }

  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          PAYLOAD
        );
      } catch (err: any) {
        // 404/410 mean the subscription is gone (uninstalled, expired). Prune it.
        if (err?.statusCode === 404 || err?.statusCode === 410) {
          try {
            await pool.execute('DELETE FROM push_subscriptions WHERE id = ?', [sub.id]);
          } catch (delErr) {
            console.error('Failed to prune dead push subscription:', delErr);
          }
        } else {
          console.error('Push send failed:', err?.statusCode ?? err);
        }
      }
    })
  );
}
