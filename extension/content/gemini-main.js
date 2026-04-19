// Runs in PAGE's MAIN world — intercepts real fetch + XHR
// Uses postMessage to communicate with the isolated-world gemini.js
(function () {
  'use strict';

  // ── Debounce: 1 tracking event per 2 seconds max ──────────────────────────
  let _lastTracked = 0;
  function triggerTracking(source) {
    const now = Date.now();
    if (now - _lastTracked < 2000) return;
    _lastTracked = now;

    const loc = window.location.href;
    let model = 'pro';
    if (loc.includes('flash-lite')) model = 'flash-lite';
    else if (loc.includes('flash')) model = 'flash';

    const pt = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }));
    const midnight = new Date(pt); midnight.setHours(24, 0, 0, 0);
    const resetAt = midnight.getTime() + (Date.now() - pt.getTime());

    window._omniRPM = (window._omniRPM || []).filter(t => Date.now() - t < 60000);
    window._omniRPM.push(Date.now());

    window.postMessage({
      source: 'omnitrack-gemini',
      model,
      resetAt,
      rpm: window._omniRPM.length,
      via: source
    }, '*');
  }

  // ── 1. Intercept fetch (POST to any google.com endpoint) ─────────────────
  const _origFetch = window.fetch;
  window.fetch = async function (...args) {
    try {
      const req = args[0];
      const url = typeof req === 'string' ? req : (req?.url || '');
      const method = (args[1]?.method || req?.method || 'GET').toUpperCase();
      if (method === 'POST' && (url.includes('google.com') || url.includes('googleapis.com'))) {
        triggerTracking('fetch');
      }
    } catch (_) {}
    return _origFetch.apply(this, args);
  };

  // ── 2. Intercept XHR (Gemini may use XHR for streaming) ──────────────────
  const _origOpen = XMLHttpRequest.prototype.open;
  const _origSend = XMLHttpRequest.prototype.send;

  XMLHttpRequest.prototype.open = function (method, url) {
    this._omniMethod = method ? method.toUpperCase() : 'GET';
    this._omniUrl = url || '';
    return _origOpen.apply(this, arguments);
  };

  XMLHttpRequest.prototype.send = function (body) {
    try {
      if (
        this._omniMethod === 'POST' &&
        body &&
        (this._omniUrl.includes('google.com') || this._omniUrl.includes('googleapis.com'))
      ) {
        triggerTracking('xhr');
      }
    } catch (_) {}
    return _origSend.apply(this, arguments);
  };

  // ── 3. DOM observation fallback — watch for new model responses ───────────
  const RESPONSE_SELECTORS = [
    'model-response',
    '.model-response-text',
    'response-container',
    '[data-response-index]',
    'message-content[class*="model"]',
    '.BNeawe',            // older Bard classes
  ].join(', ');

  let _lastResponseCount = 0;
  const domObserver = new MutationObserver(() => {
    const responses = document.querySelectorAll(RESPONSE_SELECTORS);
    if (responses.length > _lastResponseCount) {
      _lastResponseCount = responses.length;
      triggerTracking('dom');
    }
  });

  // Start DOM observer once body is ready
  if (document.body) {
    domObserver.observe(document.body, { childList: true, subtree: true });
  } else {
    document.addEventListener('DOMContentLoaded', () => {
      domObserver.observe(document.body, { childList: true, subtree: true });
    });
  }

})();
