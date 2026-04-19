# OmniTrack AI

> Unified usage tracker for Claude, ChatGPT, and Gemini. Predictive analytics, cross-platform dashboard, zero external dependencies.

![License](https://img.shields.io/badge/license-MIT-green)
![Manifest](https://img.shields.io/badge/manifest-v3-blue)
![Platforms](https://img.shields.io/badge/platforms-Claude%20%7C%20ChatGPT%20%7C%20Gemini-purple)

## Install

1. **Download** — Clone this repo or download the latest [release](../../releases)
2. **Load in Chrome/Edge** — Go to `chrome://extensions` → Enable **Developer mode** → Click **Load unpacked** → Select the `extension/` folder
3. **Start tracking** — Open Claude, ChatGPT, or Gemini → Click the extension icon

## Features

- ⚡ **Real-time tracking** — Native API interception (Claude), DOM observation (ChatGPT/Gemini)
- 🔮 **Predictive alerts** — "30 min until limit at current pace"
- 📊 **Unified dashboard** — 7-day trends, usage charts, CSV export
- 🔒 **Privacy-first** — No cloud, all data stays in local storage
- 🔔 **Smart notifications** — Alerts when you hit 80%+ of your limit

## Limits Tracked

| Platform | Free | Pro/Business | Max/Enterprise |
|----------|------|--------------|----------------|
| Claude   | —    | 45 / 5hr     | 225–900 / 5hr  |
| ChatGPT  | —    | Unlimited base | 40 / 3hr (GPT-5.4 / 5.2) |
| Gemini   | 100–1000 / day | 10–50× higher | Custom |

## File Structure

```
omnitrack/
├── extension/
│   ├── manifest.json        # Chrome extension manifest v3
│   ├── background.js        # Service worker + storage + notifications
│   ├── content/
│   │   ├── claude.js        # Fetch interception for Claude SSE API
│   │   ├── chatgpt.js       # DOM MutationObserver for ChatGPT
│   │   └── gemini.js        # Keydown tracking for Gemini
│   ├── popup/
│   │   ├── popup.html       # Extension popup UI
│   │   └── popup.js         # Popup rendering + predictive logic
│   └── icons/               # Extension icons (16, 48, 128px)
├── dashboard/
│   ├── index.html           # Full analytics dashboard
│   └── app.js               # Chart.js rendering + CSV export
└── README.md
```

## How It Works

### Claude
Intercepts the native `fetch` calls to Claude's SSE API (`/api/stream`, `/api/organizations/`) and reads `message_limit` events from the stream to get exact remaining/total counts. Falls back to DOM scraping every 5s.

### ChatGPT
Uses a `MutationObserver` on `document.body` to count `[data-message-author-role="user"]` elements. Detects model type from the model selector badge and tracks the 3-hour rolling window.

### Gemini
Attaches `keydown` listeners to `textarea` and `contenteditable` elements, counting `Enter` keypresses as requests. Resets align with Gemini's midnight PT cutoff. Tracks requests-per-minute (RPM) for rate limit awareness.

## Testing

1. **Load extension**: `chrome://extensions` → Developer mode → Load unpacked → select `extension/` folder
2. **Test Claude**: Open `claude.ai` → send a message → click extension icon → verify percentage
3. **Test ChatGPT**: Open `chat.openai.com` → send 3–4 messages → verify count increases
4. **Test Gemini**: Open `gemini.google.com` → send a message → check daily tracker
5. **Dashboard**: Click "Open Full Dashboard" → verify charts load
6. **Predictive alerts**: Send 10+ messages quickly → verify warning appears

## Contributing

PRs welcome! Key areas:
- [ ] Firefox support (WebExtension API)
- [ ] Perplexity / Grok / Copilot tracking
- [ ] Weekly usage reports
- [ ] Model-specific sub-tracking

## License

MIT — see [LICENSE](LICENSE)
