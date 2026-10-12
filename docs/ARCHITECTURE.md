# Architecture

Mastodon Network Pulse is a static page on GitHub Pages. Nothing runs on a server. Three scheduled
GitHub Actions read public data, rewrite committed data files and commit them; the browser reads
those files. The only request the page makes to a third party for data is an optional, best-effort
read of the current figure from the joinmastodon.org statistics API (the LIVE badge).

| Action | When (UTC) | Reads | Commits |
|---|---|---|---|
| `update-data.yml` "Update Mastodon Data" | `17 3,15 * * *` and manual | joinmastodon.org statistics API, FediDB `software/mastodon` | `historicalData.js`, `data/`, `index.html`, `sitemap.xml` |
| `collect-servers.yml` "Collect Mastodon Server Data" | `37 2 * * *` and manual | FediDB `software/mastodon` and `servers` | `data/servers.js` |
| `collect-social.yml` "Collect Mastodon Social Data" | `07 4 * * *` and manual | FediDB `servers`, then the public API of the largest servers | `data/social.js` |
| `test.yml` "Tests" | every push, pull request, manual | the repository | nothing |

## Data flow

### Archive (users, MAU, servers, posts per day)

1. `node updateData.js` GETs `https://api.joinmastodon.org/statistics`: an array of the last 30 to 31
   UTC days, `{period, server_count, user_count, active_user_count}` as strings.
2. `normalizeStats` drops today's partial day, future and invalid records. `mergeRows` appends new
   days; a day already in the archive keeps its values and only gains `servers` if it lacked it.
   A 20 percent outlier guard rejects partial aggregates (see "Schedule and failure handling").
3. Once per run, only when the newest complete day (yesterday, UTC) has no FediDB reading yet and the
   run starts before 12:00 UTC, it GETs `https://api.fedidb.org/v1/software/mastodon` and stores
   `status_count`, `user_count` and `instance_count` on that day's row as `statuses`, `fedi_users`,
   `fedi_instances`. An existing reading is never overwritten; a FediDB failure only logs a warning.
4. `lib/flags.js` recomputes `flags` for the whole archive.
5. `historicalData.js` and `data/mastodon-daily.csv` are written, then `lib/prerender.js` re-renders
   `index.html` and `sitemap.xml` from the final rows. Files are written only if their text changed.
6. The workflow then runs `node --check script.js`, `npm test` and `npm run prerender` (a second,
   idempotent pass), and commits `historicalData.js data index.html sitemap.xml` if anything changed.
   A failing test commits nothing.

### Server data

`node scripts/collect-servers.js` reads FediDB `software/mastodon` (totals) and `servers?software=mastodon`
(40 per page, cursor paged, up to 5 pages, normally 3), keeps the 100 largest by users, reads the
previous `data/servers.js` for its snapshot history, builds the boards, decentralization shares and
coverage with `lib/servers.js`, validates, refuses a clearly worse file, and writes `data/servers.js`
atomically.

### Account and post data

`node scripts/collect-social.js` (logic in `lib/social.js`):

1. Takes the 40 largest Mastodon servers by FediDB users.
2. On each: up to 3 pages of `GET /api/v1/trends/statuses?limit=40&offset=N` (trending posts, their
   authors become candidates) and the profile directory `GET /api/v1/directory?limit=80&offset=N&order=active&local=true`
   (up to 200 pages, stopping early when a page ends with an account whose last post is older than
   90 days, or after 8 minutes on that server).
3. Adds the accounts already in `data/social.js` (so a listed account persists) and, for 250 accounts
   chosen by a daily hash, the accounts they follow (`/api/v1/accounts/<id>/following?limit=80`).
4. Reads every candidate from the server that serves its profile (`/api/v1/accounts/lookup?acct=`,
   at most 2,500 per pass and two passes, accounts already known first, then accounts of 5,000 or more
   followers). Nothing learned
   through another server is used as a value until the account's own server confirms it.
5. Applies the guardrails, ranks the boards, re-fetches each top-post candidate from its origin server
   (`/api/v1/statuses/<id>`), appends today's follower and post-count snapshot of the eligible
   accounts, validates with `validateSocial`, and writes `data/social.js` atomically.

No raw pool, no sub-10K account and no local state file exists: `data/social.js` is the only output
and its `history` holds only eligible accounts (see "Guardrails").

### Browser

`index.html` already holds the current numbers (pre-rendered), then loads in this order:

1. Chart.js 4.5.1, Hammer.js 2.0.8 and chartjs-plugin-zoom 2.0.1 from jsDelivr (pinned versions,
   Subresource Integrity hashes).
2. `historicalData.js?v=STAMP`: `const historicalData = [...]` (cache-busted by the build stamp).
3. `script.js?v=12`: charts, KPI cards, ticker, ranges, compare, exports, LIVE badge.
4. `data/servers.js`, `data/social.js` (optional; no cache-bust query) and `social.js?v=1`, which builds
   the LDR, PST and DEC panels from `window.MASTODON_SERVERS` and `window.MASTODON_SOCIAL` and does
   not depend on `script.js`.
5. `style.css?v=12` and `social.css?v=1` in `<head>`; fonts from Google Fonts.

`script.js` also fetches `https://api.joinmastodon.org/statistics` once on load (5 second timeout,
`credentials: 'omit'`, `cache: 'no-store'`). The newest entry that passes `acceptLiveStats` becomes the
LIVE figure on the total users card and the ticker; any failure leaves the page in ARCHIVE mode. The
charts always use the archive's values. `lib/format.js` is not loaded by the browser: `script.js` and
`social.js` each carry an identical copy of the formatters so the pre-rendered strings and the painted
strings match.

## File map

