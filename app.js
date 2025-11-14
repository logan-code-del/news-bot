// app.js
// News Truthifier - Client-side RSS aggregator + cross-ref (no servers required)
// Works on GitHub Pages. If feed blocks CORS, automatically uses AllOrigins free proxy.

(() => {
  const DEFAULT_FEEDS = [
    {name:"BBC News", url:"https://feeds.bbci.co.uk/news/rss.xml"},
    {name:"Reuters", url:"https://www.reuters.com/rssFeed/topNews"},
    {name:"AP Top News", url:"https://apnews.com/hub/ap-top-news?outputType=xml"},
    {name:"The Guardian", url:"https://www.theguardian.com/world/rss"},
  ];

  const DEFAULT_FACTFEEDS = [
    {name:"Snopes", url:"https://www.snopes.com/feed/"},
    {name:"PolitiFact", url:"https://www.politifact.com/rss/"}
  ];

  // DOM
  const feedsList = document.getElementById('feeds-list');
  const factFeedsList = document.getElementById('factfeeds-list');
  const addFeedBtn = document.getElementById('add-feed-btn');
  const addFactFeedBtn = document.getElementById('add-factfeed-btn');
  const newFeedInput = document.getElementById('new-feed');
  const newFactFeedInput = document.getElementById('new-factfeed');
  const refreshBtn = document.getElementById('refresh-btn');
  const clearCacheBtn = document.getElementById('clear-cache');
  const useProxyCheckbox = document.getElementById('use-proxy');
  const autoRefreshCheckbox = document.getElementById('autorefresh');
  const cards = document.getElementById('cards');
  const statSources = document.getElementById('stat-sources');
  const statArticles = document.getElementById('stat-articles');
  const statClaims = document.getElementById('stat-claims');
  const toggleThemeBtn = document.getElementById('toggle-theme');

  // storage
  const STORAGE_KEY = 'truthifier_config_v1';
  let config = loadConfig();

  // basic util functions
  function saveConfig() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  }
  function loadConfig() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {feeds: DEFAULT_FEEDS, factfeeds: DEFAULT_FACTFEEDS, settings:{useProxy:true,autoRefresh:false}};
    try { const parsed = JSON.parse(raw); parsed.settings = parsed.settings || {useProxy:true,autoRefresh:false}; return parsed; } catch(e){ return {feeds: DEFAULT_FEEDS, factfeeds: DEFAULT_FACTFEEDS, settings:{useProxy:true,autoRefresh:false}};}
  }
  function mkEl(tag, cls){ const e=document.createElement(tag); if(cls) e.className=cls; return e; }

  // UI render for feeds lists
  function renderFeeds() {
    feedsList.innerHTML = '';
    config.feeds.forEach((f, i) => {
      const row = mkEl('div','feed-item');
      const inp = mkEl('input'); inp.value = f.url; inp.readOnly = true;
      const label = mkEl('div'); label.textContent = f.name || 'feed';
      const del = mkEl('button'); del.textContent = '✕'; del.title='Remove';
      del.onclick = () => { config.feeds.splice(i,1); saveConfig(); renderFeeds(); };
      row.appendChild(inp); row.appendChild(del);
      feedsList.appendChild(row);
    });

    factFeedsList.innerHTML = '';
    config.factfeeds.forEach((f, i) => {
      const row = mkEl('div','feed-item');
      const inp = mkEl('input'); inp.value = f.url; inp.readOnly = true;
      const del = mkEl('button'); del.textContent = '✕';
      del.onclick = () => { config.factfeeds.splice(i,1); saveConfig(); renderFeeds(); };
      row.appendChild(inp); row.appendChild(del);
      factFeedsList.appendChild(row);
    });

    useProxyCheckbox.checked = !!config.settings.useProxy;
    autoRefreshCheckbox.checked = !!config.settings.autoRefresh;
  }

  // add feed handlers
  addFeedBtn.onclick = () => {
    const v = newFeedInput.value.trim();
    if (!v) return alert('Enter a feed URL');
    config.feeds.unshift({name:v, url:v});
    newFeedInput.value=''; saveConfig(); renderFeeds();
  };
  addFactFeedBtn.onclick = () => {
    const v = newFactFeedInput.value.trim();
    if (!v) return alert('Enter a fact-check feed URL');
    config.factfeeds.unshift({name:v, url:v});
    newFactFeedInput.value=''; saveConfig(); renderFeeds();
  };
  clearCacheBtn.onclick = () => {
    if (!confirm('Clear saved feeds and settings?')) return;
    localStorage.removeItem(STORAGE_KEY);
    config = loadConfig(); renderFeeds();
  };
  useProxyCheckbox.onchange = (e) => { config.settings.useProxy = e.target.checked; saveConfig(); };
  autoRefreshCheckbox.onchange = (e) => { config.settings.autoRefresh = e.target.checked; saveConfig(); toggleAutoRefresh(); };

  toggleThemeBtn.onclick = () => {
    document.documentElement.classList.toggle('light');
  };

  // fetching RSS (tries direct fetch, otherwise uses AllOrigins)
  async function fetchTextWithFallback(url) {
    try {
      const res = await fetch(url, {mode:'cors'});
      if (!res.ok) throw new Error('HTTP '+res.status);
      const txt = await res.text();
      return txt;
    } catch (err) {
      if (!config.settings.useProxy) throw err;
      // fallback to AllOrigins free proxy
      try {
        const proxy = 'https://api.allorigins.win/raw?url=';
        const res2 = await fetch(proxy + encodeURIComponent(url));
        if (!res2.ok) throw new Error('Proxy error '+res2.status);
        return await res2.text();
      } catch (err2) {
        throw err2;
      }
    }
  }

  function parseRss(xmlText, sourceName) {
    // robust simple XML parse
    const doc = new DOMParser().parseFromString(xmlText, "text/xml");
    const items = Array.from(doc.querySelectorAll("item, entry")).slice(0, 25);
    const parsed = items.map(it => {
      const title = (it.querySelector("title") && it.querySelector("title").textContent) || '';
      const link = (it.querySelector("link") && (it.querySelector("link").getAttribute('href') || it.querySelector("link").textContent)) || (it.querySelector("guid") && it.querySelector("guid").textContent) || '';
      const descNode = it.querySelector("description") || it.querySelector("summary") || it.querySelector("content");
      const description = descNode ? descNode.textContent : '';
      const pub = (it.querySelector("pubDate") && it.querySelector("pubDate").textContent) || (it.querySelector("updated") && it.querySelector("updated").textContent) || '';
      return {
        source: sourceName,
        title: title.trim(),
        link: link.trim(),
        description: description.trim(),
        published: pub
      };
    });
    return parsed;
  }

  // helper: simple sentence splitter
  function sentencesFromText(txt) {
    if (!txt) return [];
    // replace newlines then split by punctuation
    const clean = txt.replace(/\s+/g,' ');
    const sents = clean.match(/[^.!?]{30,250}[.!?]?/g) || [];
    return sents.map(s => s.trim());
  }

  // naive token overlap similarity (Jaccard-like)
  function tokenSet(s) {
    return new Set(s.toLowerCase().replace(/[^\w\s]/g,'').split(/\s+/).filter(Boolean));
  }
  function overlapScore(a,b){
    const A = tokenSet(a), B = tokenSet(b);
    let inter = 0;
    A.forEach(x => { if (B.has(x)) inter++ });
    if (A.size + B.size - inter === 0) return 0;
    return inter / (A.size + B.size - inter);
  }

  // build candidate claims from article title + description
  function candidateClaimsFromArticle(article, maxClaims=5) {
    const text = (article.title || '') + '. ' + (article.description || '');
    const sents = sentencesFromText(text);
    const claims = sents.slice(0, maxClaims).map(s => ({ sentence: s, source: article.source, link: article.link }));
    return claims;
  }

  // cross-reference a claim against other articles and fact-check feeds
  function crossrefClaim(claim, allArticles, factfeedEntries) {
    const matches = [];
    allArticles.forEach(a => {
      // match against title + description
      const hay = (a.title + ' ' + a.description).toLowerCase();
      // fast substring check
      if (hay.includes(claim.sentence.substring(0, 30).toLowerCase())) {
        matches.push({type:'mainstream', source:a.source, title:a.title, link:a.link});
      } else {
        const score = overlapScore(claim.sentence, a.title + ' ' + a.description);
        if (score > 0.18) matches.push({type:'mainstream', source:a.source, title:a.title, link:a.link, score});
      }
    });

    const factMatches = [];
    factfeedEntries.forEach(f => {
      if ((f.title + ' ' + (f.description||'')).toLowerCase().includes(claim.sentence.substring(0,30).toLowerCase())) {
        factMatches.push({site:f.source, title:f.title, link:f.link});
      } else {
        const sc = overlapScore(claim.sentence, f.title + ' ' + (f.description||''));
        if (sc > 0.18) factMatches.push({site:f.source, title:f.title, link:f.link, score:sc});
      }
    });

    // heuristic confidence:
    // start at 0.5, +0.12 per independent mainstream match (capped), -0.4 if fact-checks found
    const uniqSources = new Set(matches.map(m => m.source));
    let conf = 0.5 + 0.12 * Math.min(uniqSources.size, 4);
    if (factMatches.length > 0) conf -= 0.45;
    conf = Math.max(0, Math.min(1, conf));
    return {claim:claim.sentence, source:claim.source, link:claim.link, matches, factMatches, confidence: Math.round(conf*100)/100};
  }

  // render results
  function confClass(c) {
    if (c >= 0.75) return 'conf-high';
    if (c >= 0.4) return 'conf-mid';
    return 'conf-low';
  }

  function renderReports(reports, allArticles) {
    cards.innerHTML = '';
    let totalClaims = 0;
    reports.forEach(r => {
      totalClaims += r.claims.length;
      const card = mkEl('div','card');
      const hd = mkEl('div'); hd.className='meta';
      hd.innerHTML = `<div>${r.source} · <strong>${r.title||'Untitled'}</strong></div><div>${new Date(r.link?0:0)}</div>`;
      const title = mkEl('h4'); title.textContent = r.title || '(no title)';
      card.appendChild(title);
      const meta = mkEl('div','meta');
      meta.innerHTML = `<div class="link"><a href="${r.link}" target="_blank" rel="noopener noreferrer">${r.link||'link'}</a></div><div class="badge ${confClass(avgConfidence(r.claims))}">${avgConfidence(r.claims)}</div>`;
      card.appendChild(meta);

      r.claims.forEach(c => {
        const block = mkEl('div','claim');
        const p = mkEl('div'); p.textContent = c.claim;
        block.appendChild(p);
        const badge = mkEl('div'); badge.className = 'link-list';
        badge.innerHTML = `<div>Confidence: <strong>${c.confidence}</strong></div>`;
        if (c.matches && c.matches.length) {
          const mlist = mkEl('div','link-list');
          mlist.innerHTML = `<div><strong>Matching sources (${c.matches.length}):</strong></div>` + c.matches.slice(0,5).map(m => `<div><a href="${m.link}" target="_blank" rel="noopener noreferrer">${m.source} — ${truncate(m.title,80)}</a></div>`).join('');
          block.appendChild(mlist);
        }
        if (c.factMatches && c.factMatches.length) {
          const fl = mkEl('div','link-list');
          fl.innerHTML = `<div><strong>Fact-check matches (${c.factMatches.length}):</strong></div>` + c.factMatches.map(f => `<div><a href="${f.link}" target="_blank" rel="noopener noreferrer">${f.site} — ${truncate(f.title,80)}</a></div>`).join('');
          block.appendChild(fl);
        }
        card.appendChild(block);
      });

      cards.appendChild(card);
    });

    statSources.textContent = new Set(allArticles.map(a=>a.source)).size;
    statArticles.textContent = allArticles.length;
    statClaims.textContent = totalClaims;
  }

  function truncate(s, n){ if(!s) return ''; return s.length>n?s.slice(0,n-1)+'…':s; }

  function avgConfidence(claims){
    if(!claims || claims.length===0) return '—';
    const avg = claims.reduce((a,c)=>a+c.confidence,0)/claims.length;
    return (Math.round(avg*100)/100);
  }

  // orchestrator: fetch feeds, build articles, extract claims, crossref
  async function runOnce() {
    refreshBtn.disabled = true; refreshBtn.textContent = 'Refreshing...';
    try {
      const feedPromises = config.feeds.map(async f => {
        try {
          const txt = await fetchTextWithFallback(f.url);
          const items = parseRss(txt, f.name || f.url);
          // attach source name if missing
          items.forEach(it => { if (!it.source) it.source = f.name || f.url; });
          return items;
        } catch (e) {
          console.warn('Feed error', f.url, e);
          return [];
        }
      });
      const factPromises = config.factfeeds.map(async f => {
        try {
          const txt = await fetchTextWithFallback(f.url);
          const items = parseRss(txt, f.name || f.url);
          items.forEach(it => { if (!it.source) it.source = f.name || f.url; });
          return items;
        } catch (e) {
          console.warn('Fact feed error', f.url, e);
          return [];
        }
      });

      const feedResults = await Promise.all(feedPromises);
      const factResults = await Promise.all(factPromises);
      const allArticles = [].concat(...feedResults).filter(Boolean);
      const factArticles = [].concat(...factResults).filter(Boolean);

      // build reports per article
      const reports = allArticles.map(a => {
        const claims = candidateClaimsFromArticle(a, 4);
        const claimReports = claims.map(cl => crossrefClaim(cl, allArticles, factArticles));
        return { source: a.source, title: a.title, link: a.link, claims: claimReports };
      });

      renderReports(reports, allArticles);
    } finally {
      refreshBtn.disabled = false; refreshBtn.textContent='Refresh Now';
    }
  }

  // auto-refresh
  let autoTimer = null;
  function toggleAutoRefresh() {
    if (config.settings.autoRefresh) {
      if (autoTimer) clearInterval(autoTimer);
      autoTimer = setInterval(runOnce, 1000*60*10); // 10 minutes
    } else {
      if (autoTimer) { clearInterval(autoTimer); autoTimer = null; }
    }
  }

  // init
  function init() {
    if (!config.feeds || !config.feeds.length) config.feeds = DEFAULT_FEEDS;
    if (!config.factfeeds || !config.factfeeds.length) config.factfeeds = DEFAULT_FACTFEEDS;
    if (!config.settings) config.settings = {useProxy:true,autoRefresh:false};
    renderFeeds();
    refreshBtn.onclick = runOnce;
    toggleAutoRefresh();
    runOnce();
  }

  init();
})();
