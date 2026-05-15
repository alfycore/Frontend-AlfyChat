// AlfyChat — Service Worker

const EMOJI_CACHE = 'alfychat-twemoji-v1';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
  if (!event.request.url.includes('cdn.jsdelivr.net/gh/jdecked/twemoji')) return;

  event.respondWith(
    caches.open(EMOJI_CACHE).then(async (cache) => {
      const cached = await cache.match(event.request);
      if (cached) return cached;
      const response = await fetch(event.request);
      if (response.ok) cache.put(event.request, response.clone());
      return response;
    })
  );
});

// ── Web Push Notifications ────────────────────────────────────────────────────

self.addEventListener('push', (event) => {
  if (!event.data) return;

  let data;
  try {
    data = event.data.json();
  } catch {
    data = { title: 'AlfyChat', body: event.data.text(), conversationKey: 'unknown' };
  }

  const title = data.title || 'AlfyChat';
  const options = {
    body: data.body || '',
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    data: {
      url: data.url || '/',
      conversationKey: data.conversationKey || '',
    },
    tag: data.conversationKey || 'alfychat',
    renotify: data.type === 'mention',
    requireInteraction: data.type === 'mention',
    vibrate: data.type === 'mention' ? [200, 100, 200] : [100],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Chercher un onglet AlfyChat déjà ouvert
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      // Ouvrir un nouvel onglet
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});

self.addEventListener('pushsubscriptionchange', (event) => {
  // La subscription a expiré — notifier le client pour qu'il la renouvelle
  event.waitUntil(
    self.registration.pushManager.subscribe(event.oldSubscription.options).then((subscription) => {
      // Envoyer la nouvelle subscription au serveur via le client actif
      return clients.matchAll({ type: 'window' }).then((windowClients) => {
        for (const client of windowClients) {
          client.postMessage({ type: 'PUSH_SUBSCRIPTION_CHANGED', subscription });
        }
      });
    })
  );
});
