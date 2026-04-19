async function loadData() {
  const data = await chrome.storage.local.get(null);
  const usage = {};
  Object.keys(data).forEach(key => {
    if (key.startsWith('usage_')) {
      usage[key.replace('usage_', '')] = data[key];
    }
  });
  return usage;
}

function renderDashboard(data) {
  let total = 0;
  let platformCounts = {};
  let limitsHit = 0;

  Object.entries(data).forEach(([platform, usage]) => {
    const used = usage.total ? (usage.total - usage.remaining) : (usage.used || 0);
    total += used;
    platformCounts[platform] = used;
    if (usage.warning || usage.hitLimit) limitsHit++;
  });

  document.getElementById('totalRequests').textContent = total;
  document.getElementById('limitsHit').textContent = limitsHit;

  const topPlatform = Object.entries(platformCounts).sort((a, b) => b[1] - a[1])[0];
  if (topPlatform) {
    document.getElementById('topPlatform').textContent = topPlatform[0].toUpperCase();
    document.getElementById('topPlatformPct').textContent =
      total > 0 ? `${Math.round((topPlatform[1] / total) * 100)}% of total` : '0% of total';
  }

  // Chart
  const ctx = document.getElementById('trendChart').getContext('2d');
  new Chart(ctx, {
    type: 'line',
    data: {
      labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      datasets: Object.entries(data).map(([platform, usage]) => ({
        label: platform.charAt(0).toUpperCase() + platform.slice(1),
        data: (usage.history || []).slice(-7).map(h => h.used || (h.total - h.remaining) || 0),
        borderColor: platform === 'claude' ? '#cc785c' : platform === 'chatgpt' ? '#10a37f' : '#4285f4',
        backgroundColor: platform === 'claude' ? 'rgba(204,120,92,0.1)' : platform === 'chatgpt' ? 'rgba(16,163,127,0.1)' : 'rgba(66,133,244,0.1)',
        fill: true,
        tension: 0.4
      }))
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { labels: { color: '#fff' } } },
      scales: {
        x: { ticks: { color: '#888' }, grid: { color: '#2a2a2a' } },
        y: { ticks: { color: '#888' }, grid: { color: '#2a2a2a' } }
      }
    }
  });
}

function exportData() {
  loadData().then(data => {
    const rows = ['Platform,Used,Timestamp'];
    Object.entries(data).forEach(([p, u]) => {
      const used = u.used !== undefined ? u.used : (u.total - u.remaining);
      rows.push(`${p},${used},${new Date(u.timestamp).toISOString()}`);
    });
    const csv = rows.join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    chrome.downloads.download({ url, filename: 'omnitrack-export.csv' });
  });
}

loadData().then(renderDashboard);
