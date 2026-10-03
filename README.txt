RECORD BOOK: deploy with the daily leaderboard
==============================================

What's in here
  public/            The website (index.html, icons, preview image)
  netlify/functions/ The leaderboard API (/api/...)
  netlify/lib/       Scoring logic + the answer key (auto-generated on each build)
  scripts/           Build steps: sync the answer key, set full preview-image URLs
  netlify.toml       Tells Netlify how to build it

Why drag-and-drop won't work anymore
  Netlify Drop only hosts plain files. The leaderboard needs a server function,
  so deploy with the Netlify CLI (below) or by linking a GitHub repo.

Deploy with the Netlify CLI (one time setup, about 10 minutes)
  1. Install Node.js (nodejs.org, the LTS version).
  2. Unzip this folder, open Terminal in it, and run:
       npm install
       npm install -g netlify-cli
       netlify login
       netlify link            (pick your existing Record Book site)
       netlify deploy --build --prod
  3. Done. Future updates: just run  netlify deploy --build --prod  again.

Adding questions later
  Edit public/index.html only. The server's answer key regenerates on every build.

Where scores live
  Netlify Blobs (built into your site, free at this scale). Netlify dashboard:
  your site > Blobs > "daily-board" and "daily-sessions".
