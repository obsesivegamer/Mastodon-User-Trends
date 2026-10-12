---
name: verify-mastodon-trends
description: Drive the real Mastodon Network Pulse page in headless Chromium and check every feature (ranges, toggles, velocity modes, surge windows, flagged-day gaps, HUD, exports, data table, leaderboards, pre-render parity, responsive layout, guide) with PASS/FAIL output and screenshots. Use for /verify-mastodon-trends, "verify the dashboard", "does the page still work", or before merging any change to index.html, script.js, style.css, social.js, social.css or the data files.
---

# Verify Mastodon Network Pulse

One script drives the actual page (served from the repo root on a free local port) and prints PASS / FAIL / WARN per check. It exits non-zero if anything failed. Nothing is mocked except the one request the page makes for its LIVE figure (`api.joinmastodon.org/statistics`) and the avatar images.

## Run it

Use the maintainer's Python that already has Playwright (the `-I` flag keeps the repo from shadowing standard modules):

```bash
PY=/Users/jeremylichtman/Documents/amber-archive/.venv/bin/python
$PY -I scripts/verify-dashboard.py doctor     # files, node, npm test, pre-render dry run, pinned libs, Chromium
$PY -I scripts/verify-dashboard.py smoke      # one feature suite
$PY -I scripts/verify-dashboard.py all        # doctor + every suite, about 40 seconds
```

Any other Python works if `pip install playwright && python -m playwright install chromium` was run for it. Without that the script says so and exits 2.

Options on every command: `--url https://obsesivegamer.github.io/Mastodon-User-Trends/` (drive the published site instead of the repo), `--out DIR` (screenshots), `--headed`, `--slow-mo MS`, `--json FILE` (machine-readable results), `--port N`.

Screenshots go to `artifacts/verify-mastodon-trends/` (git-ignored); the script prints each path. Look at them: a PASS list is not proof of a good-looking page.

## Commands and what each proves