| Path | Role |
|---|---|
| `index.html` | The page: head and SEO, JSON-LD, header, ticker, command bar, KPI cards, FediDB totals strip, charts, the three social panels, data table, milestones, FAQ, definitions, guide dialog. Holds the pre-render markers. |
| `style.css` | Design system (amber on obsidian, dark only). |
| `script.js` | All page logic apart from the social panels. Pure helpers are exported through `module.exports` (loadable in Node with no DOM) and used by `script.test.js` and `lib/prerender.js`. |
| `social.js`, `social.css` | The LDR, PST and DEC panels. Self-contained; re-checks the guardrails before drawing; every data file is optional. |
| `favicon.svg`, `og-image.png`, `robots.txt` | Icon, social card (1200 x 630), crawler file. |
| `sitemap.xml` | `<lastmod>` follows the last complete day in the archive. |
| `historicalData.js` | The archive the page loads (Contract R). Generated; one row per UTC day. |
| `data/mastodon-daily.csv` | The same rows as CSV, plus net changes; the downloadable dataset. |
| `data/servers.js` | Server boards and decentralization (Contract S). Generated by `scripts/collect-servers.js`. |
| `data/social.js` | Account boards and top posts (Contract A). Generated by `scripts/collect-social.js`. |
| `data/README.md` | Sources, terms, changes made to the data, the Wayback gap-fill note. |
| `updateData.js` | The updater the `update-data.yml` Action runs (fetch, merge, flag, write CSV, pre-render). Also exports `main`, `normalizeStats`, `mergeRows`, `parseFedi`, `serializeJs`, `serializeCsv`, `parseArchive`. |
| `lib/format.js` | Number and date formatters (`window.MastodonFormat` or `require`). The contract for the strings; `script.js` and `social.js` mirror it. |
| `lib/flags.js` | Pure flag rules: `KNOWN_STEPS`, `ROLLING`, `detect`, `flagRows`, `isFlagged`. |
| `lib/prerender.js` | Pure pre-render: `prerenderIndex`, `buildJsonLd`, `updateSitemap`, plus a CLI (`npm run prerender`). |
| `lib/servers.js` | Pure logic for Contract S: normalising FediDB rows, snapshots, baselines, boards, decentralization, validation, refusal rules, file format. |
| `lib/social.js` | Pure logic for Contract A: guardrails, text and URL cleaning, `AVATAR_HOSTS`, boards, snapshots, top-post selection, `validateSocial`, file format. |
| `scripts/collect-servers.js` | The server collector (`npm run servers`). |
| `scripts/collect-social.js` | The account and top-post collector (`npm run social`). |
| `scripts/backfill-history.js` | One-off, re-runnable back-fill of missing days from Wayback Machine captures (offline unless `--fetch`). |
| `scripts/verify-dashboard.py` | Playwright end-to-end harness (see "Verification"). |
| `script.test.js` | The repo's test gate (`npm test`), 27 `node:test` cases. |
| `package.json` | Scripts `test`, `update`, `prerender`, `servers`, `social`, `serve`; Node 22 or newer; no dependencies. |
| `.github/workflows/*.yml` | The four workflows above. Actions are pinned by commit SHA. |
| `.github/dependabot.yml` | Monthly updates of the SHA-pinned Actions. |
| `.claude/skills/verify-mastodon-trends/SKILL.md` | The project's verify skill: how to run the harness and what each command proves. |
| `LICENSE` | MIT. |
| `updateDaily.sh`, `updateDaily.ps1`, `installLaunchAgent.sh`, `uninstallLaunchAgent.sh`, `installTaskScheduler.ps1`, `uninstallTaskScheduler.ps1` | Optional local scheduling of `updateData.js` (macOS LaunchAgent, Windows Task Scheduler). Not used by the Actions. See "Local scheduled runs". |
| `test.html`, `extractFull.js`, `planned-features.md`, `.agent/CONTINUITY.md` | Earlier history: the raw page the first archive was extracted from, the extractor, an old roadmap and agent notes. Nothing in the page or the workflows reads them. |
| `.cache/`, `artifacts/`, `.state/`, `.reviews/` | Git-ignored scratch: the back-fill's downloaded captures, harness screenshots, review notes. |

## Data contract R: `historicalData.js`

A classic script, so the page also works from `file://`:

```js
const historicalData = [
  {
    "date": "2026-10-11",
    "total": 10503903,
    "active": 728997,
    "servers": 7384,
    "statuses": 1017649837,
    "fedi_users": 8818464,
    "fedi_instances": 8694
  }
];
```

`serializeJs` writes `JSON.stringify(rows, null, 2)` (one key per line, 2-space indent, no trailing
newline). Rows are ascending and unique by `date`; keys appear in the order below, unknown keys are
kept after them.

| Key | Meaning |
|---|---|
| `date` | UTC day, `YYYY-MM-DD`. Only complete days are stored. |
| `total` | joinmastodon `user_count` for that day: accounts on all servers that report. Required. |
| `active` | joinmastodon `active_user_count`: monthly active users (trailing 30 days). Required. |
| `servers` | Optional. joinmastodon `server_count`. Present only where the live API window or a Wayback capture carried it (first on 2022-12-01). |
| `statuses` | Optional. FediDB cumulative post count for Mastodon software: one reading, the first after that day ended, taken by the 03:17 UTC run (or a manual run before 12:00 UTC). Never overwritten. Accepted only if it is not below the last stored reading from the previous 7 days and has not grown by more than 20 percent per elapsed day. |
| `fedi_users`, `fedi_instances` | Optional. FediDB `user_count` and `instance_count` from the same reading. A different base from `total` and `servers`: never mixed. |
| `flags` | Optional. Subset of `total`, `active`, `servers`, `statuses` (in that order) naming metrics unreliable that day. `statuses` covers `fedi_users` and `fedi_instances` too (`FLAG_OF` in `script.js`). Absent when nothing is flagged. |

