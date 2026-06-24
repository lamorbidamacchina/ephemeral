// Ephemeral service worker — Web Push wake-up only.
//
// The push payload carries no message content and no sender identity; it is just
// a signal that something arrived. On iOS/WebKit every received push MUST show a
// notification, so we always call showNotification().

self.addEventListener('install', (event) => {
  // Activate this worker immediately rather than waiting for old tabs to close.
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Take control of any already-open clients.
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  let title = 'New message';
  let body = 'Open Ephemeral to read it.';

  try {
    if (event.data) {
      const data = event.data.json();
      if (data.title) title = data.title;
      if (data.body) body = data.body;
    }
  } catch {
    // Malformed/empty payload — fall back to the generic wake-up text above.
  }

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      // Collapse repeated wake-ups into a single notification instead of stacking.
      tag: 'ephemeral-message',
      renotify: true,
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clients) => {
        // Focus an existing app window if one is open.
        for (const client of clients) {
          if ('focus' in client) return client.focus();
        }
        // Otherwise open the app at the contact list.
        if (self.clients.openWindow) return self.clients.openWindow('/');
      })
  );
});
