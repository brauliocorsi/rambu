const CACHE_NAME = 'rambu-cache-v2';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json'
];

// Install event - cache essential files
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      )
    )
  );
  self.clients.claim();
});

// Fetch event - network first, fallback to cache
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Never cache auth routes or API calls
  if (url.pathname.startsWith('/~oauth') ||
      url.pathname.startsWith('/auth') ||
      url.hostname.includes('supabase')) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }
        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});

// Handle push notifications (Web Push API)
self.addEventListener('push', (event) => {
  let data = {
    title: 'Rambu',
    body: 'Nova notificação',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-96x96.png',
  };

  if (event.data) {
    try {
      const payload = event.data.json();
      if (payload && typeof payload === 'object') {
        data = {
          ...data,
          title: typeof payload.title === 'string' && payload.title.trim() ? payload.title : data.title,
          body: typeof payload.body === 'string' ? payload.body : data.body,
          icon: typeof payload.icon === 'string' ? payload.icon : data.icon,
          badge: typeof payload.badge === 'string' ? payload.badge : data.badge,
          tag: typeof payload.tag === 'string' ? payload.tag : undefined,
          url: typeof payload.url === 'string' ? payload.url : '/',
        };
      }
    } catch {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: data.icon || '/icons/icon-192x192.png',
    badge: data.badge || '/icons/icon-96x96.png',
    tag: data.tag || 'rambu-notification',
    renotify: true,
    data: {
      url: data.url || '/',
      dateOfArrival: Date.now(),
    },
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Handle notification click - open/focus the app
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  // Segurança: forçar URL same-origin. Aceitar apenas path/relative.
  const rawUrl = event.notification.data?.url || '/';
  let targetUrl = '/';
  try {
    const u = new URL(rawUrl, self.location.origin);
    if (u.origin === self.location.origin) {
      targetUrl = u.pathname + u.search + u.hash;
    }
  } catch {
    targetUrl = '/';
  }

  event.waitUntil(
    (async () => {
      const clientList = await clients.matchAll({ type: 'window', includeUncontrolled: true });
      const sameOrigin = clientList.filter((c) => {
        try { return new URL(c.url).origin === self.location.origin; } catch { return false; }
      });

      // 1) Prefer a window already on the target URL
      const exact = sameOrigin.find((c) => {
        try { return (new URL(c.url).pathname + new URL(c.url).search) === targetUrl; } catch { return false; }
      });
      if (exact && 'focus' in exact) {
        return exact.focus();
      }

      // 2) Otherwise reuse any same-origin window
      const reusable = sameOrigin[0];
      if (reusable) {
        try { await reusable.navigate(targetUrl); } catch { /* cross-origin nav not allowed */ }
        if ('focus' in reusable) return reusable.focus();
      }

      // 3) Last resort: open a new window
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })()
  );
});
