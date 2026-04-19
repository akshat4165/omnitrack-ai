let requestCount = 0;

// ─── Gemini resets at midnight PT ────────────────────────────────────────────
function getNextReset() {
  const now = new Date();
  const pt = new Date(now.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }));
  const midnight = new Date(pt);
  midnight.setHours(24, 0, 0, 0);
  return midnight.getTime() - (pt.getTime() - now.getTime());
}

function detectModel() {
  // Gemini shows the model name in the URL or a model-picker button
  const url = window.location.href;
  const modelText = (
    document.querySelector('[data-model-id]')?.dataset.modelId ||
    document.querySelector('[aria-label*="model" i]')?.textContent ||
    ''
  ).toLowerCase();
  if (url.includes('flash-lite') || modelText.includes('flash-lite')) return 'flash-lite';
  if (url.includes('flash') || modelText.includes('flash')) return 'flash';
  return 'pro';
}

function estimateRPM() {
  const now = Date.now();
  window._omniRecentRequests = (window._omniRecentRequests || []).filter(t => now - t < 60000);
  window._omniRecentRequests.push(now);
  return window._omniRecentRequests.length;
}

function sendUsage() {
  requestCount++;
  chrome.runtime.sendMessage({
    type: 'usage_update',
    platform: 'gemini',
    data: {
      used: requestCount,
      model: detectModel(),
      resetAt: getNextReset(),
      rpm: estimateRPM()
    }
  });
}

// ─── PRIMARY: Intercept fetch to detect real API calls ─────────────────────
const _originalFetch = window.fetch;
window.fetch = async function (...args) {
  const url = typeof args[0] === 'string' ? args[0] : args[0]?.url || '';
  // Gemini's generate / stream endpoints
  if (
    url.includes('generativelanguage.googleapis.com') ||
    url.includes('/api/generate') ||
    url.includes('gemini.google.com/_/BardChatUi') ||
    url.includes('alkalimakersuite') ||
    (url.includes('google.com') && (url.includes('streamGenerate') || url.includes('generateContent')))
  ) {
    sendUsage();
  }
  return _originalFetch.apply(this, args);
};

// ─── FALLBACK 1: Send-button click detection ───────────────────────────────
const SEND_BUTTON_SELECTORS = [
  'button[aria-label="Send message"]',
  'button[aria-label="Submit"]',
  'button[data-test-id="send-button"]',
  'button.send-button',
  'button[jsname]',      // Gemini uses jsname attributes
  'mat-icon[fonticon="send"]',
];

function attachSendButtonListeners() {
  SEND_BUTTON_SELECTORS.forEach(sel => {
    document.querySelectorAll(sel).forEach(btn => {
      if (!btn._omnitracked) {
        btn._omnitracked = true;
        btn.addEventListener('click', sendUsage);
        btn.addEventListener('mousedown', sendUsage);
      }
    });
  });
}

// ─── FALLBACK 2: Keydown on any text input (Enter = send) ──────────────────
function attachInputListeners() {
  const inputs = document.querySelectorAll(
    'textarea, [contenteditable="true"], rich-textarea, [role="textbox"]'
  );
  inputs.forEach(input => {
    if (!input._omnitracked) {
      input._omnitracked = true;
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          // small delay so we don't double-count with fetch intercept
          setTimeout(() => {}, 0);
        }
      });
    }
  });
}

// ─── Watch for DOM changes (Gemini is a SPA) ────────────────────────────────
const observer = new MutationObserver(() => {
  attachSendButtonListeners();
  attachInputListeners();
});

observer.observe(document.body, { childList: true, subtree: true });

// Run immediately in case DOM is already loaded
attachSendButtonListeners();
attachInputListeners();
