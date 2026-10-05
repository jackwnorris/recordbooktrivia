// Runs on every Netlify build. Turns the question bank in public/index.html into
// crawlable category pages under /trivia/, plus sitemap.xml and robots.txt.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";

const BASE = (process.env.SITE_URL || "https://recordbooktrivia.com").replace(/\/$/, "");
const html = readFileSync("public/index.html", "utf8");
const js = html.split("<script>")[1].split("</script>")[0];
const RAW = new Function(js.split("const SPORTS")[0] + ";return RAW;")();
const Q = RAW.map((r, i) => ({ i, sport: r[0], year: r[1], diff: r[2], q: r[3], a: r[4], fact: r[6] || "", type: r[7] || null }));
const today = new Date().toISOString().slice(0, 10);

const SPORT = {
  NFL: ["nfl", "NFL"], NBA: ["nba", "NBA"], MLB: ["mlb", "MLB"], NHL: ["nhl", "NHL"],
  NCAAF: ["college-football", "College Football"], NCAAB: ["college-basketball", "College Basketball"],
  Soccer: ["soccer", "Soccer"], Golf: ["golf", "Golf"], Tennis: ["tennis", "Tennis"],
  Olympics: ["olympics", "Olympics"], More: ["boxing-racing-and-more", "Boxing, Racing and More"],
};
const DIFF = { 1: ["easy", "Easy"], 2: ["medium", "Medium"], 3: ["hard", "Hard"] };
const slug = s => s.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// Teams: [league, full name, words that identify it in a question, answer or fact]
const TEAMS = [
 ["NFL","Arizona Cardinals",["Cardinals"]],["NFL","Atlanta Falcons",["Falcons"]],["NFL","Baltimore Ravens",["Ravens"]],["NFL","Buffalo Bills",["Bills"]],
 ["NFL","Carolina Panthers",["Panthers"]],["NFL","Chicago Bears",["Bears"]],["NFL","Cincinnati Bengals",["Bengals"]],["NFL","Cleveland Browns",["Browns"]],
 ["NFL","Dallas Cowboys",["Cowboys"]],["NFL","Denver Broncos",["Broncos"]],["NFL","Detroit Lions",["Lions"]],["NFL","Green Bay Packers",["Packers"]],
 ["NFL","Houston Texans",["Texans"]],["NFL","Indianapolis Colts",["Indianapolis Colts"]],["NFL","Jacksonville Jaguars",["Jaguars"]],["NFL","Kansas City Chiefs",["Chiefs"]],
 ["NFL","Las Vegas Raiders",["Raiders"]],["NFL","Los Angeles Chargers",["Chargers"]],["NFL","Los Angeles Rams",["Rams"]],["NFL","Miami Dolphins",["Dolphins"]],
 ["NFL","Minnesota Vikings",["Vikings"]],["NFL","New England Patriots",["Patriots"]],["NFL","New Orleans Saints",["Saints"]],["NFL","New York Giants",["Giants"]],
 ["NFL","New York Jets",["Jets"]],["NFL","Philadelphia Eagles",["Eagles"]],["NFL","Pittsburgh Steelers",["Steelers"]],["NFL","San Francisco 49ers",["49ers"]],
 ["NFL","Seattle Seahawks",["Seahawks"]],["NFL","Tampa Bay Buccaneers",["Buccaneers","Bucs"]],["NFL","Tennessee Titans",["Titans"]],["NFL","Washington Commanders",["Commanders","Washington"]],
 ["NBA","Atlanta Hawks",["Hawks"]],["NBA","Boston Celtics",["Celtics"]],["NBA","Brooklyn Nets",["Nets"]],["NBA","Charlotte Hornets",["Hornets"]],
 ["NBA","Chicago Bulls",["Bulls"]],["NBA","Cleveland Cavaliers",["Cavaliers","Cavs"]],["NBA","Dallas Mavericks",["Mavericks","Mavs"]],["NBA","Denver Nuggets",["Nuggets"]],
 ["NBA","Detroit Pistons",["Pistons"]],["NBA","Golden State Warriors",["Warriors"]],["NBA","Houston Rockets",["Rockets"]],["NBA","Indiana Pacers",["Pacers"]],
 ["NBA","Los Angeles Clippers",["Clippers"]],["NBA","Los Angeles Lakers",["Lakers"]],["NBA","Memphis Grizzlies",["Grizzlies"]],["NBA","Miami Heat",["Heat"]],
 ["NBA","Milwaukee Bucks",["Bucks"]],["NBA","Minnesota Timberwolves",["Timberwolves","Wolves"]],["NBA","New Orleans Pelicans",["Pelicans"]],["NBA","New York Knicks",["Knicks"]],
 ["NBA","Oklahoma City Thunder",["Thunder","SuperSonics","Sonics"]],["NBA","Orlando Magic",["Orlando Magic","the Magic"]],["NBA","Philadelphia 76ers",["76ers","Sixers"]],["NBA","Phoenix Suns",["Suns"]],
 ["NBA","Portland Trail Blazers",["Trail Blazers","Blazers"]],["NBA","Sacramento Kings",["Kings"]],["NBA","San Antonio Spurs",["Spurs"]],["NBA","Toronto Raptors",["Raptors"]],
 ["NBA","Utah Jazz",["Jazz"]],["NBA","Washington Wizards",["Wizards","Bullets"]],
 ["MLB","Arizona Diamondbacks",["Diamondbacks"]],["MLB","Atlanta Braves",["Braves"]],["MLB","Baltimore Orioles",["Orioles"]],["MLB","Boston Red Sox",["Red Sox"]],
 ["MLB","Chicago Cubs",["Cubs"]],["MLB","Chicago White Sox",["White Sox"]],["MLB","Cincinnati Reds",["Reds"]],["MLB","Cleveland Guardians",["Guardians","Cleveland Indians"]],
 ["MLB","Colorado Rockies",["Rockies"]],["MLB","Detroit Tigers",["Tigers"]],["MLB","Houston Astros",["Astros"]],["MLB","Kansas City Royals",["Royals"]],
 ["MLB","Los Angeles Angels",["Angels"]],["MLB","Los Angeles Dodgers",["Dodgers"]],["MLB","Miami Marlins",["Marlins"]],["MLB","Milwaukee Brewers",["Brewers"]],
 ["MLB","Minnesota Twins",["Twins"]],["MLB","New York Mets",["Mets"]],["MLB","New York Yankees",["Yankees"]],["MLB","Athletics",["Athletics","A's"]],
 ["MLB","Philadelphia Phillies",["Phillies"]],["MLB","Pittsburgh Pirates",["Pirates"]],["MLB","San Diego Padres",["Padres"]],["MLB","San Francisco Giants",["Giants"]],
 ["MLB","Seattle Mariners",["Mariners"]],["MLB","St. Louis Cardinals",["Cardinals"]],["MLB","Tampa Bay Rays",["Rays"]],["MLB","Texas Rangers",["Rangers"]],
 ["MLB","Toronto Blue Jays",["Blue Jays"]],["MLB","Washington Nationals",["Nationals","Expos"]],
 ["NHL","Anaheim Ducks",["Ducks"]],["NHL","Boston Bruins",["Bruins"]],["NHL","Buffalo Sabres",["Sabres"]],["NHL","Calgary Flames",["Flames"]],
 ["NHL","Carolina Hurricanes",["Hurricanes"]],["NHL","Chicago Blackhawks",["Blackhawks","Black Hawks"]],["NHL","Colorado Avalanche",["Avalanche"]],["NHL","Columbus Blue Jackets",["Blue Jackets"]],
 ["NHL","Dallas Stars",["Dallas Stars"]],["NHL","Detroit Red Wings",["Red Wings"]],["NHL","Edmonton Oilers",["Oilers","Edmonton"]],["NHL","Florida Panthers",["Panthers"]],
 ["NHL","Los Angeles Kings",["Kings"]],["NHL","Minnesota Wild",["Wild"]],["NHL","Montreal Canadiens",["Canadiens"]],["NHL","Nashville Predators",["Predators"]],
 ["NHL","New Jersey Devils",["Devils"]],["NHL","New York Islanders",["Islanders"]],["NHL","New York Rangers",["Rangers"]],["NHL","Ottawa Senators",["Senators"]],
 ["NHL","Philadelphia Flyers",["Flyers"]],["NHL","Pittsburgh Penguins",["Penguins"]],["NHL","San Jose Sharks",["Sharks"]],["NHL","Seattle Kraken",["Kraken"]],
 ["NHL","St. Louis Blues",["Blues"]],["NHL","Tampa Bay Lightning",["Lightning"]],["NHL","Toronto Maple Leafs",["Maple Leafs","Leafs"]],["NHL","Vancouver Canucks",["Canucks"]],
 ["NHL","Vegas Golden Knights",["Golden Knights"]],["NHL","Washington Capitals",["Capitals"]],["NHL","Winnipeg Jets",["Winnipeg Jets"]],["NHL","Minnesota North Stars",["North Stars"]],
];
const teamQs = t => {
  const res = t[2].map(w => new RegExp("(^|[^A-Za-z])" + w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "([^A-Za-z]|$)"));
  return Q.filter(x => x.sport === t[0] && res.some(r => r.test(x.q + " " + x.a + " " + x.fact)));
};

