const CACHE_NAME = 'pravesh-gold-v2';
const ASSETS = [
    './',
    './index.html',
    './manifest.json',
    './pravesh-logo.png',
    'https://cdn.jsdelivr.net/npm/lucide@0.344.0/dist/umd/lucide.min.js'
];

// 1. Install & Cache (Immediate Control)
self.addEventListener('install', (event) => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
    );
});

// 2. Activate (Cleanup Old Caches)
self.addEventListener('activate', (event) => {
    self.clients.claim();
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
            );
        })
    );
});

// 3. Smart Strategy: Stale-While-Revalidate
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // DANGER: NEVER cache Firestore/Firebase or API calls. 
    // This ensures real-time sync is direct and never stale.
    if (url.origin.includes('firestore.googleapis.com') || url.origin.includes('firebase') || url.pathname.includes('/macros/')) {
        return; // Let network handle it naturally
    }

    event.respondWith(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.match(event.request).then((cachedResponse) => {
                const fetchPromise = fetch(event.request).then((networkResponse) => {
                    // Update cache for next time
                    if (networkResponse && networkResponse.status === 200) {
                        cache.put(event.request, networkResponse.clone());
                    }
                    return networkResponse;
                }).catch(() => {
                    // Fallback to cache if network fails silently
                    return cachedResponse;
                });

                // Return cached version immediately if we have it, 
                // but still perform the fetch to update the background.
                return cachedResponse || fetchPromise;
            });
        })
    );
});
