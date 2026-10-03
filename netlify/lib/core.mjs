// Daily 10 leaderboard logic. Stores are passed in so this file can be tested without Netlify.
export const TZ = "America/Chicago";
export const DAILY_COUNT = 10;
const CLOCK = 20, EXTRA = 10, GRACE = 0.35, LATE_OK = 1.5, MAX_SESSIONS_PER_IP = 8;

export function dayKey(offsetDays = 0, now = Date.now()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" })
    .format(new Date(now + offsetDays * 864e5));
}
function seeded(seed){let s=seed>>>0;return()=>{s=(s+0x6D2B79F5)>>>0;let t=s;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296}}
export function pickIds(date, bankSize, n = DAILY_COUNT) {
  let h = 0; for (const c of "daily:" + date) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const r = seeded(h), a = Array.from({ length: bankSize }, (_, i) => i);
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a.slice(0, n);
}
const BAD = ["fuck","shit","bitch","cunt","nigg","fag","whore","slut","rape","penis","vagina","dick","cock","pussy","nazi","hitler"];
export function cleanName(raw) {
  let n = String(raw || "").normalize("NFKC").replace(/[^\p{L}\p{N} ._'-]/gu, "").replace(/\s+/g, " ").trim().slice(0, 16);
  const flat = n.toLowerCase().replace(/[^a-z]/g, "");
  if (!n || BAD.some(b => flat.includes(b))) n = "Anonymous";
  return n;
}
const view = s => ({ sid: s.sid, date: s.date, ids: s.ids, answers: s.answers.map(a => ({ c: a.c, ok: a.ok, pts: a.pts })),
  score: s.score, streak: s.streak, maxStreak: s.maxStreak, usedTime: s.usedTime, done: s.done, submitted: s.submitted, name: s.name || null });

export async function startSession({ sessions, device, ipHash, bank, now = Date.now(), uuid }) {
  if (!/^[A-Za-z0-9-]{8,64}$/.test(device || "")) return [400, { error: "bad_device" }];
  const date = dayKey(0, now);
  const existing = await sessions.get(`d/${date}/${device}`, { type: "json" });
  if (existing) { const s = await sessions.get(`s/${existing.sid}`, { type: "json" }); if (s) return [200, view(s)]; }
  const ipKey = `ip/${date}/${ipHash}`, ipRec = (await sessions.get(ipKey, { type: "json" })) || { n: 0 };
  if (ipRec.n >= MAX_SESSIONS_PER_IP) return [429, { error: "limit" }];
  const sid = uuid();
  const s = { sid, date, device, ipHash, ids: pickIds(date, bank.length), answers: [], score: 0, streak: 0, maxStreak: 0,
    usedTime: false, shown: null, shownAt: 0, done: false, submitted: false, created: now };
  await sessions.setJSON(`s/${sid}`, s);
  await sessions.setJSON(`d/${date}/${device}`, { sid });
  await sessions.setJSON(ipKey, { n: ipRec.n + 1 });
  return [200, view(s)];
}
async function load(sessions, sid) {
  if (!/^[A-Za-z0-9-]{8,64}$/.test(sid || "")) return null;
  return sessions.get(`s/${sid}`, { type: "json" });
}
export async function markShown({ sessions, sid, i, now = Date.now() }) {
  const s = await load(sessions, sid); if (!s) return [404, { error: "no_session" }];
  if (s.done || i !== s.answers.length) return [409, { error: "out_of_order" }];
  if (s.shown !== i) { s.shown = i; s.shownAt = now; await sessions.setJSON(`s/${sid}`, s); }
  return [200, { ok: true }];
}
export async function submitAnswer({ sessions, sid, i, choice, extended, bank, now = Date.now() }) {
  const s = await load(sessions, sid); if (!s) return [404, { error: "no_session" }];
  if (s.done || i !== s.answers.length || s.shown !== i) return [409, { error: "out_of_order" }];
  const [diff, answer] = bank[s.ids[i]];
  let clockMax = CLOCK;
  if (extended && !s.usedTime) { s.usedTime = true; clockMax += EXTRA; }
  const elapsed = Math.max(0, (now - s.shownAt) / 1000 - GRACE);
  const ok = typeof choice === "string" && choice === answer && elapsed <= clockMax + LATE_OK;
  let pts = 0;
  if (ok) {
    s.streak++; s.maxStreak = Math.max(s.maxStreak, s.streak);
    const speed = (clockMax - Math.min(elapsed, clockMax)) / clockMax, mult = Math.min(2, 1 + 0.1 * (s.streak - 1));
    pts = Math.round(100 * diff * (1 + 0.5 * speed) * mult);
  } else s.streak = 0;
  s.score += pts;
  s.answers.push({ c: typeof choice === "string" ? choice.slice(0, 80) : null, ok, pts, ms: Math.round(elapsed * 1000) });
  s.shown = null;
  if (s.answers.length >= s.ids.length) s.done = true;
  await sessions.setJSON(`s/${sid}`, s);
  return [200, { ok, answer, pts, score: s.score, streak: s.streak, done: s.done }];
}
export async function submitScore({ sessions, board, sid, name, now = Date.now() }) {
  const s = await load(sessions, sid); if (!s) return [404, { error: "no_session" }];
  if (!s.done) return [409, { error: "not_done" }];
  if (!s.submitted) {
    const entry = { name: cleanName(name), score: s.score, correct: s.answers.filter(a => a.ok).length,
      streak: s.maxStreak, ms: s.answers.reduce((t, a) => t + a.ms, 0), at: now };
    await board.setJSON(`${s.date}/${sid}`, entry, { onlyIfNew: true });
    s.submitted = true; s.name = entry.name; await sessions.setJSON(`s/${sid}`, s);
  }
  return leaderboard({ board, date: s.date, sid });
}
export async function leaderboard({ board, date, sid }) {
  const { blobs } = await board.list({ prefix: `${date}/` });
  const rows = (await Promise.all(blobs.slice(0, 1000).map(async b => {
    const e = await board.get(b.key, { type: "json" }); return e ? { ...e, sid: b.key.split("/")[1] } : null;
  }))).filter(Boolean);
  rows.sort((a, b) => b.score - a.score || b.correct - a.correct || a.ms - b.ms || a.at - b.at);
  const top = rows.slice(0, 50).map((r, i) => ({ rank: i + 1, name: r.name, score: r.score, correct: r.correct, me: r.sid === sid }));
  const myIdx = sid ? rows.findIndex(r => r.sid === sid) : -1;
  const me = myIdx >= 0 ? { rank: myIdx + 1, name: rows[myIdx].name, score: rows[myIdx].score, correct: rows[myIdx].correct } : null;
  return [200, { date, total: rows.length, top, me }];
}
