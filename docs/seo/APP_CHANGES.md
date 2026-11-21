# Changes needed in the app repository

Do these in `ptsiogas4/triviaquiz`, then rebuild the Wasm bundle. No files in that repository or in `kserolas/` were edited by this SEO change.

## Home and launch routes

In the source of the shell (`composeApp/src/wasmJsMain/resources/shell.js` in the current app checkout), replace:

```js
} else if (path !== '/' && path !== '/index.html') {
```

with:

```js
} else if (path !== '/' && path !== '/play' && path !== '/play/' && path !== '/index.html') {
```

The shipped shell currently labels `/play` as `unknown`. The server correctly serves the game there, but this source change makes its launch contract explicitly `home`.

Update the Kotlin web launch router so `/play` and `/play/` resolve to the same home screen as the former `/` route. Replace browser-facing home navigation targets (location assignments, router links, history pushes/replaces, logo links and return-to-game links) from `/` to `/play`. Keep OAuth callback, invite and mode paths unchanged. Preserve query strings and fragments when normalizing paths. Internal Compose screen identifiers do not need renaming.

Inspection: shipped `shell.js` does not navigate home or assign location except to reload. The local question-source checkout's `wasmJsMain/kotlin/.../main.kt` mounts `App()` directly and has no browser launch router. Searches of that checkout found no browser home URL assignments, `pushState`, `replaceState`, or `xerolasLaunch` hook. It appears older than the shipped shell. Therefore the current production Kotlin router and its home behavior cannot be certified from this checkout or the generated bundle. Audit these targets in the current app source before release. Do not inspect/edit the generated composeApp.js to perform this change.

## Installed app entry point

In the source `manifest.webmanifest`, change only:

```json
"start_url": "/play?source=pwa"
```

Keep `id: "/"` so existing installations retain their identity, and keep `scope: "/"` for deep links. The unmodified bundle currently starts at `/?source=pwa`, which now intentionally loads the landing. Existing installed manifests may require a browser refresh/update.

## Service worker navigation cache

The current `sw.js` caches EVERY successful HTML navigation under `/index.html`. Visiting an SEO page after a game session can overwrite the offline game cache with that page. In the service-worker source:

1. Bump `CACHE_VERSION` from `v4` to `v5-seo` to discard polluted old caches after activation.
2. Keep `/index.html` in PRECACHE, since it remains the game shell.
3. Replace `handleNavigation` with the following implementation. Each SEO page gets its own offline cache entry, and game routes share the game shell.

```js
async function handleNavigation(event) {
    var cache = await caches.open(SHELL_CACHE);
    var path = new URL(event.request.url).pathname;
    var seo = path === '/' || path === '/seo-home.html' ||
        /^\/(erotiseis\/[^/]+|pos-paizetai|syxnes-erotiseis)\/(index\.html)?$/.test(path);
    var key = seo ? path : '/index.html';
    try {
        var res = (await event.preloadResponse) ||
            (await withTimeout(fetch(event.request), NETWORK_TIMEOUT_MS * 2));
        var type = res.headers.get('content-type') || '';
        if (res.ok && type.indexOf('text/html') !== -1 &&
            !/^\/legal\//.test(path) && path !== '/offline.html') {
            await cache.put(key, res.clone());
        }
        return res;
    } catch (e) {
        return (await cache.match(key)) ||
            (await cache.match('/offline.html')) || Response.error();
    }
}
```

Exclude `/legal/*.html` from the game navigation cache as above. Test fresh installs, existing service-worker upgrades, visiting landing/category/game in sequence, and offline `/play` and `/join/CODE`. A previously active v4 worker remains in control until the existing update prompt is accepted.

## Search metadata

Set the GAME shell canonical and `og:url` to `https://xerolasgame.gr/play`. Keep the landing canonical at `/`. Update the game's structured data URL to `/play`, retaining its Greek language and existing game metadata. This prevents the game from claiming the landing URL as its canonical.

## Release checks in the app repo

Open `/play`: confirm the actual Compose home renders, then navigate home from a mode, settings and account. Confirm OAuth callback code and invite tokens reach the existing handlers. Curl verifies which shell is served; it cannot prove the compiled Kotlin router or OAuth flow works.