Consumer rules (`script.js`, `lib/prerender.js`, the CSV):

- A flagged metric is missing: a gap in the charts, left out of averages, net changes, peaks, ATH,
  prior-period comparisons and ratios. The raw value stays in the file.
- A calendar day with no row is a gap too. `normalizeDays` inserts an empty placeholder per missing
  day so every index step is one UTC day. Nothing is interpolated.
- A net change (`value[d] - value[d-1]`) exists only when both days are present and usable. A flagged
  day therefore also removes the following day's net change.
- Posts per day is `statuses[d] - statuses[d-1]`, needing both readings; a negative difference is
  dropped as a bad reading.

### `data/mastodon-daily.csv`

Header `date,total,active,servers,statuses,fedi_users,fedi_instances,net_total,net_active,flags`.
Every archive row, in date order, with `\n` line endings. Empty cells for absent values. `net_total`
and `net_active` are blank unless the previous calendar day has a row and both values are present and
unflagged. `flags` are joined with `|`. Flagged values themselves are written as stored. Only
numbers, dates and flag keys can appear, so no cell needs quoting.

## Data contract S: `data/servers.js`

```js
// generated by scripts/collect-servers.js — do not edit
window.MASTODON_SERVERS = {"schema":1, ...};
```

One line of JSON. Parsed back by `parseScript` with `JSON.parse` only (nothing is evaluated).

| Field | Meaning |
|---|---|
| `schema` | `1` |
| `generated_at` | ISO time of the run |
| `day` | UTC day of the run (the snapshot day) |
| `source` | `fedidb` |
| `totals` | `{users, statuses, servers, mau}` from `software/mastodon`: `user_count`, `status_count`, `instance_count`, and `monthly_actives` (or `monthly_active_users`), `null` when absent |
| `servers` | The 100 largest by users, descending, unique domains: `{domain, users, mau, statuses, open, version}`. `mau` and `version` can be `null`; `open` is `open_registration === true`. Only plain lowercase DNS names pass. |
| `boards` | `largest` (users), `active` (MAU, servers with MAU above 0), `gainers_24h`, `losers_24h`, `gainers_7d`, `losers_7d`: at most 25 rows each, `{domain, value}`, only listed servers. Gainers and losers are the net change in users against a baseline snapshot, only for servers present in it; empty until a baseline exists. |
| `decentralization` | `{top1, top5, top10, top1_domain, servers_for_half, listed, denominator}`. Shares are fractions (0..1, 4 decimals) of `totals.users`, the FediDB total, not of the listed servers. `servers_for_half` is the count of largest servers whose users reach half of `totals.users`, or `null` when the listed servers do not reach it. `denominator` is `"totals.users"`. |
| `coverage` | `{days_7d, first_day}`: distinct snapshot dates in the 7 UTC days ending on `day` (1 to 7) and the oldest snapshot date |
| `history` | Up to 8 daily snapshots, ascending: `{date, at, users: {domain: users}}` for the top 100. `at` is the ISO time the snapshot was taken. The baseline for gainers and losers. |

Baselines: the 24h board uses the snapshot aged 20 to 36 hours closest to 24 hours, the 7d board the
one aged 6 to 8 days closest to 7 days (`BASELINES` in `lib/servers.js`). There is one snapshot per UTC
date and a rerun on the same day keeps the first one, with ages measured from that snapshot's own
time, so a rerun cannot move the baseline or empty the 24h boards.

`validateServers` runs before the write and throws on any of: wrong schema or source, fewer than 50 or
more than 100 servers, unsorted or duplicate domains, listed users above the FediDB total, a board row
that is not a listed server or is unsorted or has the wrong sign or does not match the server row,
decentralization values that differ from a recomputation, history that is not ascending, or a newest
snapshot that is not `day`.

## Data contract A: `data/social.js`

```js
// generated by scripts/collect-social.js — do not edit
window.MASTODON_SOCIAL = {"schema":1, ...};
```

`<`, U+2028 and U+2029 are escaped so the JSON can never close its script element.

| Field | Meaning |
|---|---|
| `schema` | `1` |
| `generated_at` | ISO time of the run |
| `day` | The UTC day the top posts describe: the day before the run's date. (The follower snapshot is taken on the run's date; the page's "AS OF" tag shows the newest snapshot date.) |
| `coverage` | `{days_7d, first_day, pool, servers_scanned, note}`: snapshot dates within the 7 days ending on the run date, the oldest snapshot date, how many candidate accounts were found, how many servers answered, and the sentence the page shows that the list is not exhaustive |
| `guardrails` | `{min_followers: 10000, identity: "serving-host", rules: [string, ...]}`, stated on the page |
| `accounts` | Map `acct` to a record, holding exactly the accounts referenced by a board or a top post. The key is the full lowercase `username@host` of the server that serves the profile. Record: `{acct, display_name, avatar, url, followers, following, posts, last_posted, created_at, domain}`. `avatar` is `null` unless the host is in `AVATAR_HOSTS`; `last_posted` and `created_at` are `YYYY-MM-DD` or `null`; `posts` is the server's `statuses_count`. |
| `boards` | `followed` (value = followers), `gainers_24h`, `losers_24h`, `gainers_7d`, `losers_7d` (value = net change in followers against a baseline snapshot), `active_24h`, `active_7d` (value = net change in `statuses_count`, gainers only). At most 25 rows of `{acct, value}`, eligible accounts only. Gainers, losers and active are empty until a baseline snapshot of the right age exists (`BASELINES` in `lib/social.js`, same 20 to 36 hours and 6 to 8 days as the servers). |
| `top_posts` | At most 25, by `favourites` descending: `{url, author, text, created_at, favourites, reblogs, replies, embed, language}`. `author` is an `accounts` key; `text` is plain text of at most 280 characters (`""` when the post has none); `embed` is `image`, `video`, `link` or `null`; `language` is a language code or `null`. The page shows 10. Trending candidates re-read from their origin server, not every post. |
| `history` | Up to 8 daily snapshots, ascending: `{date, at, followers: {acct: n}, posts: {acct: n}}` for the eligible accounts (up to the 2,000 with most followers). One snapshot per UTC date; the first run of a date keeps its values, a rerun only adds accounts the snapshot lacks. This is the baseline for gainers, losers and active. |

