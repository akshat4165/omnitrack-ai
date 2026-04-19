// Intercept Claude's native SSE API
let originalFetch = window.fetch;
window.fetch = async function(...args) {
  const response = await originalFetch.apply(this, args);

  if (args[0].includes('/api/stream') || args[0].includes('/api/organizations/')) {
    const clone = response.clone();
    const reader = clone.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.includes('message_limit') || line.includes('"remaining"')) {
          try {
            const json = JSON.parse(line.replace(/^data: /, ''));
            if (json.type === 'message_limit' || json.remaining !== undefined) {
              chrome.runtime.sendMessage({
                type: 'usage_update',
                platform: 'claude',
                data: {
                  remaining: json.remaining,
                  total: json.total,
                  resetAt: json.reset_at,
                  tier: detectTier(json.total)
                }
              });
            }
          } catch (e) {}
        }
      }
    }
  }
  return response;
};

function detectTier(total) {
  if (total >= 800) return 'max20x';
  if (total >= 200) return 'max5x';
  return 'pro';
}

// Backup: Parse from page if API fails
setInterval(() => {
  const indicator = document.querySelector('[data-testid="usage-indicator"]');
  if (indicator) {
    const text = indicator.textContent;
    const match = text.match(/(\d+)\s*\/\s*(\d+)/);
    if (match) {
      chrome.runtime.sendMessage({
        type: 'usage_update',
        platform: 'claude',
        data: {
          remaining: parseInt(match[1]),
          total: parseInt(match[2])
        }
      });
    }
  }
}, 5000);
