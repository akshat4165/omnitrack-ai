// Isolated world — bridges postMessage from gemini-main.js → chrome.runtime
let requestCount = 0;

window.addEventListener('message', (event) => {
  if (event.source !== window) return;
  if (!event.data || event.data.source !== 'omnitrack-gemini') return;

  requestCount++;

  // chrome.runtime can be undefined when the MV3 service worker is sleeping
  try {
    if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
      chrome.runtime.sendMessage({
        type: 'usage_update',
        platform: 'gemini',
        data: {
          used: requestCount,
          model: event.data.model || 'pro',
          resetAt: event.data.resetAt,
          rpm: event.data.rpm || 1
        }
      }, () => void chrome.runtime.lastError);
    }
  } catch (e) {
    // Extension context invalidated — retry once after a short delay
    setTimeout(() => {
      try {
        chrome.runtime.sendMessage({
          type: 'usage_update',
          platform: 'gemini',
          data: { used: requestCount, model: event.data.model || 'pro', resetAt: event.data.resetAt, rpm: event.data.rpm || 1 }
        }, () => void chrome.runtime.lastError);
      } catch (_) {}
    }, 500);
  }
});