`validateSocial` (in `lib/social.js`) checks shape, board ordering and signs, that every referenced
account exists and every account is referenced, that every account and every history entry has at
least 10,000 followers and a lowercase `user@domain` key on the server named in its profile URL,
that board values equal the account records and the baseline snapshot, post dates, counts, embed and
language values, text length and control characters, and that avatars are `null` or allow-listed.
The collector throws before writing if it finds any problem.

## Guardrails

Enforced in `lib/social.js` (`isEligibleAccount`, `toAccount`, `selectTopPosts`, `validateSocial`) and
checked again in `social.js` before drawing.

An account is published only if all of these hold, as the account's own server reports them:

- `followers_count >= 10000` (`MIN_FOLLOWERS`);
- `discoverable === true` (it opted into the profile directory);
- not `bot`, `locked`, `group` or `noindex`, and `indexable` is not `false` (a server too old to send
  `indexable` does not exclude the account);
- not `suspended`, `limited`, `memorial` or `moved`;
- identity: the handle is `username@host` where `host` is the host of the account's own profile URL,
  and that host's own response described a local account (`acct` equal to `username`).

A top post additionally needs `visibility === 'public'`, `sensitive === false`, an empty
`spoiler_text`, no boost (`reblog` empty), an eligible author, `created_at` inside the reported UTC
day, a URL and URI on the author's own host, and a numeric `favourites_count`. Its text is the
status HTML reduced to plain text (hidden URL prefixes and tags removed, entities decoded, custom
emoji shortcodes, control and bidirectional-control characters dropped) cut to 280 characters.

Avatars: `toAccount` writes an avatar only when its URL is https, has no credentials or port and its
host is in `AVATAR_HOSTS` (97 hosts: the media host of each of the 40 largest servers plus the host
of every account that passed on 2026-10-12; shared object-storage hosts such as `wasabisys.com`,
`amazonaws.com` and `backblazeb2.com` are left out on purpose). `social.js` carries a copy of the same
list and loads an avatar only from it; anything else is a blank placeholder. The collector logs the
unlisted hosts it meets so the list can be extended deliberately. The two lists must stay identical
(a one-line comparison is in the comment above the list in `social.js`).

The page re-checks, using only what the file carries: at least 10,000 followers, the key and `acct`
and `domain` agree, the optional flag fields (`bot`, `locked`, `group`, `noindex`, `suspended`,
`limited`, `memorial`, `indexable`, `discoverable`, `moved`) if present, top posts public and not
sensitive and without a content warning when those fields are present, created inside `day`, and a
post URL on the author's own host. It rebuilds every profile link as `https://host/@user`, escapes
every string, strips hidden and bidirectional characters, and never renders data through `innerHTML`
unescaped.

Privacy follows from the same rule: the page names only eligible accounts, so nothing that lists
others may sit in the public repository. The collector keeps no pool or state file, and the workflow
caches nothing between runs. The only history is `history` inside `data/social.js`, limited to
eligible accounts. An account leaves that history when its server says it is gone (404 or 410 after
a successful lookup on that server in the same run), when it is found ineligible, or when it has not
been verified in this run or the two before it.

## Flags and the daily-replay stability property

`lib/flags.js` marks days on which a metric is not a trustworthy reading. It is pure (no I/O, no
clock) and deterministic: the same rows always give the same flags. `updateData.js` recomputes
`flags` for the whole archive on every run (`flagRows`), and `scripts/backfill-history.js` does the
same after a merge, so a change to the rules shows up on the next run for every past day. The page
and the CSV only read `flags` from the rows; they never recompute them.

Why they exist: joinmastodon's `user_count` is the sum over the servers its crawler reaches, so its
failures are blocks of accounts (0.1M to 1.8M) entering or leaving that sum, not registrations.
Four patterns are in the archive:

1. A block enters or leaves and the level reverts days later (2023-01-15 to 19, 2023-10-16,
   2023-11-16 to 21, 2024-02-08 to 11, 2024-12-11 to 21, 2026-02-10 to 13, 2026-05-16, and a
   0.9M block that sat in the sum 2024-09-04 to 2024-10-12).
2. A roughly 100K block is dropped in two equal daily steps and snaps back in one day (or the
   reverse): 2024-02-29 to 03-03, 2024-03-09 to 13, 2024-05-08 to 09, 2025-02-20 to 23.
3. A block enters or leaves for good: a one-day step with no ramp before or after. Two equal steps
   can bracket a long plateau (-411,287 on 2025-10-18, +412,280 on 2026-04-29): only the two step
   days are flagged and the plateau between them is valid data at a different level.
4. Real surges are many consecutive same-direction days that keep growing and never return inside 14
   days (Nov 2022, Jul 2023). Neither rule below touches them.

The `SURGE_DEFINITIONS` windows for Feb 2024 and Sep 2024 are pattern 1, not growth (+934,029 and
+917,435 total in one day with MAU +38,783 and +2,212, reversed by -1,032,485 on 2024-02-12 and
-907,418 on 2024-10-13), so they are marked `artifact` in `script.js` and their chips say FLAGGED.

### Rule 1: `KNOWN_STEPS` (hand-checked)

