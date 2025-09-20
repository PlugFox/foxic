// Foxic PWA Service Worker

const CACHE_NAME = 'foxic-v1.2.0';
const STATIC_CACHE = 'foxic-static-v1.2.0';

const PRECACHE_URLS = [
    '/',
    '/manifest.json',
    '/favicon.ico',
    '/favicon-32.png',
    '/icon-180.png',
    '/icon-192.png',
    '/icon-512.png'
];

// Статические ресурсы (CSS, JS, изображения)
const STATIC_RESOURCES = /\.(css|js|png|jpg|jpeg|gif|svg|webp|woff|woff2|ttf|eot)$/;

// API и динамические ресурсы
const DYNAMIC_RESOURCES = /\/(api|auth|firestore)/;

// Установка сервис-воркера
self.addEventListener('install', (event) => {
    console.log('[SW] Installing service worker...');

    event.waitUntil(
        caches.open(STATIC_CACHE)
            .then((cache) => {
                console.log('[SW] Precaching static resources');
                return cache.addAll(PRECACHE_URLS);
            })
            .then(() => {
                // Принудительно активировать новый SW
                return self.skipWaiting();
            })
    );
});

// Активация сервис-воркера
self.addEventListener('activate', (event) => {
    console.log('[SW] Activating service worker...');

    event.waitUntil(
        // Очистка старых кэшей
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME && cacheName !== STATIC_CACHE) {
                        console.log('[SW] Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => {
            // Принудительно взять контроль над всеми клиентами
            return self.clients.claim();
        })
    );
});

// Обработка запросов
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Пропускаем не-GET запросы и внешние ресурсы
    if (request.method !== 'GET' || url.origin !== location.origin) {
        return;
    }

    // Стратегия кэширования в зависимости от типа ресурса
    if (STATIC_RESOURCES.test(url.pathname)) {
        // Статические ресурсы: Cache First (с проверкой свежести)
        event.respondWith(cacheFirstWithUpdate(request));
    } else if (DYNAMIC_RESOURCES.test(url.pathname)) {
        // API запросы: Network First
        event.respondWith(networkFirst(request));
    } else {
        // HTML страницы: Network First с fallback
        event.respondWith(networkFirstWithFallback(request));
    }
});

// Cache First с обновлением в фоне
async function cacheFirstWithUpdate(request) {
    try {
        const cachedResponse = await caches.match(request);

        if (cachedResponse) {
            // Обновляем кэш в фоне
            updateCacheInBackground(request);
            return cachedResponse;
        }

        // Если нет в кэше, загружаем и кэшируем
        const networkResponse = await fetch(request);
        if (networkResponse.ok) {
            const cache = await caches.open(STATIC_CACHE);
            cache.put(request, networkResponse.clone());
        }
        return networkResponse;

    } catch (error) {
        console.error('[SW] Cache first failed:', error);
        throw error;
    }
}

// Network First для динамического контента
async function networkFirst(request) {
    try {
        const networkResponse = await fetch(request);

        if (networkResponse.ok) {
            // Кэшируем успешные ответы
            const cache = await caches.open(CACHE_NAME);
            cache.put(request, networkResponse.clone());
        }

        return networkResponse;

    } catch (error) {
        console.log('[SW] Network failed, trying cache:', request.url);

        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }

        throw error;
    }
}

// Network First с fallback на offline страницу
async function networkFirstWithFallback(request) {
    try {
        const networkResponse = await fetch(request);

        if (networkResponse.ok) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(request, networkResponse.clone());
        }

        return networkResponse;

    } catch (error) {
        console.log('[SW] Network failed for page, trying cache:', request.url);

        // Пробуем найти в кэше
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }

        // Fallback на главную страницу для SPA
        const indexResponse = await caches.match('/');
        if (indexResponse) {
            return indexResponse;
        }

        throw error;
    }
}

// Обновление кэша в фоне
async function updateCacheInBackground(request) {
    try {
        const networkResponse = await fetch(request);
        if (networkResponse.ok) {
            const cache = await caches.open(STATIC_CACHE);
            await cache.put(request, networkResponse);
            console.log('[SW] Updated cache for:', request.url);
        }
    } catch (error) {
        console.log('[SW] Background update failed:', error);
    }
}

// Обработка сообщений от главного потока
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }

    if (event.data && event.data.type === 'GET_VERSION') {
        event.ports[0].postMessage({ version: CACHE_NAME });
    }
});

console.log('[SW] Service Worker loaded successfully');