const pages = []; // {path, title, h1, desc, intro, qs, play, crumbs, related}
const playUrl = p => "/?" + new URLSearchParams(p).toString();

for (const [code, [s, name]] of Object.entries(SPORT)) {
  const qs = Q.filter(x => x.sport === code); if (qs.length < 8) continue;
  pages.push({ path: `/trivia/${s}/`, h1: `${name} Trivia Questions and Answers`, title: `${name} Trivia Questions and Answers (${qs.length}) | Record Book`,
    desc: `${qs.length} ${name} trivia questions with answers, from famous moments to draft picks and stat lines. Read them here or play them as a timed quiz.`,
    intro: `${qs.length} ${name} trivia questions, from the easy ones every fan knows to the deep cuts. Tap a question to see the answer and a quick fact.`,
    qs, play: playUrl({ sport: s, play: "classic" }), crumbs: [["Trivia", "/trivia/"], [name, null]], group: "sport", code });
  for (const d of [1, 2, 3]) {
    const dq = qs.filter(x => x.diff === d); if (dq.length < 8) continue;
    const [ds, dn] = DIFF[d];
    pages.push({ path: `/trivia/${s}/${ds}/`, h1: `${dn} ${name} Trivia Questions`, title: `${dn} ${name} Trivia Questions and Answers | Record Book`,
      desc: `${dq.length} ${dn.toLowerCase()} ${name} trivia questions with answers. Test yourself, then play them as a quiz.`,
      intro: `${dq.length} ${dn.toLowerCase()} ${name} trivia questions. ${d === 3 ? "These are the ones that stump most fans." : d === 2 ? "Not too easy, not impossible." : "A good warm-up for any fan."}`,
      qs: dq, play: playUrl({ sport: s, diff: ds, play: "classic" }), crumbs: [["Trivia", "/trivia/"], [name, `/trivia/${s}/`], [dn, null]], group: "diff", code });
  }
  const dec = {};
  qs.forEach(x => { const d = Math.floor(x.year / 10) * 10; (dec[d] = dec[d] || []).push(x); });
  for (const [d, dq] of Object.entries(dec)) {
    if (dq.length < 8) continue;
    pages.push({ path: `/trivia/${s}/${d}s/`, h1: `${d}s ${name} Trivia Questions`, title: `${d}s ${name} Trivia Questions and Answers | Record Book`,
      desc: `${dq.length} ${name} trivia questions from the ${d}s, with answers and fun facts.`,
      intro: `${dq.length} ${name} trivia questions about the ${d}s.`, qs: dq, play: playUrl({ sport: s, play: "classic" }),
      crumbs: [["Trivia", "/trivia/"], [name, `/trivia/${s}/`], [`${d}s`, null]], group: "decade", code });
  }
}
for (const t of TEAMS) {
  const qs = teamQs(t); if (qs.length < 6) continue;
  const [s, lname] = SPORT[t[0]]; const ts = slug(t[1]);
  pages.push({ path: `/trivia/${ts}/`, h1: `${t[1]} Trivia Questions and Answers`, title: `${t[1]} Trivia Questions and Answers | Record Book`,
    desc: `${qs.length} ${t[1]} trivia questions with answers. How well do you know your team's history?`,
    intro: `${qs.length} trivia questions that involve the ${t[1]}, from big moments to players who passed through.`,
    qs, play: playUrl({ sport: s, play: "classic" }), crumbs: [["Trivia", "/trivia/"], [lname, `/trivia/${s}/`], [t[1], null]], group: "team", code: t[0], team: t[1] });
}
const types = {}; Q.forEach(x => { if (x.type) (types[x.type] = types[x.type] || []).push(x); });
for (const [ty, qs] of Object.entries(types)) {
  if (qs.length < 6) continue;
  const n = ty === "Who am I" ? "Who Am I Sports" : ty === "Draft" ? "Sports Draft" : ty === "College to pro" ? "College to Pro Sports" : "Sports " + ty.replace(/\b\w/g, c => c.toUpperCase());
  pages.push({ path: `/trivia/${slug(ty)}/`, h1: `${n} Trivia Questions`, title: `${n} Trivia Questions and Answers | Record Book`,
    desc: `${qs.length} ${n.toLowerCase()} trivia questions with answers across the NFL, NBA, MLB, NHL and more.`,
    intro: `${qs.length} ${n.toLowerCase()} trivia questions across every sport in the Record Book.`, qs, play: "/?play=classic",
    crumbs: [["Trivia", "/trivia/"], [ty, null]], group: "type" });
}

