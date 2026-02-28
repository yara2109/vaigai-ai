const CACHE_NAME = 'vaigai-ai-v1';
const ASSETS_TO_CACHE = [
    '/',
    '/index.html',
    '/styles.css',
    '/app.js',
    '/manifest.json'
];

// Install Event - Cache Core Assets
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('Opened cache');
            // Adding catch to avoid failing if running directly from file:// protocol
            return Promise.allSettled(
                ASSETS_TO_CACHE.map(url => {
                    return fetch(url).then(response => {
                        if (!response.ok) throw Error('Not ok');
                        return cache.put(url, response);
                    }).catch(e => console.log('Skipped caching for:', url, e));
                })
            );
        })
    );
    self.skipWaiting();
});

// Activate Event - Clean up old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    self.clients.claim();
});

// Fetch Event - Serve from Cache or Network
self.addEventListener('fetch', (event) => {
    // Skip cross-origin requests (like the Gemini API calls)
    if (!event.request.url.startsWith(self.location.origin)) {
        return;
    }

    event.respondWith(
        caches.match(event.request).then((response) => {
            // Return cached response if found
            if (response) {
                return response;
            }

            // Otherwise, make network request
            return fetch(event.request).then(
                function (networkResponse) {
                    // Check if we received a valid response
                    if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
                        return networkResponse;
                    }

                    // Clone the response because it's a stream and can only be consumed once
                    var responseToCache = networkResponse.clone();

                    caches.open(CACHE_NAME)
                        .then(function (cache) {
                            cache.put(event.request, responseToCache);
                        });

                    return networkResponse;
                }
            );
        }).catch(() => {
            // Fallback or offline page logic could go here
        })
    );
});
