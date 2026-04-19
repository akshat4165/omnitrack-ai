// Isolated world — reads stored count on init, increments on each tracked request
let requestCount = 0;
let initialized = false;

// ── Init: load existing count from storage so refresh doesn't reset to 0 ───
try {
  chrome.storage.local.get(['usage_gemini'], (result) => {
    if (chrome?.runtime?.lastError) return;
    requestCount = result?.usage_gemini?.used || 0;
    initialized = true;
  });
} catch (_) { initialized = true; }

function saveUsage(model, resetAt, rpm) {
  if (!initialized) return;
  try {
    chrome.storage.local.get(['usage_gemini'], (result) => {
      if (chrome?.runtime?.lastError) return;
      const prev = result?.['usage_gemini'] || {};
      const entry = { used: requestCount, model, resetAt, timestamp: Date.now() };
      chrome.storage.local.set({
        usage_gemini: {
          ...entry,
          history: [...(prev.history || []), entry].slice(-50)
        }
      });
    });
  } catch (_) {}
}

// ── Bridge: receive messages from gemini-main.js (MAIN world) ──────────────
window.addEventListener('message', (event) => {
  if (event.source !== window) return;
  if (!event.data || event.data.source !== 'omnitrack-gemini') return;

  requestCount++;
  saveUsage(event.data.model || 'pro', event.data.resetAt || 0, event.data.rpm || 1);
});

// ── DOM fallback: watch for new model-response elements ────────────────────
let domBaseCount = 0;

function startDOMObserver() {
  domBaseCount = document.querySelectorAll('model-response').length;

  const observer = new MutationObserver(() => {
    const current = document.querySelectorAll('model-response').length;
    if (current > domBaseCount) {
      const newOnes = current - domBaseCount;
      domBaseCount = current;
      const countBefore = requestCount;
      setTimeout(() => {
        if (requestCount === countBefore) {
          for (let i = 0; i < newOnes; i++) requestCount++;
          saveUsage('pro', 0, 1);
        }
      }, 2000);
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', startDOMObserver);
} else {
  startDOMObserver();
}
