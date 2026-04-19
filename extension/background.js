const PLATFORMS = {
  claude: { name: 'Claude', limits: { pro: 45, max5x: 225, max20x: 900 }, window: 5 * 60 * 60 * 1000 },
  chatgpt: { name: 'ChatGPT', limits: { gpt54: 40, gpt52: 40 }, window: 3 * 60 * 60 * 1000 },
  gemini: { name: 'Gemini', limits: { pro: 100, flash: 250, flashlite: 1000 }, window: 24 * 60 * 60 * 1000 }
};

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'usage_update') {
    updateUsage(request.platform, request.data);
  }
  if (request.type === 'get_usage') {
    getAllUsage().then(sendResponse);
    return true;
  }
});

async function updateUsage(platform, data) {
  const key = `usage_${platform}`;
  const existing = await chrome.storage.local.get([key]);
  const record = {
    ...data,
    timestamp: Date.now(),
    history: [...(existing[key]?.history || []), { ...data, timestamp: Date.now() }].slice(-50)
  };
  await chrome.storage.local.set({ [key]: record });

  // Predictive alert
  const pct = calculatePercentage(platform, record);
  if (pct > 80) {
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon48.png',
      title: `${PLATFORMS[platform].name} Limit Warning`,
      message: `${Math.round(pct)}% used. Slow down or switch models.`
    });
  }
}

function calculatePercentage(platform, data) {
  const limits = PLATFORMS[platform].limits;
  let limit = limits.pro;
  if (data.tier === 'max5x') limit = limits.max5x;
  if (data.tier === 'max20x') limit = limits.max20x;
  if (data.model?.includes('flash-lite')) limit = limits.flashlite;
  if (data.model?.includes('flash')) limit = limits.flash;

  const used = data.total ? (data.total - data.remaining) : data.used;
  return (used / limit) * 100;
}

async function getAllUsage() {
  const keys = Object.keys(PLATFORMS).map(p => `usage_${p}`);
  const data = await chrome.storage.local.get(keys);
  return Object.fromEntries(
    Object.entries(data).map(([k, v]) => [k.replace('usage_', ''), v])
  );
}

// Auto-cleanup old data
chrome.alarms.create('cleanup', { periodInMinutes: 60 });
chrome.alarms.onAlarm.addListener(() => {
  const cutoff = Date.now() - (7 * 24 * 60 * 60 * 1000);
  chrome.storage.local.get(null, (items) => {
    Object.keys(items).forEach(key => {
      if (items[key].timestamp < cutoff) {
        chrome.storage.local.remove(key);
      }
    });
  });
});
