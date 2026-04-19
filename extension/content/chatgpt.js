let messageCount = 0;
let windowStart = null;
let modelType = 'gpt54';
let lastSentCount = 0;

const observer = new MutationObserver((mutations) => {
  const userMessages = document.querySelectorAll('[data-message-author-role="user"]').length;

  // Multiple fallback selectors for model badge (ChatGPT updates DOM frequently)
  const modelBadge = (
    document.querySelector('[data-testid="model-switcher-dropdown-button"]')?.textContent ||
    document.querySelector('[data-testid="model-selector"]')?.textContent ||
    document.querySelector('button[aria-haspopup="listbox"]')?.textContent ||
    document.querySelector('#model-selector')?.textContent ||
    ''
  );

  if (modelBadge.toLowerCase().includes('5.4') || modelBadge.toLowerCase().includes('gpt-4o')) modelType = 'gpt54';
  if (modelBadge.toLowerCase().includes('5.2') || modelBadge.toLowerCase().includes('gpt-4')) modelType = 'gpt52';

  if (userMessages !== messageCount) {
    messageCount = userMessages;
    if (!windowStart) windowStart = Date.now();

    // Check for limit warning in DOM
    const warning = document.querySelector('[class*="limit"], [class*="warning"]');
    const isNearLimit = !!warning;

    chrome.runtime.sendMessage({
      type: 'usage_update',
      platform: 'chatgpt',
      data: {
        used: messageCount,
        model: modelType,
        windowStart: windowStart,
        windowEnd: windowStart + (3 * 60 * 60 * 1000),
        warning: isNearLimit
      }
    });
  }
});

observer.observe(document.body, { childList: true, subtree: true });

// Capture rate limit errors
window.addEventListener('error', (e) => {
  if (e.message?.includes('rate limit') || e.message?.includes('429')) {
    chrome.runtime.sendMessage({
      type: 'usage_update',
      platform: 'chatgpt',
      data: { hitLimit: true, timestamp: Date.now() }
    });
  }
});