const CSS = `*{box-sizing:border-box}body{margin:0;background:#0D0D1A;color:#fff;font:18px/1.6 "DM Sans",system-ui,sans-serif;
background-image:radial-gradient(ellipse at 15% 10%,rgba(255,58,242,.18),transparent 50%),radial-gradient(ellipse at 90% 60%,rgba(0,245,212,.12),transparent 50%)}
a{color:#00F5D4}.wrap{max-width:860px;margin:0 auto;padding:20px 18px 80px}
.top{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:24px}
.brand{font:900 24px Outfit,sans-serif;text-transform:uppercase;color:#fff;text-decoration:none;text-shadow:2px 2px 0 #7B2FFF,4px 4px 0 #FF3AF2}.brand span{color:#FFE600}
.btn{display:inline-block;font:700 16px Outfit,sans-serif;text-transform:uppercase;letter-spacing:.1em;color:#fff;text-decoration:none;background:linear-gradient(90deg,#FF3AF2,#7B2FFF,#00F5D4);border:4px solid #FFE600;border-radius:999px;padding:10px 24px;box-shadow:5px 5px 0 #FFE600}
.crumbs{font-size:14px;color:rgba(255,255,255,.65);margin-bottom:8px}.crumbs a{color:rgba(255,255,255,.8)}
h1{font:900 clamp(34px,7vw,56px)/1.02 Outfit,sans-serif;text-transform:uppercase;letter-spacing:-.02em;margin:0 0 16px;text-shadow:2px 2px 0 #7B2FFF,4px 4px 0 #FF3AF2,6px 6px 0 #00F5D4}
.intro{font-size:19px;color:rgba(255,255,255,.88);max-width:62ch}
.play{margin:22px 0 30px}
ol.qs{list-style:none;padding:0;margin:0;display:grid;gap:16px;counter-reset:q}
ol.qs li{counter-increment:q;background:rgba(45,27,78,.85);border:4px solid #FF3AF2;border-radius:20px;padding:16px 18px;box-shadow:4px 4px 0 #FFE600}
ol.qs li:nth-child(5n+2){border-color:#00F5D4;box-shadow:4px 4px 0 #FF6B35}ol.qs li:nth-child(5n+3){border-color:#FFE600;box-shadow:4px 4px 0 #FF3AF2}
ol.qs li:nth-child(5n+4){border-color:#FF6B35;box-shadow:4px 4px 0 #00F5D4}ol.qs li:nth-child(5n+5){border-color:#7B2FFF;box-shadow:4px 4px 0 #FFE600}
.q{margin:0;font:800 20px/1.3 Outfit,sans-serif}.q::before{content:counter(q) ". ";color:#FFE600}
.meta{font-size:13px;color:rgba(255,255,255,.6);margin-top:4px}
details{margin-top:8px}summary{cursor:pointer;color:#00F5D4;font-weight:700}
.ans{margin:8px 0 0;font-weight:700;font-size:19px}.fact{margin:4px 0 0;color:rgba(255,255,255,.85)}
h2{font:900 28px Outfit,sans-serif;text-transform:uppercase;margin:44px 0 14px;text-shadow:2px 2px 0 #7B2FFF}
.links{display:flex;flex-wrap:wrap;gap:10px}.links a{color:#fff;text-decoration:none;border:3px dashed #00F5D4;border-radius:999px;padding:6px 14px;font-weight:700;font-size:15px}
.links a:nth-child(3n+2){border-color:#FF3AF2}.links a:nth-child(3n){border-color:#FFE600}
footer{margin-top:60px;font-size:14px;color:rgba(255,255,255,.6)}`;

