# News Truthifier — GitHub Pages (Dashboard UI)

**What this is**  
A client-side, zero-install news cross-referencer and "truthifier" that runs entirely in the browser and is ready for GitHub Pages. It gathers recent items from RSS feeds, extracts candidate claims, cross-references them across sources and fact-check feeds, and shows a confidence score.

**Key properties**
- ✅ 100% free
- ✅ No servers, no API keys, no domain registration
- ✅ Deploy on GitHub Pages
- ✅ Data and settings stored in browser localStorage
- ✅ Attempts CORS-free fetch; falls back to AllOrigins proxy if the feed blocks CORS

**Limitations**
- This is **RSS-based** — it only sees what RSS feeds expose. Not all outlets publish full text in RSS.
- If a feed blocks scraping by refusing cross-origin requests, the app uses the public AllOrigins proxy (`https://api.allorigins.win/raw?url=...`). That proxy is free but third-party; it's reliable for casual use but not guaranteed for heavy production.
- The claim extraction and verification are **heuristic** (simple sentence splitting and token overlap). Use outputs as a human-in-the-loop aid, not a final legal or medical truth-check.
- No personal data leaves your browser unless you click external links.

## Deployment — (No installs)
1. Create a new GitHub repository.
2. Add the files from this project to the repo root: `index.html`, `style.css`, `app.js`, `README.md`.
3. Commit & push to `main` (or `gh-pages`).
4. In GitHub repository → Settings → Pages, set the source to `main` branch `/ (root)`. Save.
5. Wait a minute, then open the provided `github.io` URL. The app runs immediately — no backend required.

## Usage
- Add or remove RSS feed URLs from the left sidebar.
- You can add fact-check feeds (Snopes, PolitiFact) to help identify already-checked claims.
- Toggle "Use CORS proxy" if some feeds fail to load due to cross-origin restrictions (recommended).
- Click "Refresh Now" to re-run aggregation.

## Ethics & Best Practices
- This tool **helps surface** corroborating sources and fact-check matches. It does not prove absolute truth.
- Always review primary sources and fact-check site text before publishing any claims.

## Extending
- If you later want server-side scraping or full-text extraction, add a lightweight free backend (Deta, Render free tier, or GitHub Actions) to fetch and pre-process feeds. This repository is intentionally client-first to avoid any server cost or setup.

Enjoy! — No installs, free, and immediate.