Each entry has `from`, `to`, `kind`, `metrics` and a `note` with the evidence.

- `step`: a persistent level shift. Only that day is flagged, because its net change is not growth;
  the new level is the baseline for everything after it, and no rolling excursion may start on or
  span it.
- `plateau`: every day from `from` to `to` is displaced and the series returns afterwards, later than
  the rolling window. All of those days are flagged and left out of the rolling rule's series.

| Dates | Kind | Metrics | Evidence in short |
|---|---|---|---|
| 2023-01-26 | step | total, active | +304,830 (+5.1%) and +65,549 (+4.6%) in one day; same size as the Jan 15 / 20 block, and the level stays |
| 2023-05-29 | step | total, active | +104,962 (+1.6%) and +39,846 (+3.6%) in one day, elevated growth for four days after; the smallest step in the table |
| 2023-10-03 to 2023-10-07 | plateau | total, active | five days of undercount: total 6.36M against 8.16M on Oct 2 and 8.77M on Oct 8 (-22%), servers barely moved; Oct 8 itself is a new level and not flagged |
| 2024-01-18 | step | total, active | -476,749 (-5.5%) and -478,914 (-32%): a block left both figures, never fully returned |
| 2024-01-25 | step | total, active | +239,500 (+2.9%) and +24,898 (+2.5%), about 90x its neighbours; first of the block jumps to 2024-02-13 |
| 2024-03-22 to 2024-04-09 | plateau | total | a roughly 100K block out for 19 days (two equal -48,452 steps, +103,155 back) |
| 2024-09-04 to 2024-10-12 | plateau | total | +917,435 on Sep 4, -907,418 on Oct 13 with MAU moving only +2,212 and +2,950: a 0.9M block in the sum for 39 days |
| 2025-01-30 to 2025-02-08 | plateau | active | MAU -355,131 (-35%) in one day while total moved +10,988, then ten days of decaying recovery; total never moved |
| 2025-10-18 | step | total, active | -411,287 (-4.2%), MAU -12,805, about 5x its usual move; level stays until 2026-04-29 |
| 2026-04-29 | step | total, active | +412,280 (+4.2%): undoes the 2025-10-18 step after a 193-day plateau |
| 2026-07-22 | step | total, active | -270,146 (-2.6%) and -37,495 (-5.2%), 11x the days around it; level persists until 2026-09-14 |
| 2026-08-05 | step | active | MAU -15,782 (-2.3%), about 12x its ordinary move; total's -31,468 sits inside its own noise so only MAU is flagged |
| 2026-09-14 | step | total, active | +302,179 (+3.0%) and +40,240 (+5.9%) with +2K days either side; the mirror of 2026-07-22, a block returning to the sum, not a surge |

### Rule 2: `ROLLING` (glitches that revert within 14 days)

Per metric (`total`, `active`, `servers`, `statuses`), over the days that have a value (plateau days
removed, step days acting as barriers no excursion may start on or cross). A day `i` starts an
excursion when all of these hold:

1. It deviates from the level of the last unflagged day, extrapolated at the local slope (the median
   daily change within 15 days either side, `SLOPE_SPAN`), by at least `enter` of the level.
2. The series is not itself moving fast: the local slope and the median of the last five steps are
   both at most `maxSlope` of the level a day (this is what keeps real surges out).
3. Within `window` days the series comes back to within `ret` times the peak displacement of the
   extrapolated level (so it reverts), the displacement reaches `peakMin` of the level, and it is at
   least 4 times the ordinary daily move.
4. It is confirmed: the row after the return does not head back out, and the newest row alone can
   never confirm itself, so nothing at the head of the series is flagged on a hunch.
5. It has sharp edges: the jump on entry and on exit are each at least `edge` times the displacement,
   or (`ramps`) one side is a single such jump and the other is two or more same-direction steps,
   each at least a fifth of the displacement, that add up to it (the dropped-in-steps pattern).

The days from entry up to (not including) the return are flagged. Constants:

| Metric | `enter` | `peakMin` | `ret` | `edge` | `ramps` | `window` (days) | `maxSlope` |
|---|---|---|---|---|---|---|---|
| `total` | 0.0025 | 0.0075 | 0.4 | 0.6 | true | 14 | 0.002 |
| `active` | 0.01 | 0.04 | 0.4 | 0.75 | true | 14 | 0.02 |
| `servers` | 0.01 | 0.03 | 0.4 | 0.6 | true | 14 | 0.01 |
| `statuses` | 0.005 | 0.01 | 0.4 | 0.6 | true | 14 | 0.01 |

### Rule 3: companion (MAU alongside a block-sized total excursion)

MAU is too noisy for the rolling rule to see most block excursions on its own. When a rolling
excursion of `total` is at least `COMPANION_MIN_PCT` (5) percent of the level, `active` is flagged on
the same days if its own entry step and exit step are each at least the larger of
`COMPANION_USUAL` (3) times its ordinary daily move (median of the five days before) and
`COMPANION_MIN` (1 percent) of its level, with the entry pointing the same way as the total's and the
exit the opposite way.

### What it flags today

On the 2026-10-12 build (1,471 rows), 138 rows carry a flag: 126 `total`, 44 `active`, 1 `servers`
(2025-03-24, a one-day displacement of 4,261 servers, 50 percent), none `statuses` (there is one FediDB reading so far).
By rule, in event and day counts: known steps `total` 8 + 3 plateaus (63 days), `active` 9 steps +
2 plateaus (15 days); rolling `total` 15 events (55 days), `active` 2 (8 days), `servers` 1 (1 day);
companion `active` 4 (16 days). A day can be flagged by more than one rule. The Nov 2022 and Jul 2023
surge windows contain no flagged day.

### Consequences to know

