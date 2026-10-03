// Runs on every Netlify build: turns relative preview-image paths into full URLs and adds a canonical link.
import { readFileSync, writeFileSync } from "node:fs";
const base = (process.env.SITE_URL || process.env.URL || "").replace(/\/$/, "");
const f = "public/index.html";
let html = readFileSync(f, "utf8");
if (base) {
  html = html.replaceAll('content="og-image.png"', `content="${base}/og-image.png"`);
  if (!html.includes('rel="canonical"')) html = html.replace("</title>", `</title>\n<link rel="canonical" href="${base}/">\n<meta property="og:url" content="${base}/">`);
  writeFileSync(f, html);
  console.log("Preview URLs set to", base);
} else console.log("No URL env var found; preview image left relative.");
