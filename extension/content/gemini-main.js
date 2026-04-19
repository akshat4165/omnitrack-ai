// Runs in the PAGE's main world — can intercept the real window.fetch
// Communicates back to the isolated-world content script via postMessage

(function () {
  const _originalFetch = window.fetch;

  window.fetch = async function (...args) {
    const url = typeof args[0] === 'string'
      ? args[0]
      : (args[0]?.url || '');

    // Gemini's streaming generate endpoints
    const isGeminiAPI =
      url.includes('StreamGenerate') ||
      url.includes('streamGenerate') ||
      url.includes('GenerateContent') ||
      url.includes('generateContent') ||
      url.includes('batchExecute') ||
      url.includes('BardFrontendService') ||
      url.includes('alkalimakersuite') ||
      url.includes('generativelanguage.googleapis.com') ||
      (url.includes('google.com') && url.includes('/_/'));

    if (isGeminiAPI) {
      // Detect model from URL or page
      let model = 'pro';
      const loc = window.location.href;
      if (loc.includes('flash-lite') || url.includes('flash-lite')) model = 'flash-lite';
      else if (loc.includes('flash') || url.includes('flash')) model = 'flash';

      // Midnight PT reset
      const now = new Date();
      const pt = new Date(now.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }));
      const midnight = new Date(pt);
      midnight.setHours(24, 0, 0, 0);
      const resetAt = midnight.getTime() - (pt.getTime() - now.getTime());

      // RPM estimation
      window._omniRPM = (window._omniRPM || []).filter(t => Date.now() - t < 60000);
      window._omniRPM.push(Date.now());

      window.postMessage({
        source: 'omnitrack-gemini',
        model,
        resetAt,
        rpm: window._omniRPM.length
      }, '*');
    }

    return _originalFetch.apply(this, args);
  };
})();
