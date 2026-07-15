// --- SERVICE WORKER: 1945 AIRFORCE ---
// Meng-cache aset game agar bisa dimainkan offline.

const CACHE_NAME = '1945-airforce-v1';
const ASSETS = [
    './',
    './index.html',
    './style.css',
    './game.js',
    './manifest.json',
    './icon.svg'
];

// 1. INSTALL: cache semua aset inti saat pertama kali dipasang
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS);
        }).then(() => {
            return self.skipWaiting();
        })
    );
});

// 2. ACTIVATE: bersihkan cache lama saat versi baru dipasang
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((name) => {
                    if (name !== CACHE_NAME) {
                        return caches.delete(name);
                    }
                })
            );
        }).then(() => {
            return self.clients.claim();
        })
    );
});

// 3. FETCH: sajikan dari cache (offline-first), fallback ke network
self.addEventListener('fetch', (event) => {
    // Abaikan request non-GET (mis. POST)
    if (event.request.method !== 'GET') return;

    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            // Jika ada di cache, pakai. Jika tidak, ambil dari network.
            if (cachedResponse) {
                return cachedResponse;
            }
            return fetch(event.request).then((networkResponse) => {
                // Simpan respons baru ke cache untuk pemakaian mendatang
                if (networkResponse && networkResponse.status === 200) {
                    const responseClone = networkResponse.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseClone);
                    });
                }
                return networkResponse;
            }).catch(() => {
                // Fallback saat offline & tidak ada di cache
                return caches.match('./index.html');
            });
        })
    );
});
