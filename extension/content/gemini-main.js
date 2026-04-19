// MAIN world — only intercepts specific Gemini chat generation endpoints
// NOTE: batchexecute is intentionally excluded — it fires for ALL Google RPCs
(function () {
  'use strict';

  // Debounce: max 1 event per 5 seconds
  let _lastTracked = 0;
  function postTrackingMessage(via) {
    const now = Date.now();
    if (now - _lastTracked < 5000) return;
    _lastTracked = now;

    const loc = window.location.href;
    let model = detectModel();

    const pt = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }));
    const midnight = new Date(pt);
    midnight.setHours(24, 0, 0, 0);
    const resetAt = midnight.getTime() + (Date.now() - pt.getTime());

    window._omniRPM = (window._omniRPM || []).filter(t => Date.now() - t < 60000);
    window._omniRPM.push(Date.now());

    window.postMessage({ source: 'omnitrack-gemini', model, resetAt, rpm: window._omniRPM.length, via }, '*');
  }

  function detectModel() {
    // Check URL first
    const url = window.location.href;
    if (url.includes('flash-lite')) return 'flash-lite';
    if (url.includes('flash')) return 'flash';
    // Check page for Pro/Advanced indicator
    const pageText = document.body?.innerText || '';
    if (pageText.includes('Advanced') || pageText.includes('2.0 Pro') || pageText.includes('1.5 Pro')) return 'advanced';
    return 'pro';
  }

  // ONLY very specific Gemini chat endpoints — NOT batchexecute
  function isGeminiChatRequest(url, method) {
    if (!method || method.toUpperCase() !== 'POST') return false;
    return (
      url.includes('StreamGenerate') ||
      url.includes('streamGenerate') ||
      url.includes('BardFrontendService') ||
      url.includes('GenerateContent') ||
      url.includes('generateContent') ||
      url.includes('alkalimakersuite-pa')
    );
  }

  const _origFetch = window.fetch;
  window.fetch = function (...args) {
    try {
      const req = args[0];
      const url = typeof req === 'string' ? req : (req?.url || '');
      const method = args[1]?.method || req?.method || 'GET';
      if (isGeminiChatRequest(url, method)) postTrackingMessage('fetch');
    } catch (_) {}
    return _origFetch.apply(this, args);
  };

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
