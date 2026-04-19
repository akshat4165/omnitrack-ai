// Isolated world — bridges postMessage from gemini-main.js → chrome.runtime
let requestCount = 0;

window.addEventListener('message', (event) => {
  if (event.source !== window) return;
  if (!event.data || event.data.source !== 'omnitrack-gemini') return;

  requestCount++;
  chrome.runtime.sendMessage({
    type: 'usage_update',
    platform: 'gemini',
    data: {
      used: requestCount,
      model: event.data.model,
      resetAt: event.data.resetAt,
      rpm: event.data.rpm
    }
  });
});