- A flagged value is treated as missing, so a flagged `step` day (a valid reading at the new level)
  is a gap, and the day after it has no net change either, because the net needs two usable days. A
  `step` costs one level day and two net-change days.
- A step that is not in `KNOWN_STEPS` and does not revert is not flagged: it shows as a real net
  change until someone adds it. The rules are judgement calls tuned on this archive.
- A flag appears only once the series has returned and the following day confirms it, so the newest
  days of the archive are never flagged by the rolling rules and an excursion in progress is shown
  at face value until it ends. Pre-render and the page recompute nothing: they use the committed
  flags.
- Surge chips use `steppedChange`, which excludes flagged steps from the window's net change.

### Daily-replay stability

Flags are recomputed from scratch every run, but a flag that was committed is never taken back or
changed by later rows. Checked on 2026-10-12 by replaying the archive one day at a time (every
prefix from 30 to 1,471 rows, 1,442 runs, with a throwaway script, nothing committed):

- the final flags of the full archive equal the committed flags;
- over all prefixes, no day that was flagged in an earlier run lost or changed its flags (0 removals,
  0 changes);
- 227 (run, day) pairs were flagged only in a later run: a rolling excursion appears when it
  returns, and the longest in the archive (11 days, 2024-12-11 to 21) was confirmed on 2024-12-22,
  so no day's flag differed from its final value once the run was more than 11 days after it
  (the rolling window is 14).

So the page and the CSV can be republished every day without older days flickering; only the last
two weeks can still gain a flag. The property holds for the rules and archive as they are: adding a
`KNOWN_STEPS` entry or back-filling a missing day in the middle changes flags retroactively.

## Pre-render contract

Goal: crawlers and readers without JavaScript see the current numbers, and `script.js` later paints
the same strings in its default view (range 1Y), so nothing flips after load. Every number and
sentence comes from `script.js`'s own pure builders; `lib/prerender.js` only finds the slots, writes
the build stamp, the JSON-LD and the sitemap date. If `script.js` cannot be loaded in Node, nothing is
replaced and the keys are reported as `missing`.

### Inline values

Any element `<tag data-prerender="KEY">TEXT</tag>` whose content is text only. A key may appear any
number of times. Elements with child elements are left alone and reported as `invalid`; keys the
renderer does not know are left alone and reported as `unknown`. Values are HTML-escaped.

| KEY | Value |
|---|---|
| `last-day` | `formatDay` of the last archive day, e.g. `Oct 11, 2026` |
| `generated` | `formatUtcStamp` of the build time, e.g. `2026-10-12 05:29 UTC`. Not derivable from the archive: written by the pre-render and left alone by the page. |
| `first-day` | `formatDay` of the first archive day |
| `total-users`, `total-users-compact` | Newest usable `total`: `formatInteger`, `formatCompact` |
| `mau`, `mau-full`, `mau-day` | Newest usable `active`: compact, full integer, and its day |
| `engagement` | `active / total` as a percentage (2 digits) for the newest day where both are usable |
| `mau-peak`, `mau-peak-date` | All-time high usable `active` and its day |
| `mau-velocity-7d`, `mau-velocity-last` | Mean of the last 7 calendar days of `net_active` (`+272/day`; days without a value skipped) and the last day's value |
| `mau-velocity-peak`, `mau-velocity-peak-date` | Largest usable `net_active` and its day |
| `signups-7d`, `signups-last`, `signups-peak`, `signups-peak-date` | The same for `net_total` |
| `servers` | Newest usable `servers` |
| `servers-sentence` | `joinmastodon.org counted N servers on <day>.` |
| `servers-history-sentence` | `The server series starts on <day>.` |
| `posts-sentence` | `The latest figure is N posts on <day>.` or "The first figure appears once two consecutive daily readings exist." |
| `fedidb-sentence` | The FediDB users reading and its day, labelled as a different base |
| `range-dates` | The default view's `start → end · N pts` |
| `gaps-sentence` | Up to the three longest archive gaps of more than 30 days; empty when there are none |
| `surge-nov-2022`, `surge-jul-2023`, `surge-feb-2024`, `surge-sep-2024` | Surge chip text: the net change in total users the data records for the window with flagged steps excluded, or `FLAGGED` for the two windows marked `artifact` |

"Usable" means a finite number whose key is not in that row's `flags`. `lib/prerender.js` requires
`INLINE_KEYS` (21 keys) to exist in the page; keys `computePrerenderValues` returns beyond those are
filled when the page has a slot for them.

### Blocks

`<!-- prerender:KEY -->...<!-- /prerender:KEY -->`: the inner HTML is replaced, the markers stay, and
the new lines take the indentation of the opening marker. Blocks are `ticker`, `milestones` and
`strip`, rendered with `buildTickerHTML(computeTickerItems(...))`, `buildMilestoneRowsHTML` and
`buildIndexStripHTML`, the same functions the page calls after load.

- `ticker`: one `<li class="tick">` per item: MAU, USERS, MAU/DAY 7D, NET/DAY 7D, ENGAGEMENT, SERVERS,
  and POSTS/DAY once a posts-per-day figure exists, each with the week-over-week change of its 7-day
  average (a percentage, or an absolute change per day for the net series when a percentage is not
  meaningful). Items with no value are left out.
- `milestones`: the rows of the milestones table: the editorial dates in `MILESTONES` (2022-09-30,
  2022-11-30, 2023-07-31, 2024-07-31, 2025-07-31, those not after the last day) and the latest day
  (`current-row`). Columns: Date, Total users, MAU, Net/day (7D avg), MAU / total, Context.
- `strip`: the FediDB totals strip: SERVERS (`fedi_instances`), POSTS (`statuses`) and USERS
  (`fedi_users`) from the newest reading of each, parts without data left out; a "Collecting" line
  when there is no reading at all.

