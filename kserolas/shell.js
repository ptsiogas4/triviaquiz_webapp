/*
 * Xerolas web shell: launch context (deep links), WasmGC check, app loader, loading screen, service worker.
 * Plain ES2017, no dependencies. Loaded with `defer` from index.html, so the DOM is ready when this runs.
 * Contract with the Kotlin side is documented in docs/web/README.md ("Kotlin hooks").
 */
(function () {
    'use strict';

    // TODO(app-store): set to the App Store listing URL (https://apps.apple.com/app/idNNNNNNNNN) once known.
    var APP_STORE_URL = '';
    var APP_SCRIPT = 'composeApp.js';

    var doc = document;
    var $ = function (id) { return doc.getElementById(id); };

    // ---------------------------------------------------------------------------------------------
    // 1. Launch context. The URL is left untouched (Firebase rewrites every path to index.html),
    //    this only parses it once so the app does not have to.
    // ---------------------------------------------------------------------------------------------
    var params = new URLSearchParams(location.search);
    var path = location.pathname.replace(/\/+$/, '') || '/';
    var launch = { path: path, query: location.search, hash: location.hash, route: 'home', params: {} };
    var join = path.match(/^\/join\/([A-Za-z0-9]{4,12})$/);
    if (join) {
        launch.route = 'join';
        launch.params.code = join[1].toUpperCase();
    } else if (path === '/daily' || path === '/blitz' || path === '/quick') {
        // Mode deep links, mapped to app routes by ModeDeepLinks on the Kotlin side.
        launch.route = path.slice(1);
    } else if (path !== '/' && path !== '/index.html') {
        launch.route = 'unknown';
    }
    params.forEach(function (v, k) { if (!(k in launch.params)) launch.params[k] = v; });

    window.__XEROLAS_LAUNCH__ = launch;
    // Kotlin/Wasm interop is simplest with strings: `js("window.xerolasLaunch()")` returns JSON.
    window.xerolasLaunch = function () { return JSON.stringify(launch); };

    if (APP_STORE_URL) {
        var appStore = $('xl-appstore');
        appStore.href = APP_STORE_URL;
        appStore.hidden = false;
    }

    // ---------------------------------------------------------------------------------------------
    // 2. Feature check: Kotlin/Wasm needs WebAssembly GC (and exception handling).
    // ---------------------------------------------------------------------------------------------
    function supportsWasmGc() {
        try {
            if (typeof WebAssembly !== 'object' || typeof WebAssembly.validate !== 'function') return false;
            // Minimal module declaring a GC struct type: (module (type (struct)))
            return WebAssembly.validate(new Uint8Array([0, 97, 115, 109, 1, 0, 0, 0, 1, 5, 1, 95, 1, 120, 0]));
        } catch (e) {
            return false;
        }
    }

    // ---------------------------------------------------------------------------------------------
    // 3. Loading screen lifecycle.
    // ---------------------------------------------------------------------------------------------
    var loader = $('xl-loader');
    var fallbackEl = $('xl-fallback');
    var legalLinks = doc.createElement('p');
    legalLinks.className = 'xl-legal';
    [
        ['/legal/privacy.html', 'Πολιτική απορρήτου'],
        ['/legal/terms.html', 'Όροι χρήσης']
    ].forEach(function (entry) {
        var link = doc.createElement('a');
        link.href = entry[0];
        link.textContent = entry[1];
        legalLinks.appendChild(link);
    });
    fallbackEl.querySelector('.xl-card').appendChild(legalLinks);
    var ready = false;
    var slowTimer;

    function setText(id, text) { var el = $(id); if (el) el.textContent = text; }
    function hide(el) { if (el) el.hidden = true; }

    function appReady() {
        if (ready) return;
        ready = true;
        clearTimeout(slowTimer);
        if (observer) observer.disconnect();
        if (loader) {
            loader.classList.add('xl-done');
            loader.setAttribute('aria-busy', 'false');
            setTimeout(function () { if (loader.parentNode) loader.parentNode.removeChild(loader); }, 500);
        }
        doc.documentElement.setAttribute('data-app-ready', 'true');
    }
    // Kotlin may call this after the first real frame for exact timing: `js("window.xerolasAppReady()")`.
    window.xerolasAppReady = appReady;

    function showFallback(isError) {
        clearTimeout(slowTimer);
        hide(loader);
        var fb = fallbackEl;
        // Compose may already have cleared <body>: re-attach before touching its children by id.
        if (!fb.isConnected) doc.body.appendChild(fb);
        if (isError) {
            setText('xl-fallback-title', 'Κάτι πήγε στραβά στη φόρτωση');
            setText('xl-fallback-text', 'Έλεγξε τη σύνδεσή σου και δοκίμασε ξανά, ή κατέβασε την εφαρμογή.');
            var retry = $('xl-retry');
            retry.hidden = false;
            retry.onclick = function () { location.reload(); };
        }
        fb.hidden = false;
    }

    // Compose attaches its canvas (or host element) to <body>. Treat the first foreign element as
    // "rendering started", then wait two frames so the first composition has painted.
    var observer = null;
    var composeStarted = false;
    function isShellNode(node) {
        return node.nodeType !== 1 || (node.id && node.id.indexOf('xl-') === 0) ||
            /^(SCRIPT|NOSCRIPT|STYLE|LINK|TEMPLATE)$/.test(node.tagName);
    }
    function watchForCompose() {
        if (!('MutationObserver' in window)) { setTimeout(appReady, 4000); return; }
        observer = new MutationObserver(function (mutations) {
            for (var i = 0; i < mutations.length; i++) {
                var added = mutations[i].addedNodes;
                for (var j = 0; j < added.length; j++) {
                    if (!isShellNode(added[j])) {
                        composeStarted = true;
                        observer.disconnect();
                        requestAnimationFrame(function () {
                            requestAnimationFrame(function () { setTimeout(appReady, 120); });
                        });
                        // Backstop: rAF does not run in hidden tabs.
                        setTimeout(appReady, 1500);
                        return;
                    }
                }
            }
        });
        observer.observe(doc.body, { childList: true });
    }

    function onEarlyError(ev) {
        // Once Compose is running, errors belong to the app (it shows its own UI), not to the loader.
        if (ready || composeStarted) return;
        var reason = ev && (ev.reason || ev.error || ev.message);
        var text = String((reason && (reason.stack || reason.message)) || reason || '');
        // Only bail out for loader-level failures, not for app-level logs.
        // SyntaxError covers a missing composeApp.js answered by the SPA rewrite with index.html.
        if (/WebAssembly|CompileError|LinkError|wasm|Failed to fetch|NetworkError|Load failed|SyntaxError/i.test(text)) {
            showFallback(true);
        }
    }

    function loadApp() {
        window.addEventListener('error', onEarlyError);
        window.addEventListener('unhandledrejection', onEarlyError);
        watchForCompose();
        slowTimer = setTimeout(function () {
            setText('xl-status', 'Αργή σύνδεση, σχεδόν έτοιμο...');
        }, 8000);
        var s = doc.createElement('script');
        s.src = APP_SCRIPT;
        s.async = true;
        s.onerror = function () { showFallback(true); };
        doc.body.appendChild(s);
    }

    if (supportsWasmGc()) {
        loadApp();
    } else {
        showFallback(false);
    }

    // ---------------------------------------------------------------------------------------------
    // 4. Service worker with a user-confirmed update (no silent swap under a running game).
    // ---------------------------------------------------------------------------------------------
    var swOk = 'serviceWorker' in navigator &&
        (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1');
    if (!swOk) return;

    var reloading = false;
    // ComposeViewport(document.body) clears <body>, so keep a reference and re-attach the toast when needed.
    var toastEl = $('xl-update');
    function promptUpdate(worker) {
        var toast = toastEl;
        if (!toast || !worker) return;
        if (!toast.isConnected) doc.body.appendChild(toast);
        toast.hidden = false;
        toast.querySelector('button').onclick = function () {
            toast.hidden = true;
            worker.postMessage({ type: 'SKIP_WAITING' });
        };
    }

    window.addEventListener('load', function () {
        navigator.serviceWorker.register('/sw.js', { scope: '/' }).then(function (reg) {
            // A waiting worker on load means an update was downloaded in an earlier visit.
            if (reg.waiting && navigator.serviceWorker.controller) promptUpdate(reg.waiting);
            reg.addEventListener('updatefound', function () {
                var nw = reg.installing;
                if (!nw) return;
                nw.addEventListener('statechange', function () {
                    // Only prompt for real updates, not for the very first install.
                    if (nw.state === 'installed' && navigator.serviceWorker.controller) promptUpdate(nw);
                });
            });
            // Check for a new sw.js when the tab comes back to the foreground.
            doc.addEventListener('visibilitychange', function () {
                if (doc.visibilityState === 'visible') reg.update().catch(function () {});
            });
        }).catch(function (e) { console.warn('[xerolas] service worker registration failed', e); });

        navigator.serviceWorker.addEventListener('controllerchange', function () {
            if (reloading) return;
            reloading = true;
            location.reload();
        });
    });
})();
