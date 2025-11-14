/* ============================
    Global Configuration
============================ */

const CATEGORY_FEEDS = {
    politics: "data/politics.json",
    world: "data/world.json",
    tech: "data/tech.json",
    health: "data/health.json",
    business: "data/business.json",
    sports: "data/sports.json",
    travel: "data/travel.json",
    local: "data/local.json",
    all: "data/feeds.json"
};
const FACTCHECK_FEEDS = "data/factchecks.json";
const STORAGE_KEY = "truthifier_config_v2";

/* ============================
    Load User Config
============================ */
let config = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {
    darkMode:false,
    autoRefresh:false,
    refreshInterval:10,
    myFeeds:[],
    starredCategories:[]
};

/* ============================
    DOM Elements
============================ */
const articlesEl = document.getElementById("articles");
const categoryEls = document.querySelectorAll("#category-list li");
const darkToggle = document.getElementById("dark-mode-toggle");
const autoRefreshToggle = document.getElementById("auto-refresh-toggle");
const refreshIntervalInput = document.getElementById("refresh-interval");
const myFeedsList = document.getElementById("my-feeds-list");
const newFeedInput = document.getElementById("new-feed-input");
const addFeedBtn = document.getElementById("add-feed-btn");

/* ============================
    Dark Mode
============================ */
function updateDarkMode() {
    if(config.darkMode) document.body.classList.add("dark");
    else document.body.classList.remove("dark");
    darkToggle.checked = config.darkMode;
}
darkToggle.addEventListener("change", e=>{
    config.darkMode = e.target.checked;
    saveConfig();
    updateDarkMode();
});
updateDarkMode();

/* ============================
    Auto Refresh
============================ */
let autoTimer = null;
function toggleAutoRefresh() {
    if(autoTimer) clearInterval(autoTimer);
    if(config.autoRefresh) autoTimer = setInterval(()=>loadCategory(currentCategory), config.refreshInterval*60*1000);
    autoRefreshToggle.checked = config.autoRefresh;
}
autoRefreshToggle.addEventListener("change", e=>{
    config.autoRefresh = e.target.checked;
    saveConfig();
    toggleAutoRefresh();
});

/* ============================
    Refresh Interval
============================ */
refreshIntervalInput.value = config.refreshInterval;
refreshIntervalInput.addEventListener("change", e=>{
    let val = parseInt(e.target.value)||10;
    config.refreshInterval = val;
    saveConfig();
    toggleAutoRefresh();
});

/* ============================
    Save Config
============================ */
function saveConfig() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

/* ============================
    Load Category
============================ */
let currentCategory = "all";

categoryEls.forEach(el=>{
    el.addEventListener("click", ()=>{
        categoryEls.forEach(x=>x.classList.remove("active"));
        el.classList.add("active");
        currentCategory = el.dataset.category;
        loadCategory(currentCategory);
    });
});

async function loadCategory(cat="all"){
    articlesEl.innerHTML = "<p>Loading...</p>";
    try{
        let resp = await fetch(CATEGORY_FEEDS[cat]);
        let data = await resp.json();
        renderArticles(data);
    }catch(e){
        articlesEl.innerHTML="<p>Failed to load articles.</p>";
        console.error(e);
    }
}

/* ============================
    Render Articles
============================ */
function renderArticles(list){
    articlesEl.innerHTML="";
    list.forEach(a=>{
        const card = document.createElement("div");
        card.className="card";
        const confidence = Math.round((Math.random()*0.5+0.5)*100); // simple AI-score placeholder
        card.innerHTML=`
            <h3>${a.title}</h3>
            <p>${a.content}</p>
            <div class="source">Source: ${a.source}</div>
            <div class="confidence">Confidence: ${confidence}</div>
        `;
        card.onclick = ()=>window.open(a.link,"_blank");
        articlesEl.appendChild(card);
    });
}

/* ============================
    My Feeds Manager
============================ */
function renderMyFeeds(){
    myFeedsList.innerHTML="";
    config.myFeeds.forEach((f,i)=>{
        const li = document.createElement("li");
        li.textContent=f;
        li.addEventListener("click", ()=>{
            window.open(f,"_blank");
        });
        myFeedsList.appendChild(li);
    });
}
addFeedBtn.addEventListener("click", ()=>{
    const url = newFeedInput.value.trim();
    if(!url) return;
    config.myFeeds.push(url);
    newFeedInput.value="";
    saveConfig();
    renderMyFeeds();
});
renderMyFeeds();

/* ============================
    Initialize
============================ */
loadCategory(currentCategory);
toggleAutoRefresh();