### JSON-LD, cache-bust and sitemap

- `<script type="application/ld+json" id="jsonld">` gets `buildJsonLd`: a `@graph` with a
  `WebApplication`, a `FAQPage` and a `Dataset` (`temporalCoverage` first day/last day, `dateModified`,
  `isBasedOn` the two APIs, `distribution.contentUrl` the CSV). The FAQ entries are read from the
  page's own visible FAQ (`<details class="faq-...">` with a `<summary>`) after the inline values are
  filled in, so structured data always matches what readers see. `<` is escaped as `<`.
  `script.js` copies the painted FAQ back into the JSON-LD after load (`syncFaqJsonLd`) so the two
  agree even if the page and the archive came from different builds.
- `<script src="historicalData.js?v=STAMP">`: STAMP is the build time as `YYYYMMDDHHmm`.
- `sitemap.xml` `<lastmod>` is the last archive day.
- The build stamp (minute precision) moves only when the archive text changed: `updateData.js`
  passes `generatedAt` only then, otherwise the page's own stamp is kept, so a run with nothing new
  writes nothing.

### API and CLI

```js
const { prerenderIndex, computeValues, buildJsonLd, updateSitemap, extractFaq } = require('./lib/prerender.js');
prerenderIndex(html, rows, { generatedAt })  // -> { html, replaced, missing, invalid, unknown }
buildJsonLd(rows, { faq, generatedAt })       // -> JSON-LD object
updateSitemap(xml, rows)                      // -> xml
```

`rows` is the `historicalData` array. All are pure and idempotent and never throw on missing keys; an
empty or unreadable archive returns the page unchanged. `updateData.js` calls `prerenderIndex` and
`updateSitemap` itself, and only warns when the page has problems, so a page error never blocks
committing the data.

```bash
node lib/prerender.js            # writes index.html and sitemap.xml from historicalData.js (no network)
node lib/prerender.js --dry-run  # report only
node lib/prerender.js --data other.js --index /tmp/index.html --sitemap /tmp/sitemap.xml --generated 2026-10-12T05:29:00Z
```

Exit code 1 when a key is `missing`, `invalid` or `unknown` (in `--dry-run` too), 2 for bad arguments
or a missing file. A page that merely differs from a fresh render only prints `stale` and still
exits 0: `test.yml` therefore checks that every slot exists, not that the committed page is fresh.

## Schedule and failure handling

### `update-data.yml` (03:17 and 15:17 UTC)

- The 03:17 run lands after joinmastodon has closed the previous UTC day and takes that day's FediDB
  reading about 3 hours after it ended. The 15:17 run picks up late joinmastodon rows only: it never
  attaches a FediDB reading (the 12:00 UTC limit, `FEDIDB_LAST_HOUR_UTC`), so a day whose 03:17 call
  failed has no reading, not a late one. GitHub may start scheduled runs late.
- The checkout is the branch head (`ref: ${{ github.ref }}`), so a run that waited behind another
  starts from that run's commit. `concurrency: update-data` (no cancel) keeps runs from racing.
  `timeout-minutes: 15`; Node 24; `contents: write`.
- `updateData.js` GETs the statistics API with a 30 second timeout and up to 3 attempts: 5xx and
  network errors back off 5 and 10 seconds; a 429 waits `Retry-After` (15 seconds if absent) and gives
  up when it asks for more than 60 seconds; other 4xx are not retried. It exits non-zero and writes
  nothing when: the request fails, no record has usable numbers, none of the API's new days passes
  the outlier guard, or nothing survives the filters.
- Outlier guard: a record at least 20 percent (`SANITY_THRESHOLD`) below the newest archived `total` or
  `active` is rejected (a partial aggregate that slipped past the today-skip). If rejected records
  agree within 5 percent on both counts for 3 or more consecutive calendar days ending at the newest
  API day (`SHIFT_MIN_DAYS`, `SHIFT_TOLERANCE`) and sit less than 50 percent below (`SHIFT_MAX_DROP`),
  they are a level shift (a block of accounts left the sum for good) and are accepted and logged;
  flags decide whether they are shown. A fall of half or more is never accepted.
- FediDB: attached only if the newest archive day is exactly yesterday (UTC), has no reading, and the
  run starts before 12:00 UTC; 2 attempts, no retry on 5xx; a bad shape, a timeout or a failed
  plausibility check only warns and the run continues with joinmastodon data.
- `npm test` runs after the update, so the gate checks the code and the data about to be committed,
  and a bad committed file can never stop the next run from replacing it.
- The commit step does nothing if no file changed. Otherwise it commits `chore: data update
  (automated)`, runs `git pull --rebase --autostash` and pushes, retrying once after 15 seconds. A
  conflicting concurrent change fails the run instead of overwriting; the next run rebuilds from
  the committed files.
- `collect-servers.yml` and `collect-social.yml` commit only `data/servers.js` and `data/social.js`,
  which this job never changes, so concurrent pushes rebase cleanly.

### `collect-servers.yml` (02:37 UTC, `timeout-minutes: 15`, group `collect-servers`)

`scripts/collect-servers.js` makes 1 totals request and 3 server pages (at most 5), one request
per 3 seconds, honouring `Retry-After` and waiting 20 seconds when `x-ratelimit-remaining` is 2 or
less; 5 attempts per request, redirects not followed. It exits non-zero and leaves
`data/servers.js` untouched when: FediDB fails, the totals lack `user_count`, `status_count` or
`instance_count`, unusable server rows would rank inside the top 100 (or hold more than 1 percent of
the users), validation fails, or the new file is clearly worse than the previous one (`refuseReason`):
fewer than 90 percent of the previously listed servers, total users more than 20 percent lower, the
largest server more than 20 percent lower, or a previous file dated after the new one. An unreadable
existing file stops the run rather than silently dropping history. A real drop can be accepted once
with the manual run's `accept_drop` input (`SERVERS_ACCEPT_DROP=1` or `--accept-drop`), which skips
only the level-change rules. The workflow then runs `node --check data/servers.js` before committing.

