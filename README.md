# Mastodon User Trends

**Live: https://obsesivegamer.github.io/Mastodon-User-Trends/**

Mastodon Network Pulse is a terminal-style dashboard for Mastodon. It shows how many accounts the
network has (**total users**), how many of them were active in the last 30 days (**monthly active
users**, MAU), how those two numbers change each day (**net change**), how many servers report, and
how many posts Mastodon servers publish per day. The daily history goes back to September 2022. It is
built from joinmastodon.org's public statistics, which only keep the last 30 days, plus the archive
kept in this repository.

It also has daily leaderboards for servers and for accounts with 10K+ followers, the most favourited
posts of the day and a decentralization meter. Its sibling for Bluesky is
[Bluesky Network Pulse](https://obsesivegamer.github.io/Bluesky-User-Trends/).

It's a static site: plain HTML, CSS and JavaScript, no build step, no tracking. GitHub Actions refresh
the data and commit it: the main data twice a day, the server data and the account data once a day
(see below).

## What's on the page

- **Ticker tape** with MAU, total users, the 7-day average net change of each, MAU as a share of total
  users, servers and posts per day, each with the week-over-week change of its 7-day average (pause
  button; static when reduced motion is on).
- **KPI cards**: monthly active users, total users (with a LIVE figure when the browser can read one),
  MAU health (net change of MAU), net signups (net change of total users) and servers, each with a
  trend for the selected range (WoW, MoM, ..., YoY) and a sparkline.
- **FediDB totals strip**: servers, posts and users on Mastodon-software servers from FediDB, the
  newest reading. A different base from the joinmastodon cards, labelled as such.
- **Charts** (Ctrl + scroll or pinch to zoom, drag to pan, arrow keys step through days on a focused
  chart, PNG and CSV export of the visible window):
  - `USR` net daily change. Modes: **MAU HEALTH** (default, change of monthly active users),
    **SIGNUPS** (change of total users), **GROWTH %**. Chips jump to the Nov 2022 and Jul 2023 waves
    and to the two 2024 windows that turned out to be flagged crawler steps.
  - `MAU` monthly active users.
  - `SRV` servers reporting to joinmastodon.org, or users per server; dots show FediDB's count of
    Mastodon-software servers.
  - `REC` posts per day, from consecutive daily readings of FediDB's post counter.
  - `RAT` ratios: MAU / total users (engagement), posts per MAU, users per server.
  - `TOT` total users; dots show FediDB's user count.
- **Command bar**: ranges `1W 1M 3M 6M YTD 1Y 2Y 3Y 4Y ALL` (default 1Y; one button per full year of
  history), 7-day moving average, log scale and a prior-period comparison (the same number of
  calendar days just before the range, drawn as a dashed line; pressing it on ALL switches to 1Y). Keys: `1`-`8`
  ranges (1W, 1M, 3M, 6M, YTD, 1Y, 2Y, ALL), `M` average, `L` log, `C` compare, `?` guide. The state
  is kept in the URL, e.g. `#r=1Y&ma=1&log=0&cmp=0`, so a view can be shared.
- **Leaderboards `LDR`**: pick SERVERS or ACCOUNTS. Servers: largest, most active (MAU), gainers,
  losers. Accounts: most followed, gainers, losers, most active. Top 25 each, gainers, losers and most
  active over 24H or 7D. **Top posts `PST`**: the 10 most favourited posts of the day among trending
  candidates, by listed accounts. **Decentralization `DEC`**: the share of users on the largest
  server, the top 5 and top 10, and how many servers hold half of all users. See "Leaderboards and
  server data" below.
- **Data table** of the last 30 days in the range, a link to the full CSV, milestones, FAQ,
  definitions, sources and a guide dialog that explains every control.

## Metric definitions

- **Total users**: joinmastodon.org's `user_count`: accounts on all servers that report to its
  statistics. It is not registrations. It can fall when a server stops reporting or accounts are
  removed, and it includes accounts that never became active. Each day's value is the figure the API
  lists for that UTC day, stored after the day ended (10.50M on 2026-10-11).
- **Monthly active users (MAU)**: `active_user_count`: accounts active in the trailing 30 days. A
  rolling window, not a daily count: a day's change is the activity of the day that entered minus the
  day that left, so it moves slowly. It is the headline of the page since 2026-09-07.
- **MAU health** and **net signups**: today's value minus yesterday's, for MAU and for total users.
  Both are **net**: new accounts minus deleted ones and minus servers that stop reporting, plus
  servers that start. Net signups is therefore not registrations. MAU health is the primary view
  because total users also moves when servers join or leave the count. Growth % is the change as a
  share of the previous day's value, for the metric you picked last.
- **Servers**: joinmastodon.org's `server_count`. The archive holds it only for days where a source
  carried it (from 2022-12-01, with holes), so its history is shorter than the user counts.
- **Posts per day**: the difference between two consecutive daily readings of FediDB's cumulative
  status counter for servers running Mastodon software. One reading is stored per day, taken about
  3 hours after the day ended, so a day's figure can be off by the hours between readings. A counter
  that moved backwards is dropped. The first figure appears once two consecutive readings exist
  (the first reading is from 2026-10-11).
- **Ratios**: MAU / total users (engagement); posts per MAU divides FediDB posts by joinmastodon MAU,
  two sources, so read its trend, not its level; users per server divides total users by servers.
- **FediDB totals** (servers, posts, users) cover Mastodon-software servers only and are a different
  base from joinmastodon's (8.82M users against 10.50M on 2026-10-11). They are labelled and never
  mixed into the joinmastodon series.
- **Not available**: Mastodon has no public per-day counts of likers, posters or blockers and no
  global account index. The page has no daily active users, daily posters or "most blocked" boards
  like its Bluesky sibling, and does not estimate them.

### Gaps and flagged days

- A day without a row is a gap: nothing is interpolated. The only such days in the archive are
  2022-12-07 and 2022-12-08, which the API itself lists with zero counts. 320 other missing days
  were back-filled from Wayback Machine captures (see [data/README.md](data/README.md)).
- joinmastodon's `user_count` is a sum over the servers its crawler reaches, so it also jumps when a
  block of accounts enters or leaves that sum. Days where the source jumped by a step that reversed
  within days, or that no real event explains, are **flagged** (`flags` on the row). A flagged value
  is treated as missing everywhere: a gap in the charts, and left out of averages, net changes, peaks,
  ATH, comparisons and ratios. The raw value stays in `historicalData.js`. Flagged days are drawn as a
  shaded band with a FLAGGED legend and show "flagged" in the data table.
- Real surges are not flagged: the Nov 2022 Twitter wave and the Jul 2023 Threads wave are many
  same-direction days that never return. The Feb 2024 and Sep 2024 "surges" are flagged: one-day
  jumps of about 0.9M accounts in the total that reversed 4 and 39 days later without a matching
  move in MAU.
- How many and by what rules (2026-10-12 build, 1,471 rows): 138 rows carry a flag (126 `total`, 44
  `active`, 1 `servers`). The rules live in `lib/flags.js`: `KNOWN_STEPS`, a hand-checked table of 13
  entries (9 one-day steps, 4 plateaus that outlast the rolling window) and `ROLLING`, a per-metric
  rule for glitches that revert within 14 days (plus a companion rule that flags MAU on the same
  days as a block-sized total excursion). A reverting glitch is flagged only after the series has
  come back and the next day confirms it, so the newest days are never flagged by it. A flag, once
  written, is not changed by later rows (checked by replaying every daily run). A step that does
  not revert is shown at face value until it is added to `KNOWN_STEPS`. See
  [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md#flags-and-the-daily-replay-stability-property).

## Leaderboards and server data

These panels use a different pipeline from the charts above: FediDB's server list and each server's
own public Mastodon API, collected by `.github/workflows/collect-servers.yml` and
`.github/workflows/collect-social.yml`.

### What each board means

- **Servers** (FediDB, Mastodon software, the 100 largest by users are tracked):
  - **Largest**: registered users per server.
  - **Active (MAU)**: monthly active users each server reports.
  - **Gainers and losers** (`24H`, `7D`): the **net** change in registered users between two of our
    daily snapshots. Net, not gross: a server can lose users after a clean-up.
- **Accounts** (profiles read from each account's own server):
  - **Most followed**: followers as the account's server reports them at the last daily run.
  - **Gainers and losers** (`24H`, `7D`): the **net** change in followers between two daily
    snapshots, unfollows included.
  - **Most active** (`24H`, `7D`): the net change in the account's post count. Replies and boosts count
    as posts and deleted posts are subtracted.
- **Top posts of the day**: posts created on the previous UTC day by listed accounts, ranked by
  favourites as the author's server showed them when collected. Candidates are the trending posts of
  the scanned servers, so a popular post that never trended there can be missed. The data file holds
  up to 25 posts and the page shows the top 10. A post with no text shows `[image]`, `[video]` or
  `[link]`.
- **Decentralization**: the share of FediDB's total user count held by the largest server, the 5
  largest and the 10 largest, and how many servers are needed for half of all users ("more than 100"
  if the listed 100 do not reach it).

Gainers, losers and most active need a snapshot of the right age (20 to 36 hours for 24H, 6 to 8 days
for 7D), so they stay empty after the first run and fill in over the first week. The page says how
many of the last 7 days have been collected.

### Honest coverage

Mastodon has no global account index. The account list is built from the profile directories and
trending posts of the 40 largest servers, plus accounts they follow and accounts listed earlier. Only
accounts that opted into discoverability can appear, and large accounts on other servers are missed:
the list is a sample of the network, not a ranking of every account, and the page says so
(`coverage.note`). The collector run on 2026-10-12 found 52,637 candidate accounts on 40 servers.

### Guardrails

Enforced in `lib/social.js`, re-checked in `social.js` before drawing:

- An account is named only if its own server reports **at least 10,000 followers**, it is
  **discoverable**, it is **not a bot, locked, a group or marked no-index** (and `indexable` is not
  false), it is **not suspended, limited, a memorial or moved**, and the handle matches the server that
  serves its profile. Everyone else still counts toward the server totals but is never listed.
- A top post needs a listed author, visibility **public**, **not marked sensitive**, **no content
  warning**, to not be a boost, to be created on the reported UTC day and to live on the author's own
  server. Post text is shortened to 280 characters.
- Avatars are shown only from an https URL, without credentials or a port, whose host is in
  `AVATAR_HOSTS` (an allow-list of Mastodon media hosts); anything else is a blank placeholder.
- The collector refuses to write `data/social.js` if any listed account or post breaks these rules,
  and the page applies them again when it renders.
- **Privacy**: nothing below the 10,000-follower line, and no raw candidate list, is ever written to
  the repository. The collector keeps no state between runs and the workflow caches nothing; the only
  history is up to 8 daily follower and post-count snapshots of listed-eligible accounts inside
  `data/social.js`.

### Schedule

`collect-servers.yml` runs at **02:37 UTC**, `collect-social.yml` at **04:07 UTC**, each once a day,
and each commits only its own file (`data/servers.js`, `data/social.js`). A failed or clearly worse
run writes nothing and leaves the previous file on the page. Details: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Data sources and credits

- **Users, monthly active users, servers:** the
  [joinmastodon.org statistics API](https://api.joinmastodon.org/statistics), read twice a day with a
  User-Agent that links back here. It returns only the last 30 to 31 days; the history is the archive
  kept in this repository. The API publishes no licence or terms for these aggregate counts.
- **Gap fill 2023-2026:** captures of that API in the
  [Internet Archive Wayback Machine](https://web.archive.org/): 320 missing days back-filled on
  2026-10-12 (details and the full note in [data/README.md](data/README.md)).
- **Posts, users and servers on Mastodon software; server list:** [FediDB](https://fedidb.com/)
  (`api.fedidb.org/v1`) by [@dansup](https://mastodon.social/@dansup). No licence or terms found;
  used with credit and gently (one request every 3 seconds).
- **Account directories, trending posts, profiles:** each Mastodon server's own public API
  (unauthenticated).
- **Charts:** [Chart.js](https://www.chartjs.org/) 4.5.1,
  [chartjs-plugin-zoom](https://github.com/chartjs/chartjs-plugin-zoom) 2.0.1 and
  [Hammer.js](https://hammerjs.github.io/) 2.0.8. Fonts: IBM Plex Sans and JetBrains Mono.

The code is MIT licensed (see [LICENSE](LICENSE)). The data in `data/` is derived from the sources
above and stays under their terms; names, avatars and post text in `data/social.js` belong to the
people who wrote them. [data/README.md](data/README.md) lists which columns come from where, what was
changed and the terms.

## How it works

```
GitHub Action (03:17 and 15:17 UTC)
  node updateData.js → node --check script.js → npm test → npm run prerender
  → commit historicalData.js, data/, index.html, sitemap.xml → GitHub Pages
GitHub Action (02:37 UTC)
  node scripts/collect-servers.js → commit data/servers.js
GitHub Action (04:07 UTC)
  node --check → node scripts/collect-social.js → validate data/social.js → commit data/social.js
Browser
  index.html (numbers already filled in) → historicalData.js → script.js
  → data/servers.js, data/social.js → social.js
```

The statistics API only keeps the last 30 days, so the archive is built by the Action and committed.
The updater also writes the latest numbers, milestones, ticker, FediDB strip and structured data into
`index.html`, so search engines and readers without JavaScript see current values, and the page
paints the same strings after it loads. Besides the files in this repo, the browser loads Chart.js,
Hammer.js and the zoom plugin from jsDelivr, fonts from Google Fonts, the current figure from
`api.joinmastodon.org` (if that fails or looks wrong the page stays in **ARCHIVE** mode) and, for the
leaderboards, profile pictures from an allow-list of Mastodon media hosts. `data/servers.js` and
`data/social.js` are optional: if one is missing or invalid, its panels show their "collecting" state
and the rest of the page works. Each of those hosts sees the visitor's IP address; there are no
analytics or cookies.

Details, the data file formats and the pre-render contract: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Run it locally

You need Node 22 or newer for the scripts and tests, and any static file server for the page.

```bash
git clone https://github.com/obsesivegamer/Mastodon-User-Trends.git
cd Mastodon-User-Trends
npm run serve          # python3 -m http.server 8000 → http://localhost:8000
```

Opening `index.html` straight from disk also works: the data files are classic scripts, not fetched.

### Test

```bash
npm test               # node --test script.test.js: 27 cases, no network, never touches the real files
```

### Update the data

```bash
npm run update         # node updateData.js: fetch, rebuild historicalData.js and data/mastodon-daily.csv, pre-render index.html and sitemap.xml
npm run prerender      # re-render index.html and sitemap.xml from the committed archive only (no network)
```

`npm run prerender` takes `--dry-run`, `--data`, `--index`, `--sitemap` and `--generated`
(`node lib/prerender.js --dry-run` reports without writing).

### Collect the server and account data

```bash
npm run servers        # node scripts/collect-servers.js → data/servers.js (4 requests, about 15 seconds)
npm run social         # node scripts/collect-social.js  → data/social.js (stops at its 35-minute time budget)
```

Both read `DATA_DIR` (default `data/`) for where the file is read and written; point it somewhere else
for a trial run. `collect-servers.js` also takes `--accept-drop` (or `SERVERS_ACCEPT_DROP=1`) to accept
a level change of more than 20 percent that it would otherwise refuse; use it only after checking the
drop is real. `collect-social.js` reads `NOW` (ISO time) for tests. Both send a User-Agent that links
back to this repository and respect each server's rate limit headers.

### Back-fill missing days

```bash
node scripts/backfill-history.js                 # offline dry run against .cache/backfill-history/
node scripts/backfill-history.js --fetch --write # download needed Wayback captures and update historicalData.js
```

Existing rows always win; only missing dates are added, and flags are recomputed. Wayback is slow
and refuses clients that ask faster than about 10 requests a minute, so downloads are paced and
cached. Options: `--all`, `--fill-servers`, `--wayback-limit N`, `--gap-ms N`, `--hist FILE`,
`--report FILE`. After a back-fill run `npm run update` to rebuild the CSV and the page.

### End-to-end check in a browser

`scripts/verify-dashboard.py` drives the page in Chromium with Playwright. Use any Python that has
Playwright; a virtual environment avoids the "externally managed environment" error of Homebrew and
recent Debian and Ubuntu Pythons (`.venv/` is git-ignored):

```bash
python3 -m venv .venv && .venv/bin/pip install playwright && .venv/bin/python -m playwright install chromium
.venv/bin/python -I scripts/verify-dashboard.py all        # serves the repo on a free port
.venv/bin/python -I scripts/verify-dashboard.py smoke --url https://obsesivegamer.github.io/Mastodon-User-Trends/
```

Subcommands: `doctor`, `smoke`, `status`, `kpi`, `ranges`, `toggles`, `compare`, `keyboard`, `modes`,
`surges`, `gaps`, `hud`, `exports`, `table`, `social`, `prerender`, `responsive`, `guide`, `meta`,
`all`. `--url` points any of them at another copy of the site, `--headed` shows the browser and
`--json FILE` saves the results. The statistics request the page makes for its LIVE figure is always
intercepted, so `status` can force the LIVE, ARCHIVE, partial-day, garbage and timeout states.
Screenshots land in `artifacts/verify-mastodon-trends/`. The project's verify skill,
`.claude/skills/verify-mastodon-trends/SKILL.md`, lists what each command proves.

### Local scheduled runs

`updateDaily.sh` (macOS and Linux) and `updateDaily.ps1` (Windows) run `node updateData.js` on your
machine; `installLaunchAgent.sh` and `installTaskScheduler.ps1` schedule them at 03:00 local time.
They predate the Actions and are not needed. Be aware of what they do:

- `updateDaily.sh` stages and commits only `historicalData.js` (then rebases and pushes). The updater
  also rewrites `data/mastodon-daily.csv`, `index.html` and `sitemap.xml`; those stay modified and
  uncommitted, and the CSV on GitHub falls behind until the Action's next run.
- `updateDaily.ps1` only runs the updater and logs to `updateData.log`; it commits nothing.
- Neither runs the tests, the server collector or the social collector.
- Run alongside the Actions, they race the 03:17 run and can take the day's FediDB reading at a
  different hour. Use one or the other.

## Deploy your own copy

1. Fork the repo.
2. **Settings, Pages**: deploy from the `master` branch, `/ (root)`.
3. Open the **Actions** tab and enable workflows (a fork starts with them, and their schedules,
   disabled). Run **Update Mastodon Data**, **Collect Mastodon Server Data** and **Collect Mastodon
   Social Data** once each; after that they run on their schedules. The leaderboards fill in over the
   first days (see "Leaderboards and server data"). The workflows ask for `contents: write` so they
   can commit; if your account or organisation limits the token to read-only, allow write access under
   **Settings, Actions, General, Workflow permissions**. No secrets are needed.
4. Change the site and repository URLs: `SITE_URL`, `CSV_URL` and `REPO_URL` in `lib/prerender.js`,
   `SITE_URL` in `script.js`, every `obsesivegamer` URL in `index.html` (canonical, Open Graph,
   Twitter, footer, the CSV "sources and terms" link, and drop the `google-site-verification` and
   `rel="me"` tags, which are the maintainer's), `robots.txt`, `sitemap.xml`, and `homepage` and
   `repository` in `package.json`. Change the contact URL in the User-Agent of `updateData.js`,
   `scripts/collect-servers.js`, `scripts/collect-social.js` and `scripts/backfill-history.js`.
   `scripts/verify-dashboard.py` reads `SITE_URL` from `lib/prerender.js`. `og-image.png` has the
   name drawn into it; replace the image or leave it.
5. Search engines don't read a `robots.txt` that sits under a project path such as
   `/Mastodon-User-Trends/robots.txt` (only `/robots.txt` at the host root counts), so its `Sitemap:`
   line is informational. Submit `sitemap.xml` in Google Search Console or Bing Webmaster Tools if you
   want it crawled from the sitemap.

## Known limitations

- Total users is a crawler sum, not a registration count: it falls when servers leave it and jumps
  when blocks of accounts enter or leave. The worst such steps are flagged and treated as missing, but
  the rules are judgement calls (`lib/flags.js`), and a new step is only flagged once it reverses or
  is added by hand to `KNOWN_STEPS`.
- MAU is a trailing 30-day window of accounts joinmastodon.org's crawler could see, not unique people.
- Net change is net: it cannot be read as sign-ups.
- Posts per day comes from FediDB and covers Mastodon software only. It starts with the first stored
  reading (2026-10-11) and one reading per day is stored, so a missed 03:17 run leaves a gap instead
  of a late reading.
- FediDB and joinmastodon count different things (8.82M against 10.50M users): they are never mixed.
- Everything depends on joinmastodon.org's statistics and FediDB. If they stop, the page keeps the
  archive but stops growing. joinmastodon's API also revises its own history after the fact (32 of 512
  compared days differ between a capture and the archive, nearly all by block-sized steps).
- Two days, 2022-12-07 and 2022-12-08, are missing because the API itself lists them with zero
  counts.
- The `servers` series starts on 2022-12-01 and has holes where no source carried it.
- The account list and top posts are a sample, not a census: they come from server directories and
  trending posts of 40 servers, only discoverable accounts appear, and large accounts elsewhere are
  missed. Top posts are trending candidates ranked by favourites.
- Gainers, losers and most active are net changes between daily snapshots: they need history, and a
  server or account that is missed on a day has no value for that day.
- Follower and post counts are as each account's own server reported them when collected and may
  have changed since.
- GitHub can delay scheduled Actions, so a refresh can land later than 03:17 or 15:17 UTC.

## License

MIT. See [LICENSE](LICENSE). Data terms: [data/README.md](data/README.md).
