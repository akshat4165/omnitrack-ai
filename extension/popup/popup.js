const PLATFORM_CONFIG = {
  claude:   { name: 'Claude',   color: '#cc785c', icon: '🟠', limits: { pro: 45, max5x: 225, max20x: 900 } },
  chatgpt:  { name: 'ChatGPT',  color: '#10a37f', icon: '🟢', limits: { gpt54: 40, gpt52: 40 } },
  gemini:   { name: 'Gemini',   color: '#4285f4', icon: '🔵', limits: { pro: 100, flash: 500, 'flash-lite': 1500, advanced: 1000 } }
};

// Always render all 3 platforms — merge stored data with empty defaults
function render() {
  chrome.runtime.sendMessage({ type: 'get_usage' }, (data) => {
    if (chrome.runtime.lastError) return; // extension context invalidated

    const container = document.getElementById('content');
    const stored = data || {};

    const platforms = Object.entries(PLATFORM_CONFIG).map(([id, config]) => {
      const usage = stored[id] || null;
      const pct = usage ? calculatePercentage(id, usage) : 0;
      const status = pct > 90 ? 'danger' : pct > 70 ? 'warning' : '';
      const predictive = usage ? calculatePredictive(id, usage) : null;
      const active = !!usage;

      return `
        <div class="platform ${active ? '' : 'inactive'}">
          <div class="platform-header">
            <div class="platform-name">
              <span class="status-dot ${status} ${active ? '' : 'idle'}"></span>
              ${config.name}
            </div>
            <div class="percentage">${active ? Math.round(pct) + '%' : '—'}</div>
          </div>
          <div class="bar-container">
            <div class="bar-fill" style="width: ${Math.min(pct, 100)}%"></div>
          </div>
          <div class="stats">
            <span>${active ? formatUsage(id, usage) : 'No data yet'}</span>
            <span>${active ? formatTime(usage.windowEnd || usage.resetAt) : ''}</span>
          </div>
          ${predictive ? `<div class="predictive">${predictive}</div>` : ''}
        </div>
      `;
    });

    container.innerHTML = platforms.join('');
  });
}

function calculatePercentage(platform, data) {
  const limits = PLATFORM_CONFIG[platform].limits;
  let limit = limits.pro;
  if (data.tier && limits[data.tier]) limit = limits[data.tier];
  if (data.model && limits[data.model]) limit = limits[data.model];

  const used = data.total ? (data.total - data.remaining) : (data.used || 0);
  return Math.min((used / limit) * 100, 100);
}

function formatUsage(platform, data) {
  if (platform === 'claude') {
    if (data.remaining == null) return 'Tracking…';
    return `${data.remaining} / ${data.total} left`;
  }
  if (platform === 'chatgpt') {
    return `${data.used || 0} / 40 sent`;
  }
  const model = data.model || 'pro';
  const limit = PLATFORM_CONFIG.gemini.limits[model] || PLATFORM_CONFIG.gemini.limits.pro;
  return `${data.used || 0} / ${limit} today`;
}

function formatTime(timestamp) {
  if (!timestamp) return '';
  const mins = Math.floor((timestamp - Date.now()) / 60000);
  if (mins < 0) return 'Reset due';
  if (mins < 60) return `${mins}m reset`;
  if (mins < 1440) return `${Math.floor(mins / 60)}h reset`;
  return `${Math.floor(mins / 1440)}d reset`;
}

function calculatePredictive(platform, data) {
  if (!data.history || data.history.length < 3) return null;
  const recent = data.history.slice(-5);
  const avgInterval = (recent[recent.length - 1].timestamp - recent[0].timestamp) / recent.length;
  const remaining = data.remaining != null
    ? data.remaining
    : (PLATFORM_CONFIG[platform].limits.pro - (data.used || 0));
  const timeToEmpty = (remaining * avgInterval) / 60000;

  if (timeToEmpty < 30) return `⚠️ ${Math.round(timeToEmpty)}min until limit at current pace`;
  if (timeToEmpty < 120) return `⏱️ ${Math.round(timeToEmpty)}min remaining`;
  return null;
}

document.getElementById('dashboardBtn').addEventListener('click', () => {
  chrome.tabs.create({ url: chrome.runtime.getURL('dashboard/index.html') });
});

render();
setInterval(render, 5000);
