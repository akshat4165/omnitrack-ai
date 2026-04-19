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

function saveUsage(model, resetAt) {
  if (!initialized) return;
  try {
    chrome.storage.local.get(['usage_gemini'], (result) => {
      if (chrome?.runtime?.lastError) return;
      const prev = result?.['usage_gemini'] || {};
      const entry = { used: requestCount, model: model || 'pro', resetAt: resetAt || 0, timestamp: Date.now() };
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
  saveUsage(event.data.model, event.data.resetAt);
});

// ── DOM fallback: watch for new Gemini response elements ──────────────────
// Covers cases where fetch/XHR interception misses (SPA navigation, etc.)
const RESPONSE_SELECTORS = [
  'model-response',
  '[class*="model-response"]',
  '[class*="response-container"]',
  'message-content',
  '[data-response-index]',
  '[class*="BotMessage"]',
  '[class*="assistant-message"]',
].join(', ');

let domBaseCount = 0;
let lastFetchCount = 0;

function startDOMObserver() {
  // Count existing responses so we don't double-count on load
  try {
    domBaseCount = document.querySelectorAll(RESPONSE_SELECTORS).length;
  } catch(_) {}

  const observer = new MutationObserver(() => {
    try {
      const current = document.querySelectorAll(RESPONSE_SELECTORS).length;
      if (current > domBaseCount) {
        const newOnes = current - domBaseCount;
        domBaseCount = current;

        // Wait 3s — if fetch interception already counted it, skip
        const fetchCountNow = requestCount;
        setTimeout(() => {
          if (requestCount === fetchCountNow) {
            // Fetch missed it — use DOM count
            for (let i = 0; i < newOnes; i++) requestCount++;
            saveUsage('pro', 0);
          }
        }, 3000);
      }
    } catch(_) {}
  });

  try {
    observer.observe(document.body, { childList: true, subtree: true });
  } catch(_) {}
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', startDOMObserver);
} else {
  startDOMObserver();
}
