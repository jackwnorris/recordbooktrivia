import { getStore } from "@netlify/blobs";
import { createHash, randomUUID } from "node:crypto";
import BANK from "../lib/bank.mjs";
import { dayKey, startSession, markShown, submitAnswer, submitScore, leaderboard } from "../lib/core.mjs";

const json = (status, body) => new Response(JSON.stringify(body), {
  status, headers: { "content-type": "application/json", "cache-control": "no-store" } });

export default async (req, context) => {
  const sessions = getStore({ name: "daily-sessions", consistency: "strong" });
  const board = getStore({ name: "daily-board", consistency: "strong" });
  const path = new URL(req.url).pathname.replace(/^\/api/, "").replace(/\/$/, "");
  try {
    if (req.method === "GET" && path === "/leaderboard") {
      const u = new URL(req.url), day = u.searchParams.get("day") === "yesterday" ? -1 : 0;
      return json(...await leaderboard({ board, date: dayKey(day), sid: u.searchParams.get("sid") }));
    }
    if (req.method !== "POST") return json(405, { error: "method" });
    const body = await req.json().catch(() => ({}));
    if (path === "/daily") {
      const ipHash = createHash("sha256").update((context.ip || "0") + dayKey()).digest("hex").slice(0, 24);
      return json(...await startSession({ sessions, device: body.device, ipHash, bank: BANK, uuid: randomUUID }));
    }
    if (path === "/daily/show") return json(...await markShown({ sessions, sid: body.sid, i: body.i }));
    if (path === "/daily/answer") return json(...await submitAnswer({ sessions, sid: body.sid, i: body.i, choice: body.choice, extended: !!body.extended, bank: BANK }));
    if (path === "/daily/submit") return json(...await submitScore({ sessions, board, sid: body.sid, name: body.name }));
    return json(404, { error: "not_found" });
  } catch (e) {
    console.error(e);
    return json(500, { error: "server" });
  }
};
export const config = { path: "/api/*" };