| Command | Proves |
|---|---|
| `doctor` | Required files exist; `node --check` on script.js and social.js; `npm test` (script.test.js) is green; `node lib/prerender.js --dry-run` finds every key and says the markup is current; Chart.js, Hammer and the zoom plugin are pinned with SRI; assets use relative URLs; og:image exists; the four workflows exist; Playwright and Chromium launch. `data/servers.js` and `data/social.js` missing is a WARN (panels then show Collecting). |
| `smoke` | Page loads, `documentElement.dataset.ready === 'true'`, no console errors, six charts exist with data (or their Collecting note), canvases have aria-labels, toggles expose `aria-pressed`, the clock runs, the page talks only to its own host, the CDNs and the statistics API. |
| `status` | The badge: a newer reading gives LIVE (total users card, chip, note and ticker show it, charts keep the archive); a tiny partial reading for today is skipped; stale, garbage, failing and hanging API give ARCHIVE silently. |
| `kpi` | The five cards equal values computed from `historicalData.js` here (not by the page); trend badges and sparklines are filled; ticker items, loop clone and pause; the FediDB strip matches the newest reading. |
| `ranges` | Every range button (1W to ALL, plus one per extra year of history): pressed state, URL hash, VIEWING label, `N pts` text, all six charts plot the independently computed window, table rows; hash restores a range on load. |
| `toggles` | 7D MA (lines added/removed, equals a trailing 7-calendar-day mean with at least 4 usable days), LOG (MAU/SRV/REC/TOT go logarithmic; USR and RAT stay linear), hash cold-load, UI to hash, and in-page `hashchange`. |
| `compare` | COMPARE overlays a dashed prior period of the same length and calendar offset, cards show PRIOR lines, PARTIAL label when the prior window starts before the data, ALL switches to 1Y. |
| `keyboard` | Keys 1-8, M, L, C, Shift variants, ? and Esc; range keys ignored while the guide is open; Tab shows a focus ring. |
| `modes` | Velocity MAU HEALTH / SIGNUPS / GROWTH % bars equal the independent daily change or percentage; SRV and RAT mode pills; Collecting note exactly when fewer than 2 usable points. |
| `surges` | The four surge chips (values re-derived for the unflagged windows, FLAGGED for the two crawler-step windows), zoom of every chart to the window, RESET and the earlier velocity mode restored, chip toggle, range button leaves the window. |
| `gaps` | A flagged or missing day is a gap (null) in MAU, TOT, SRV and USR exactly where the archive says so, never enters the 7D average, is painted with the red band (canvas pixels), and prints `flagged` in the table. |
| `hud` | Focus a chart, then ArrowLeft/Right/Home/End step the HUD one day at a time; value equals the archive; flagged day says FLAGGED and `gap`; live region announces; hover shows the HUD; zoom and reset. |
| `exports` | CSV for each of six charts: file name, header, one row per day of the window, values equal the archive (flagged blank), covers only the zoomed window; PNG for each chart: signature, name, opaque dark background, accent bar; FULL CSV link serves the documented header and one row per archive day. |
| `table` | Daily table: headers, 30 rows (fewer on short ranges), newest first, every cell equals the archive, `flagged` cells, range label, for 1Y, 1W, ALL and a surge window. |
| `social` | Leaderboards (SERVERS/ACCOUNTS, every board and window), top posts, decentralization: rows equal the data files after the guardrails, every named account has at least 10,000 followers, avatars only from allow-listed hosts (list read from `lib/social.js` and checked equal to the page's copy); hostile fixture (markup names, bad avatars, bots, locked, under 10K, foreign post hosts); missing, empty and brand-new data files show a plain empty state; pills are buttons. |
| `prerender` | With `script.js` blocked, every `data-prerender` element, the ticker, milestones and strip hold the same text the script paints; the static values equal the archive; the build stamp matches the `?v=` cache-bust. |
| `responsive` | At 390, 820 and 1440 px: no horizontal page scroll (also on every leaderboard), nothing pokes out, charts and command bar fit. |
| `guide` | Opens as a modal, covers the key topics, range table is generated from the live range list, closes with Esc, the X, CLOSE, the backdrop; the Prior period badge opens it. |
| `meta` | JSON-LD parses and has WebApplication, FAQPage, Dataset; Dataset covers the archive; FAQ in JSON-LD equals the visible FAQ (served HTML and after paint); canonical; every local link resolves; sitemap lastmod. |

## How the expected values are made

`historicalData.js` is fetched over HTTP and re-implemented in the `Archive` class (flags mean missing, calendar days are contiguous, daily change needs two usable days, 7-day average needs 4 usable days). The page is only asked what it painted, through `window.MastodonTerminal.app` (`state`, `s` series, `view`, `charts`, `live`). If a check fails, first decide whether the page or the oracle is wrong; the oracle follows the documented rules in the guide and FAQ on the page.

Hooks the harness relies on (keep them stable, or update the harness with the change):

- `document.documentElement.dataset.ready` is `'true'` once the script painted, `'error'` on a fatal error.
- `window.MastodonTerminal.app.charts` keys `velocity, mau, srv, rec, rat, tot`; datasets carry `role` (`raw`, `ma`, `prior`) and `metaKey`.
- Ids: `#toggle-ma-btn #toggle-log-btn #toggle-compare-btn #open-guide-btn #guide-dialog #data-status #kpi-*-value #data-table-body #selected-range-label #selected-range-dates`; classes `.time-btn[data-range] .vel-mode-btn .rat-mode-btn .srv-mode-btn .surge-chip[data-surge] .export-csv-btn[data-chart] .export-png-btn[data-chart] .reset-zoom-btn`.
- Social panels: `#soc-ldr-mode #soc-ldr-board #soc-ldr-win #soc-ldr-body #soc-ldr-empty #soc-pst-list #soc-dec-body` and the `.soc-*` classes read in `LDR_ROWS_JS` and `POSTS_JS`.

## Add a check for a new feature

1. Find the smallest suite it belongs to (`cmd_<name>` in `scripts/verify-dashboard.py`), or add a new `cmd_<name>(args, res, dash)` and register it in `SUITES`.
2. Open the page with `page = dash.new_page(feed="stale")` and `dash.open(page)` (it waits for the ready flag, never sleeps), act with Playwright locators, wait on a page condition with `page.wait_for_function`, never a fixed sleep.
3. Compute the expected value from `dash.arch` (the `Archive`) or the data files, not from `script.js`.
4. Record it: `res.check(suite, "what is true", condition, "detail shown on failure")`. End with `no_errors(res, suite, page)` and `dash.close(page)`.
5. Save a screenshot for anything visible: `dash.shot(page, "name")` or `dash.shot_el(page, "#selector", "name")`.
6. Prove the check can fail: break the page in a scratch copy of the repo (never in place), serve that copy and run the suite with `--url`; it must go red.
7. Update the table above.

## Known behaviours worth knowing

- Under `prefers-reduced-motion` the ticker is static and its pause button is hidden; `kpi` checks both modes. Most suites run reduced-motion so the ready flag is immediate.
- PNG exports are built asynchronously. Chrome throttles several downloads from one page, so `exports` opens a fresh page per PNG.
- Hovering (or touching) a day with no archive row or a flagged value shows the HUD with the "No row in the archive" / FLAGGED note, as keyboard stepping does. The harness uses the keyboard for those days.
- The social suite tolerates cosmetic changes to column order by finding the FOLLOWERS column from the table header.
- Chart.js, the plugins and fonts are fetched once per run and replayed to every page; an offline machine still needs a first successful fetch.