const DLABEL = { 1: "Easy", 2: "Medium", 3: "Hard" };
function layout({ path, title, desc, h1, intro, body, crumbs }) {
  const crumbLd = { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [["Home", "/"], ...crumbs.map(([n, u]) => [n, u || path])].map(([n, u], k) => ({ "@type": "ListItem", position: k + 1, name: n, item: BASE + u })) };
  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title><meta name="description" content="${esc(desc)}"><link rel="canonical" href="${BASE}${path}">
<meta name="theme-color" content="#0D0D1A"><link rel="icon" type="image/svg+xml" href="/favicon.svg"><link rel="apple-touch-icon" href="/apple-touch-icon.png">
<meta property="og:type" content="website"><meta property="og:site_name" content="Record Book"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${BASE}${path}"><meta property="og:image" content="${BASE}/og-image.png"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:image" content="${BASE}/og-image.png">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Outfit:wght@800;900&family=DM+Sans:wght@400;700&display=swap" rel="stylesheet">
<style>${CSS}</style><script type="application/ld+json">${JSON.stringify(crumbLd)}</script></head><body><div class="wrap">
<div class="top"><a class="brand" href="/">Record <span>Book</span></a><a class="btn" href="/">Play</a></div>
<nav class="crumbs" aria-label="Breadcrumb"><a href="/">Home</a>${crumbs.map(([n, u]) => " / " + (u ? `<a href="${u}">${esc(n)}</a>` : esc(n))).join("")}</nav>
<h1>${esc(h1)}</h1><p class="intro">${esc(intro)}</p>${body}
<footer>Record Book is a free sports history trivia game with ${Q.length.toLocaleString()} questions. <a href="/">Play it here</a> or <a href="/trivia/">browse every category</a>.</footer>
</div></body></html>`;
}
const linkList = arr => `<div class="links">${arr.map(p => `<a href="${p.path}">${esc(p.h1.replace(/ Questions( and Answers)?$/, ""))}</a>`).join("")}</div>`;

for (const p of pages) {
  const qs = [...p.qs].sort((a, b) => a.diff - b.diff || a.year - b.year).slice(0, 150);
  const items = qs.map(x => `<li><p class="q">${esc(x.q)}</p><div class="meta">${esc(SPORT[x.sport][1])} · ${DLABEL[x.diff]}${x.type ? " · " + esc(x.type) : ""}</div><details><summary>Show answer</summary><p class="ans">${esc(x.a)} (${x.year})</p>${x.fact ? `<p class="fact">${esc(x.fact)}</p>` : ""}</details></li>`).join("\n");
  const siblings = pages.filter(o => o !== p && (o.code === p.code && o.code) && o.group !== "type").slice(0, 24);
  const others = pages.filter(o => o.group === "sport" && o.code !== p.code);
  const body = `<div class="play"><a class="btn" href="${p.play}">Play these as a quiz</a></div><ol class="qs">${items}</ol>
${siblings.length ? `<h2>More ${esc(SPORT[p.code] ? SPORT[p.code][1] : "")} trivia</h2>${linkList(siblings)}` : ""}<h2>Other sports</h2>${linkList(others)}`;
  const dir = "public" + p.path; mkdirSync(dir, { recursive: true });
  writeFileSync(dir + "index.html", layout({ ...p, body }));
}
// hub
const sec = (label, g) => { const a = pages.filter(p => p.group === g); return a.length ? `<h2>${label}</h2>${linkList(a)}` : ""; };
const hubBody = `<div class="play"><a class="btn" href="/">Play Record Book</a></div>
${sec("By sport", "sport")}${sec("By team", "team")}${sec("By question type", "type")}${sec("By difficulty", "diff")}${sec("By decade", "decade")}`;
mkdirSync("public/trivia", { recursive: true });
writeFileSync("public/trivia/index.html", layout({ path: "/trivia/", title: `Sports Trivia Questions and Answers by Sport, Team and Decade | Record Book`,
  desc: `Browse ${Q.length.toLocaleString()} sports trivia questions with answers by sport, team, decade and difficulty. NFL, NBA, MLB, NHL, college and more.`,
  h1: "Sports Trivia Questions and Answers", intro: `Every question in Record Book, sorted by sport, team, question type, difficulty and decade. ${Q.length.toLocaleString()} in all.`,
  body: hubBody, crumbs: [["Trivia", null]] }));
// sitemap + robots
const urls = ["/", "/trivia/", ...pages.map(p => p.path)];
writeFileSync("public/sitemap.xml", `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(u => `  <url><loc>${BASE}${u}</loc><lastmod>${today}</lastmod></url>`).join("\n")}\n</urlset>\n`);
writeFileSync("public/robots.txt", `User-agent: *\nAllow: /\nDisallow: /api/\n\nSitemap: ${BASE}/sitemap.xml\n`);
const by = g => pages.filter(p => p.group === g).length;
console.log(`SEO pages: ${pages.length + 1} (sports ${by("sport")}, difficulty ${by("diff")}, decades ${by("decade")}, teams ${by("team")}, types ${by("type")}), sitemap ${urls.length} URLs`);
