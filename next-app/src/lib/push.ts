// Web Push client helpers. This is the abstraction layer over the browser-only
// push APIs (navigator.serviceWorker, PushManager, Notification) so components
// never touch them directly — keeps the React Native port tractable.

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? '';

export type PushStatus = 'unsupported' | 'denied' | 'subscribed' | 'unsubscribed';

// True only where Web Push can actually work. On iOS this additionally requires
// the app to be launched from the Home Screen (installed PWA).
export function isPushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

// iOS only allows push from an installed (Home Screen) PWA, not a Safari tab.
export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    // iOS Safari exposes this non-standard flag on navigator.
    (navigator as any).standalone === true
  );
}

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

async function getRegistration(): Promise<ServiceWorkerRegistration> {
  const existing = await navigator.serviceWorker.getRegistration('/');
  if (existing) return existing;
  return navigator.serviceWorker.register('/sw.js', { scope: '/' });
}

// Current subscription state, for reflecting the toggle on load.
export async function getPushStatus(): Promise<PushStatus> {
  if (!isPushSupported()) return 'unsupported';
  if (Notification.permission === 'denied') return 'denied';
  const reg = await navigator.serviceWorker.getRegistration('/');
  const sub = reg ? await reg.pushManager.getSubscription() : null;
  return sub ? 'subscribed' : 'unsubscribed';
}

// MUST be called from a user gesture (a click) — iOS rejects permission requests
// that aren't tied to a direct interaction.
export async function subscribeToPush(): Promise<PushStatus> {
  if (!isPushSupported()) return 'unsupported';
  if (!VAPID_PUBLIC_KEY) throw new Error('Push not configured');

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    return permission === 'denied' ? 'denied' : 'unsubscribed';
  }

  const reg = await getRegistration();
  await navigator.serviceWorker.ready;

  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    });
  }

  const json = sub.toJSON();
  const res = await fetch('/api/users/push', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({
      endpoint: json.endpoint,
      keys: json.keys,
      deviceLabel: navigator.userAgent.slice(0, 100),
    }),
  });
  if (!res.ok) throw new Error('Failed to save subscription');

  return 'subscribed';
}

// Show a content-free local notification for an incoming message when the app
// is open but not focused (a backgrounded tab). The server push path only covers
// the fully-offline recipient; this fills the "connected but hidden" gap. Uses
// the same tag as the server push so the two can never double up. Best-effort —
// never throws into the socket handler.
export async function showMessageNotification(): Promise<void> {
  if (!isPushSupported()) return;
  if (Notification.permission !== 'granted') return;
  // Only notify when the user isn't actively looking at the app.
  if (typeof document !== 'undefined' && !document.hidden) return;

  try {
    const reg = await navigator.serviceWorker.getRegistration('/');
    if (!reg) return;
    await reg.showNotification('New message', {
      body: 'Open Ephemeral to read it.',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: 'ephemeral-message',
    });
  } catch {
    // best-effort
  }
}

export async function unsubscribeFromPush(): Promise<PushStatus> {
  if (!isPushSupported()) return 'unsupported';

  const reg = await navigator.serviceWorker.getRegistration('/');
  const sub = reg ? await reg.pushManager.getSubscription() : null;
  if (sub) {
    const endpoint = sub.endpoint;
    await sub.unsubscribe();
    await fetch('/api/users/push', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ endpoint }),
    }).catch(() => {});
  }
  return 'unsubscribed';
}
