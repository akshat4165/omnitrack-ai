// MAIN world — intercepts Gemini chat API calls
(function () {
  'use strict';

  // Debounce: max 1 event per 3 seconds to prevent double-counting
  let _lastTracked = 0;
  function shouldTrack() {
    const now = Date.now();
    if (now - _lastTracked < 3000) return false;
    _lastTracked = now;
    return true;
  }

  function postTrackingMessage(via) {
    if (!shouldTrack()) return;

    const loc = window.location.href;
    let model = 'pro';
    if (loc.includes('flash-lite')) model = 'flash-lite';
    else if (loc.includes('flash')) model = 'flash';

    const pt = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }));
    const midnight = new Date(pt);
    midnight.setHours(24, 0, 0, 0);
    const resetAt = midnight.getTime() + (Date.now() - pt.getTime());

    window._omniRPM = (window._omniRPM || []).filter(t => Date.now() - t < 60000);
    window._omniRPM.push(Date.now());

    window.postMessage({
      source: 'omnitrack-gemini',
      model, resetAt,
      rpm: window._omniRPM.length,
      via
    }, '*');
  }

  // ── URL patterns — Gemini uses batchexecute for its RPC calls ────────────
  function isGeminiChatRequest(url, method) {
    if (!method || method.toUpperCase() !== 'POST') return false;
    return (
      url.includes('batchexecute') ||          // Gemini's main RPC endpoint
      url.includes('StreamGenerate') ||
      url.includes('streamGenerate') ||
      url.includes('BardFrontendService') ||
      url.includes('GenerateContent') ||
      url.includes('generateContent') ||
      url.includes('alkalimakersuite-pa') ||
      url.includes('lamda') ||
      (url.includes('gemini.google.com') && url.includes('/_/'))
    );
  }

  // ── Intercept fetch ───────────────────────────────────────────────────────
  const _origFetch = window.fetch;
  window.fetch = function (...args) {
    try {
      const req = args[0];
      const url = typeof req === 'string' ? req : (req?.url || '');
      const method = args[1]?.method || req?.method || 'GET';
      if (isGeminiChatRequest(url, method)) postTrackingMessage('fetch:' + url.split('/').pop().split('?')[0]);
    } catch (_) {}
    return _origFetch.apply(this, args);
  };

  // ── Intercept XHR ─────────────────────────────────────────────────────────
  const _origOpen = XMLHttpRequest.prototype.open;
  const _origSend = XMLHttpRequest.prototype.send;

  XMLHttpRequest.prototype.open = function (method, url) {
    this._omniMethod = method || 'GET';
    this._omniUrl = url || '';
    return _origOpen.apply(this, arguments);
  };

  XMLHttpRequest.prototype.send = function (body) {
    try {
      if (body && isGeminiChatRequest(this._omniUrl, this._omniMethod)) {
        postTrackingMessage('xhr');
      }
    } catch (_) {}
    return _origSend.apply(this, arguments);
  };

})();
