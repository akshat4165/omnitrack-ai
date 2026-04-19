const PLATFORM_CONFIG = {
  claude: { name: 'Claude', color: '#cc785c', limits: { pro: 45, max5x: 225, max20x: 900 } },
  chatgpt: { name: 'ChatGPT', color: '#10a37f', limits: { gpt54: 40, gpt52: 40 } },
  gemini: { name: 'Gemini', color: '#4285f4', limits: { pro: 100, flash: 250, flashlite: 1000 } }
};

function render() {
  chrome.runtime.sendMessage({ type: 'get_usage' }, (data) => {
    const container = document.getElementById('content');
    if (!data || Object.keys(data).length === 0) {
      container.innerHTML = '<div class="empty">Open Claude, ChatGPT, or Gemini to start tracking</div>';
      return;
    }

    container.innerHTML = Object.entries(data).map(([platform, usage]) => {
      const config = PLATFORM_CONFIG[platform];
      const pct = calculatePercentage(platform, usage);
      const status = pct > 90 ? 'danger' : pct > 70 ? 'warning' : '';
      const predictive = calculatePredictive(platform, usage);

      return `
        <div class="platform">
          <div class="platform-header">
            <div class="platform-name">
              <span class="status-dot ${status}"></span>
              ${config.name}
            </div>
            <div class="percentage">${Math.round(pct)}%</div>
          </div>
          <div class="bar-container">
            <div class="bar-fill" style="width: ${Math.min(pct, 100)}%"></div>
          </div>
          <div class="stats">
            <span>${formatUsage(platform, usage)}</span>
            <span>${formatTime(usage.windowEnd || usage.resetAt)}</span>
          </div>
          ${predictive ? `<div class="predictive">${predictive}</div>` : ''}
        </div>
      `;
    }).join('');
  });
}

function calculatePercentage(platform, data) {
  const limits = PLATFORM_CONFIG[platform].limits;
  let limit = limits.pro;
  if (data.tier && limits[data.tier]) limit = limits[data.tier];
  if (data.model && limits[data.model]) limit = limits[data.model];

  const used = data.total ? (data.total - data.remaining) : data.used;
  return Math.min((used / limit) * 100, 100);
}

function formatUsage(platform, data) {
  if (platform === 'claude') {
    return `${data.remaining}/${data.total} left`;
  }
  if (platform === 'chatgpt') {
    return `~${data.used}/40 sent`;
  }
  return `${data.used}/${PLATFORM_CONFIG[platform].limits[data.model || 'pro']} today`;
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
  const remaining = data.remaining || (PLATFORM_CONFIG[platform].limits.pro - data.used);
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
