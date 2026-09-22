const CACHE_NAME = 'acreage-v1';
const STATIC_CACHE = 'acreage-static-v1';
const DYNAMIC_CACHE = 'acreage-dynamic-v1';
const API_CACHE = 'acreage-api-v1';

// Assets to cache immediately
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/offline.html'
];

// Cache strategies
const CACHE_STRATEGIES = {
  // Cache first, fall back to network (good for static assets)
  cacheFirst: async (request) => {
    const cache = await caches.open(STATIC_CACHE);
    const cached = await cache.match(request);
    return cached || fetch(request);
  },

  // Network first, fall back to cache (good for API calls)
  networkFirst: async (request) => {
    const cache = await caches.open(DYNAMIC_CACHE);
    try {
      const networkResponse = await fetch(request);
      // Cache successful responses
      if (networkResponse.ok) {
        cache.put(request, networkResponse.clone());
      }
      return networkResponse;
    } catch (error) {
      const cached = await cache.match(request);
      if (cached) return cached;
      throw error;
    }
  },

  // Stale while revalidate (good for frequently updated content)
  staleWhileRevalidate: async (request) => {
    const cache = await caches.open(DYNAMIC_CACHE);
    const cached = await cache.match(request);
    
    // Fetch in background
    const fetchPromise = fetch(request).then((networkResponse) => {
      if (networkResponse.ok) {
        cache.put(request, networkResponse.clone());
      }
      return networkResponse;
    });

    // Return cached version immediately if available
    return cached || fetchPromise;
  }
};

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    Promise.all([
      caches.open(STATIC_CACHE).then((cache) => cache.addAll(STATIC_ASSETS)),
      caches.open(API_CACHE).then((cache) => cache.addAll([])) // Initialize API cache
    ])
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((cacheName) => {
            return cacheName !== STATIC_CACHE && 
                   cacheName !== DYNAMIC_CACHE && 
                   cacheName !== API_CACHE;
          })
          .map((cacheName) => caches.delete(cacheName))
      );
    })
  );
  self.clients.claim();
});

// Fetch event - handle different types of requests
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Skip cross-origin requests (except our API)
  if (url.origin !== self.location.origin && !url.pathname.includes('/api/')) return;

  // Handle different types of requests
  if (url.origin === self.location.origin) {
    // Static assets - cache first
    if (request.destination === 'style' || 
        request.destination === 'script' || 
        request.destination === 'image' ||
        url.pathname.match(/\.(css|js|png|jpg|jpeg|svg|woff|woff2|ttf|eot)$/)) {
      event.respondWith(CACHE_STRATEGIES.cacheFirst(request));
      return;
    }

    // HTML pages - network first, fall back to cache
    if (request.destination === 'document') {
      event.respondWith(
        CACHE_STRATEGIES.networkFirst(request).catch(() => {
          return caches.match('/offline.html');
        })
      );
      return;
    }
  }

  // API calls - network first with cache fallback
  if (url.pathname.includes('/api/')) {
    event.respondWith(CACHE_STRATEGIES.networkFirst(request));
    return;
  }

  // Default to network first
  event.respondWith(CACHE_STRATEGIES.networkFirst(request));
});

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-orders') {
    event.waitUntil(syncOfflineOrders());
  }
});

// Push notifications
self.addEventListener('push', (event) => {
  const options = {
    body: event.data ? event.data.text() : 'New notification from Acreage',
    icon: '/icon-192x192.png',
    badge: '/icon-192x192.png',
    vibrate: [200, 100, 200],
    data: {
      url: '/'
    }
  };

  event.waitUntil(
    self.registration.showNotification('Acreage', options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data.url || '/')
  );
});

// Sync offline orders when connection is restored
async function syncOfflineOrders() {
  try {
    const offlineOrders = await getOfflineOrders();
    for (const order of offlineOrders) {
      await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(order)
      });
    }
    await clearOfflineOrders();
  } catch (error) {
    console.error('Failed to sync orders:', error);
  }
}

// IndexedDB helpers for offline storage
function getOfflineOrders() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('AcreageOfflineDB', 1);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction(['orders'], 'readonly');
      const store = transaction.objectStore('orders');
      const getAll = store.getAll();
      getAll.onsuccess = () => resolve(getAll.result);
      getAll.onerror = () => reject(getAll.error);
    };
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('orders')) {
        db.createObjectStore('orders', { keyPath: 'id' });
      }
    };
  });
}

function clearOfflineOrders() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('AcreageOfflineDB', 1);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction(['orders'], 'readwrite');
      const store = transaction.objectStore('orders');
      store.clear();
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    };
  });
}
