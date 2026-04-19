// Isolated world — bridges postMessage from gemini-main.js → chrome.storage
// Writes directly to storage (no service worker needed, MV3 safe)
let requestCount = 0;

window.addEventListener('message', (event) => {
  if (event.source !== window) return;
  if (!event.data || event.data.source !== 'omnitrack-gemini') return;

  requestCount++;

  const payload = {
    used: requestCount,
    model: event.data.model || 'pro',
    resetAt: event.data.resetAt || 0,
    rpm: event.data.rpm || 1
  };

  // Write directly to storage — works even when service worker is sleeping
  try {
    chrome.storage.local.get(['usage_gemini'], (result) => {
      if (chrome.runtime.lastError) return;
      const prev = result['usage_gemini'] || {};
      const entry = { ...payload, timestamp: Date.now() };
      const record = {
        ...entry,
        history: [...(prev.history || []), entry].slice(-50)
      };
      chrome.storage.local.set({ usage_gemini: record });
    });
  } catch (_) {}
});