### `collect-social.yml` (04:07 UTC, `timeout-minutes: 60`, group `collect-social`)

04:07 lets the previous UTC day finish so its top posts are ranked on near-final counts, and the
follower snapshot is taken at about the same time every day (the 24h baseline needs one 20 to 36
hours old). Steps: `node --check` of the collector and `lib/social.js`, the collector (it budgets
itself to 35 minutes, `timeBudgetMs`, inside a 45-minute step timeout), a validation step that parses
the written `data/social.js` and runs `validateSocial` on it again, then the commit. `npm test` is
deliberately not run here: an unrelated page failure must not block a daily snapshot that exists
only in this file. The commit is skipped if validation fails.

The HTTP client (`createClient` in `scripts/collect-social.js`): one request at a time per host,
spaced `gapMs` 1,100 ms, at most 20 hosts in parallel (`concurrency`), at most 900 requests per host
(`hostBudget`); it waits out `X-RateLimit-Remaining` (4 or less) until `X-RateLimit-Reset`, and a 429
`Retry-After`, for at most 60 seconds and otherwise gives up on that host for the run; a host is
abandoned after 4 failures; timeouts (45 seconds) and 5xx are retried with backoff; other 4xx are not
retried; only https URLs without port or credentials are requested, redirects only within the same
host (at most 2), bodies are capped at 4 MiB, and nothing is requested after the time budget.

It exits non-zero and leaves `data/social.js` untouched when: fewer than 5 servers answered,
fewer than 20 accounts are eligible, the eligible count fell below half of the last snapshot's (when
that had 50 or more), no server list could be found, or `validateSocial` finds a problem. A FediDB
failure falls back to the servers of already listed accounts (when the previous file is in the
current format). An unreadable existing file only warns
and the run starts without history (the one case that loses the baseline).

### Retry and recovery

- A run that fails changes no data file, so the previous committed file stays on the page.
- Every collector writes through a temporary file and a rename.
- Re-running a workflow the same day is safe: archive merges are idempotent, snapshots keep the first
  of the day.
- The pages degrade independently: a missing or unreadable `data/servers.js` or `data/social.js`
  leaves its panels on "Collecting" (or "This data file could not be read.") and the rest of the page
  works. A failing `historicalData.js` shows DATA ERROR.

## Local scheduled runs

`updateDaily.sh` runs `node updateData.js` and then, if `historicalData.js` changed, commits only
`historicalData.js` (`chore: daily data update`), runs `git pull --rebase --autostash` (failure
ignored), pushes, and sets `chmod 644 *.js *.html *.css`. It does not stage `data/mastodon-daily.csv`,
`index.html` or `sitemap.xml`, which `updateData.js` also rewrites, and it does not run tests, so a
local run leaves those files modified and uncommitted. `installLaunchAgent.sh` installs a macOS
LaunchAgent `com.eagerbardeen.updateData` that runs it at 03:00 local time and at load, logging to
`updateData.log` (git-ignored). `updateDaily.ps1` only runs `node updateData.js` and logs to
`updateData.log` (it commits nothing); `installTaskScheduler.ps1` registers the Windows task
`EagerBardeenUpdateData` for 03:00 local time. These predate the Actions. If installed alongside
them they race the 03:17 run and, at 03:00 local time, can take the FediDB reading at a different
hour. The Actions are the maintained path.

## Verification

- `npm test` runs `node --test script.test.js`: 27 cases covering the page's pure helpers (moving
  average, range and prior-period selection, deltas, CSV, sparkline, zoom reset) and the updater with
  a mocked fetch (no usable records exit non-zero, today is skipped, the 20 percent guard, archived
  rows win). It touches no real file and no network: the updater tests set `HIST_FILE_OVERRIDE`,
  which also stops the CSV, the page and the sitemap being written (`CSV_FILE_OVERRIDE`,
  `INDEX_FILE_OVERRIDE`, `SITEMAP_FILE_OVERRIDE` and `NOW` are the other test hooks).
- `updateData.js` runs `main()` when required without a script path (`node -e`), because the existing
  tests load it that way: do not `require('./updateData.js')` from a one-liner in the repository
  unless you mean to run an update.
- `test.yml` runs on Node 22 and 24: `node --check` on `script.js`, `social.js`, `updateData.js`,
  `lib/*.js` and `scripts/*.js`, `npm test`, and `node lib/prerender.js --dry-run`.
- `scripts/verify-dashboard.py` drives the real page in Chromium with Playwright: `doctor`, `smoke`,
  `status`, `kpi`, `ranges`, `toggles`, `compare`, `keyboard`, `modes`, `surges`, `gaps`, `hud`,
  `exports`, `table`, `social`, `prerender`, `responsive`, `guide`, `meta` and `all`. It serves the
  repo on a free port (or uses `--url`), intercepts the one request the page makes for the LIVE
  figure so each state (LIVE, ARCHIVE, partial day, garbage, timeout) can be forced, and derives its
  expected values from `historicalData.js` independently of `script.js`. The `social` suite checks
  every board and window against the data files after the guardrails, a hostile fixture (markup in
  names, avatars from other hosts, bots, locked and sub-10K accounts, foreign post hosts) that must
  render as inert text, and missing, empty and brand-new data files. Screenshots go to
  `artifacts/verify-mastodon-trends/` (git-ignored). How to run it and what each command proves:
  `.claude/skills/verify-mastodon-trends/SKILL.md`.
