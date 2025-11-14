/* ============================
      RSS SOURCES
============================ */

const FEEDS = {
    all: [
        // NATIONAL
        "https://www.npr.org/rss/rss.php?id=1001",
        "https://rss.cnn.com/rss/edition.rss",
        "https://feeds.foxnews.com/foxnews/latest",
        "https://www.reutersagency.com/feed/?best-topics=world&post_type=best",
        
        // INTERNATIONAL
        "https://www.aljazeera.com/xml/rss/all.xml",
        "https://feeds.bbci.co.uk/news/rss.xml",

        // TECH
        "https://www.theverge.com/rss/index.xml",
        "https://feeds.arstechnica.com/arstechnica/index",

        // HEALTH
        "https://www.cdc.gov/rss/rss.aspx",

        // BUSINESS
        "https://www.marketwatch.com/rss/topstories",
        
        // SPORTS
        "https://www.espn.com/espn/rss/news",

        // TRAVEL
        "https://www.travelpulse.com/rss/2.xml",

        // LOCAL (generic)
        "https://news.yahoo.com/rss/"
    ],

    politics: [
        "https://rss.nytimes.com/services/xml/rss/nyt/Politics.xml",
        "https://www.politico.com/rss/congress.xml",
        "https://feeds.foxnews.com/foxnews/politics"
    ],

    world: [
        "https://feeds.bbci.co.uk/news/world/rss.xml",
        "https://www.aljazeera.com/xml/rss/all.xml"
    ],

    tech: [
        "https://www.theverge.com/rss/index.xml",
        "https://www.engadget.com/rss.xml"
    ],

    health: [
        "https://www.cdc.gov/rss/rss.aspx",
        "https://medicalxpress.com/rss-feed/"
    ],

    business: [
        "https://www.marketwatch.com/rss/topstories",
        "https://www.investing.com/rss/news.rss"
    ],

    sports: [
        "https://www.espn.com/espn/rss/news"
    ],

    travel: [
        "https://www.travelpulse.com/rss/2.xml"
    ],

    local: [
        "https://news.yahoo.com/rss/"
    ]
};


/* ============================
  SIMPLE CLIENT-SIDE FACT CHECK
============================ */

function cleanBias(text) {
    if (!text) return "";

    return text
        .replace(/\b(democrat|republican|left-wing|right-wing|conservative|liberal)\b/gi, "")
        .replace(/\b(criticized|slammed|blasted|attacked)\b/gi, "said")
        .replace(/\b(shocking|outrageous|controversial)\b/gi, "")
        .trim();
}


/* ============================
    FETCH RSS (CORS-SAFE)
============================ */

async function fetchRSS(url) {
    const proxy = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
    try {
        const res = await fetch(proxy);
        const text = await res.text();
        return new window.DOMParser().parseFromString(text, "text/xml");
    } catch (e) {
        return null;
    }
}


/* ============================
    LOAD ARTICLES
============================ */

async function loadCategory(cat = "all") {
    const container = document.getElementById("articles");
    container.innerHTML = "<p>Loading...</p>";

    let items = [];

    for (const url of FEEDS[cat]) {
        const xml = await fetchRSS(url);
        if (!xml) continue;

        const entries = [...xml.querySelectorAll("item")].slice(0, 6);

        entries.forEach(item => {
            items.push({
                title: cleanBias(item.querySelector("title")?.textContent),
                description: cleanBias(item.querySelector("description")?.textContent),
                link: item.querySelector("link")?.textContent,
                source: new URL(url).hostname.replace("www.", "")
            });
        });
    }

    renderArticles(items);
}


/* ============================
    RENDER ARTICLE CARDS
============================ */

function renderArticles(list) {
    const container = document.getElementById("articles");
    container.innerHTML = "";

    list.forEach(article => {
        const el = document.createElement("div");
        el.className = "card";
        el.innerHTML = `
            <h3>${article.title}</h3>
            <p>${article.description}</p>
            <div class="source">Source: ${article.source}</div>
        `;
        el.onclick = () => window.open(article.link, "_blank");
        container.appendChild(el);
    });
}


/* ============================
     CATEGORY CLICK EVENTS
============================ */

document.querySelectorAll("#category-list li").forEach(li => {
    li.addEventListener("click", () => {
        document.querySelectorAll("#category-list li").forEach(x => x.classList.remove("active"));
        li.classList.add("active");
        loadCategory(li.dataset.category);
    });
});

/* Load default */
loadCategory("all");
