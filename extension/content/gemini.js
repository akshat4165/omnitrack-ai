let requestCount = 0;
let lastReset = Date.now();

// Gemini resets at midnight PT
function getNextReset() {
  const now = new Date();
  const pt = new Date(now.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }));
  const midnight = new Date(pt);
  midnight.setHours(24, 0, 0, 0);
  return midnight.getTime() - (pt.getTime() - now.getTime());
}

const observer = new MutationObserver(() => {
  const inputs = document.querySelectorAll('textarea, [contenteditable="true"]');
  inputs.forEach(input => {
    if (!input._omnitracked) {
      input._omnitracked = true;
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          requestCount++;
          const model = detectModel();

          chrome.runtime.sendMessage({
            type: 'usage_update',
            platform: 'gemini',
            data: {
              used: requestCount,
              model: model,
              resetAt: getNextReset(),
              rpm: estimateRPM()
            }
          });
        }
      });
    }
  });
});

function detectModel() {
  const url = window.location.href;
  if (url.includes('flash-lite')) return 'flash-lite';
  if (url.includes('flash')) return 'flash';
  return 'pro';
}

function estimateRPM() {
  // Track last minute requests
  const now = Date.now();
  window._recentRequests = (window._recentRequests || []).filter(t => now - t < 60000);
  window._recentRequests.push(now);
  return window._recentRequests.length;
}

observer.observe(document.body, { childList: true, subtree: true });
