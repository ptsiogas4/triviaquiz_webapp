/* Local bridge only. No Google resource is fetched until the remote gate and CMP allow it. */
(function () {
    'use strict';
    var config = {}, generation = 0, consentStarted = false, allowed = false, sdkReady = false;
    var resolved = false, privacy = false, active = null, banner = null, bannerOwner = null, newestBannerOwner = 0, sdkInitialized = false;
    var rewardOffer = null, rewardPreparing = false, rewardCallback = null, cancelReward = null, lastRewardAttempt = -Infinity;
    var nonce = document.currentScript && document.currentScript.nonce;
    function applyNonce(s) { if (nonce) s.nonce = nonce; }
    function enabled() { return config.enabled === true && /^ca-pub-\d{16}$/.test(config.client || ''); }
    function ready() { return enabled() && allowed && sdkReady; }
    function removeBanner() { if (banner) { banner.remove(); banner = null; bannerOwner = null; } }
    function script(src, onload) {
        var s = document.createElement('script'); s.async = true; s.src = src;
        applyNonce(s); s.crossOrigin = 'anonymous'; s.onload = onload || function () {};
        s.onerror = function () { allowed = false; sdkReady = false; resolved = true; };
        document.head.appendChild(s); return s;
    }
    function loadAds(token) {
        if (token !== generation || !enabled() || !allowed) return;
        if (window.__xerolasAdTag) { sdkReady = sdkInitialized; return; }
        window.__xerolasAdTag = true;
        window.adsbygoogle = window.adsbygoogle || [];
        window.adBreak = window.adConfig = function (o) { window.adsbygoogle.push(o); };
        var s = document.createElement('script'); applyNonce(s); s.async = true; s.crossOrigin = 'anonymous';
        s.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=' + config.client;
        s.setAttribute('data-ad-client', config.client);
        s.setAttribute('data-ad-frequency-hint', '180s');
        if (config.adtest === true) s.setAttribute('data-adbreak-test', 'on');
        s.onerror = function () { sdkReady = false; };
        s.onload = function () {
            if (token !== generation || !allowed) return;
            window.adConfig({ preloadAdBreaks: 'on', sound: 'off', onReady: function () {
                if (token === generation) { sdkInitialized = true; sdkReady = allowed; }
            } });
        };
        document.head.appendChild(s);
    }
    window.xerolasAds = {
        configure: function (json) {
            var next; try { next = JSON.parse(json); } catch (_) { next = {}; }
            if (JSON.stringify(next) === JSON.stringify(config)) return;
            if (active) active(false);
            if (cancelReward) cancelReward(false);
            config = next; generation++; sdkInitialized = false; rewardOffer = null; rewardPreparing = false; allowed = false; sdkReady = false; resolved = !enabled();
            consentStarted = false; privacy = false; removeBanner();
            // Changing publisher/test mode after tag loading requires a page reload. Fail closed.
        },
        consent: function () {
            if (!enabled()) { resolved = true; return; }
            if (consentStarted) return;
            consentStarted = true; var token = generation;
            window.googlefc = window.googlefc || {};
            window.googlefc.callbackQueue = window.googlefc.callbackQueue || [];
            window.googlefc.callbackQueue.push({ CONSENT_API_READY: function () {
                if (token !== generation || typeof window.__tcfapi !== 'function') return;
                window.__tcfapi('addEventListener', 2, function (data, success) {
                    if (token !== generation || !success || !data) return;
                    privacy = data.gdprApplies === true;
                    var complete = data.gdprApplies === false || data.eventStatus === 'tcloaded' || data.eventStatus === 'useractioncomplete';
                    if (!complete) { allowed = false; sdkReady = false; removeBanner(); return; }
                    resolved = true;
                    var p = data.purpose && data.purpose.consents || {};
                    var v = data.vendor && data.vendor.consents || {};
                    allowed = data.gdprApplies === false || (data.gdprApplies === true && p[1] === true && p[3] === true && p[4] === true && v[755] === true);
                    if (allowed) loadAds(token);
                    else { sdkReady = false; removeBanner(); if (active) active(false); if (cancelReward) cancelReward(false); }
                });
            } });
            script('https://fundingchoicesmessages.google.com/i/' + config.client + '?ers=1');
        },
        ready: ready,
        resolved: function () { return resolved; },
        privacy: function () { return enabled() && privacy; },
        review: function () {
            if (enabled() && window.googlefc && window.googlefc.showRevocationMessage) {
                allowed = false; sdkReady = false; removeBanner();
                if (active) active(false); if (cancelReward) cancelReward(false);
                window.googlefc.showRevocationMessage();
            }
        },
        rewardReady: function () { return ready() && !!rewardOffer; },
        prepareReward: function () {
            if (!ready() || active || rewardPreparing || rewardOffer || Date.now() - lastRewardAttempt < 30000) return;
            lastRewardAttempt = Date.now();
            rewardPreparing = true;
            var token = generation, earned = false, finished = false, started = false;
            function finish(value) {
                if (finished) return;
                finished = true;
                if (token !== generation) return;
                rewardPreparing = false; rewardOffer = null; active = null; cancelReward = null;
                var callback = rewardCallback; rewardCallback = null;
                if (callback) callback(value);
            }
            cancelReward = finish;
            try { window.adBreak({ type: 'reward', name: 'opt_in_reward',
                beforeReward: function (showAd) {
                    if (finished || token !== generation || !ready()) return;
                    rewardOffer = function (callback) {
                        if (started) { callback(false); return; }
                        started = true; rewardCallback = callback; rewardOffer = null;
                        active = finish;
                        try { showAd(); } catch (_) { finish(false); }
                    };
                },
                beforeAd: function () {}, afterAd: function () {},
                adViewed: function () { if (!finished && started) earned = token === generation && ready(); },
                adDismissed: function () { finish(false); },
                adBreakDone: function () { finish(earned); }
            }); } catch (_) { finish(false); }
        },
        show: function (type, callback) {
            if (!ready() || active) { callback(false); return; }
            if (type === 'reward') {
                if (rewardOffer) rewardOffer(callback); else callback(false);
                return;
            }
            if (cancelReward) cancelReward(false);
            var finished = false, shown = false;
            function finish(value) {
                if (finished) return; finished = true; active = null; callback(value);
            }
            active = finish;
            try { window.adBreak({ type: 'next', name: 'between_rounds',
                beforeAd: function () { shown = true; }, afterAd: function () {},
                adBreakDone: function () { finish(shown); }
            }); } catch (_) { finish(false); }
        },
        banner: function (x, y, width, height, owner) {
            if (owner < newestBannerOwner) return;
            newestBannerOwner = owner;
            if (banner && bannerOwner !== owner) removeBanner();
            if (!ready() || !/^\d+$/.test(config.bannerSlot || '') || width < 1) { removeBanner(); return; }
            if (!banner) {
                bannerOwner = owner;
                banner = document.createElement('ins'); banner.className = 'adsbygoogle';
                banner.setAttribute('data-ad-client', config.client); banner.setAttribute('data-ad-slot', config.bannerSlot);
                if (config.adtest === true) banner.setAttribute('data-adtest', 'on');
                document.body.appendChild(banner);
                banner.style.cssText = 'position:fixed;display:block;z-index:1;';
                banner.style.width = width + 'px'; banner.style.height = '50px';
                banner.style.visibility = 'hidden';
                try { window.adsbygoogle.push({}); } catch (_) { removeBanner(); return; }
            }
            banner.style.left = x + 'px'; banner.style.top = y + 'px';
            banner.style.visibility = height >= 50 ? 'visible' : 'hidden';
        },
        bannerFilled: function (owner) { return !!banner && bannerOwner === owner && banner.getAttribute('data-ad-status') === 'filled'; },
        hideBanner: function (owner) { if (bannerOwner === owner) removeBanner(); }
    };
}());
