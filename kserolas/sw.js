/*
 * Xerolas service worker.
 *
 * Strategy (see docs/web/README.md):
 *  - Navigations (/, /join/CODE, /daily, ...): network first, fall back to the cached index.html, then offline.html.
 *  - Hashed *.wasm (name is a content hash, never changes): cache first, old builds trimmed.
 *  - composeApp.js, shell files and composeResources/ (not hashed, must match the current build): network first
 *    with a timeout, cache fallback for offline. Firebase sends `no-cache` for them, so the network hit is a cheap 304.
 *  - Icons, images, fonts: cache first.
 *  - Everything else (backend API, ads, analytics): not touched.
 *
 * Updates: bump CACHE_VERSION whenever this file's logic changes. A new worker waits until the page asks it to
 * take over (SKIP_WAITING from the "new version" toast in shell.js), so a running game is never swapped silently.
 */
'use strict';

var CACHE_VERSION = 'v3';
var SHELL_CACHE = 'xerolas-shell-' + CACHE_VERSION;
var ASSET_CACHE = 'xerolas-assets-' + CACHE_VERSION;
var RUNTIME_CACHE = 'xerolas-runtime-' + CACHE_VERSION;
var CURRENT = [SHELL_CACHE, ASSET_CACHE, RUNTIME_CACHE];

var MAX_WASM_ENTRIES = 10;
var NETWORK_TIMEOUT_MS = 4000;

var PRECACHE = [
    '/index.html',
    '/offline.html',
    '/styles.css',
    '/shell.js',
    '/manifest.webmanifest',
    '/icons/favicon.svg',
    '/icons/icon-192.png',
    '/icons/apple-touch-icon.png'
];

self.addEventListener('install', function (event) {
    event.waitUntil(
        caches.open(SHELL_CACHE).then(function (cache) {
            return cache.addAll(PRECACHE.map(function (url) { return new Request(url, { cache: 'reload' }); }));
        })
    );
});

self.addEventListener('activate', function (event) {
    event.waitUntil((async function () {
        var keys = await caches.keys();
        await Promise.all(keys.map(function (key) {
            if (key.indexOf('xerolas-') === 0 && CURRENT.indexOf(key) === -1) return caches.delete(key);
        }));
        if (self.registration.navigationPreload) {
            try { await self.registration.navigationPreload.enable(); } catch (e) { /* not supported */ }
        }
    })());
});

self.addEventListener('message', function (event) {
    if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', function (event) {
    var req = event.request;
    if (req.method !== 'GET') return;
    var url = new URL(req.url);

    if (url.origin === self.location.origin) {
        if (req.mode === 'navigate') return event.respondWith(handleNavigation(event));
        var p = url.pathname;
        if (p === '/sw.js') return;
        if (/\/[0-9a-f]{16,}\.wasm$/.test(p)) return event.respondWith(cacheFirst(req, ASSET_CACHE, trimWasm));
        if (/\.(js|mjs|css|wasm|webmanifest|cvr|json|txt)$/.test(p) || p.indexOf('/composeResources/') === 0) {
            if (/\/composeResources\/font\//.test(p)) return event.respondWith(cacheFirst(req, RUNTIME_CACHE));
            return event.respondWith(networkFirst(req, RUNTIME_CACHE));
        }
        // Audio is fetched with Range requests (206 partial responses), which the Cache API rejects:
        // let the browser handle it directly so sounds always play.
        if (/\.(mp3|wav|ogg|m4a)$/.test(p) || req.headers.has('range')) return;
        if (/\.(png|svg|jpg|jpeg|webp|ico|ttf|otf|woff2?)$/.test(p)) {
            return event.respondWith(cacheFirst(req, RUNTIME_CACHE));
        }
        return;
    }

    // Google Fonts: the font files are immutable, the CSS changes rarely.
    if (url.hostname === 'fonts.gstatic.com') return event.respondWith(cacheFirst(req, RUNTIME_CACHE));
    if (url.hostname === 'fonts.googleapis.com') return event.respondWith(networkFirst(req, RUNTIME_CACHE));
    // Anything else (backend API, ads, analytics) goes straight to the network.
});

async function handleNavigation(event) {
    var cache = await caches.open(SHELL_CACHE);
    try {
        var res = (await event.preloadResponse) || (await withTimeout(fetch(event.request), NETWORK_TIMEOUT_MS * 2));
        var type = res.headers.get('content-type') || '';
        // Every app route is rewritten to index.html, so keep the latest copy under one key.
        if (res.ok && type.indexOf('text/html') !== -1 && !/\/offline\.html$/.test(new URL(event.request.url).pathname)) {
            cache.put('/index.html', res.clone());
        }
        return res;
    } catch (e) {
        return (await cache.match('/index.html')) || (await cache.match('/offline.html')) || Response.error();
    }
}

async function cacheFirst(req, cacheName, afterPut) {
    var cache = await caches.open(cacheName);
    var hit = await cache.match(req);
    if (hit) return hit;
    var res = await fetch(req);
    if (res.status === 200 || res.type === 'opaque') {
        await cache.put(req, res.clone());
        if (afterPut) afterPut(cache);
    }
    return res;
}

async function networkFirst(req, cacheName) {
    var cache = await caches.open(cacheName);
    var network = fetch(req).then(function (res) {
        if (res.status === 200) cache.put(req, res.clone()).catch(function () {});
        return res;
    });
    network.catch(function () { /* handled below */ });
    try {
        return await withTimeout(network, NETWORK_TIMEOUT_MS);
    } catch (e) {
        var hit = (await cache.match(req)) || (await caches.match(req));
        // No cached copy: keep waiting for the same request (slow network) instead of failing.
        return hit || network;
    }
}

function withTimeout(promise, ms) {
    return new Promise(function (resolve, reject) {
        var t = setTimeout(function () { reject(new Error('timeout')); }, ms);
        promise.then(function (v) { clearTimeout(t); resolve(v); }, function (e) { clearTimeout(t); reject(e); });
    });
}

// Keep only the newest hashed wasm files (each build adds new names; old ones are dead weight of 5 to 8 MB).
async function trimWasm(cache) {
    var keys = (await cache.keys()).filter(function (r) { return /\.wasm$/.test(r.url); });
    var extra = keys.length - MAX_WASM_ENTRIES;
    for (var i = 0; i < extra; i++) await cache.delete(keys[i]);
}
