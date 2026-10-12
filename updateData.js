#!/usr/bin/env node
'use strict';
// Updater (.github/workflows/update-data.yml runs it twice a day; GitHub starts those runs hours
// late, so nothing here depends on the hour):
//   1. GET joinmastodon /statistics: the last ~30 UTC days of {user_count, active_user_count,
//      server_count}. New days are appended; days already archived are kept as stored and only
//      gain `servers` if it is missing. The API can revise its own history (32 of 512 overlapping
//      archived days differ in the Wayback captures, data/README.md), so a stored day may differ
//      from what the API shows now; this updater never overwrites one.
//   2. GET FediDB software/mastodon once, and only when the newest complete day (yesterday UTC)
//      has no reading yet: statuses, statuses_at (the time of the reading, UTC to the minute),
//      fedi_users and fedi_instances go on that row together and are never overwritten. Whatever
//      the hour, posts per day divides by the real time between readings (lib/rates.js). A
//      FediDB failure only logs a warning; that day then has no reading.
//   3. Recompute `flags` for the whole archive (lib/flags.js) and write historicalData.js and
//      data/mastodon-daily.csv.
// Loading this file with node -e / -p or the REPL runs a live update on purpose (see the bottom).
// Env (test hooks): HIST_FILE_OVERRIDE (also stops the CSV being written unless CSV_FILE_OVERRIDE
// is set), CSV_FILE_OVERRIDE, NOW (ISO time used as "now" and as the reading time).

const fs = require('fs');
const path = require('path');
const flagsLib = require('./lib/flags.js');
const rates = require('./lib/rates.js');
const fmt = require('./lib/format.js');

const ROOT = __dirname;
const UA = 'Mastodon-User-Trends (+https://github.com/obsesivegamer/Mastodon-User-Trends)';
const STATS_URL = 'https://api.joinmastodon.org/statistics';
const FEDIDB_URL = 'https://api.fedidb.org/v1/software/mastodon';
const FETCH_TIMEOUT_MS = 30e3;
const STATS_ATTEMPTS = 3;
const MAX_RETRY_AFTER_MS = 60e3;
const SANITY_THRESHOLD = 0.2;
// A drop that rejected records agree on (within 5%) for this many consecutive API days, ending at
// the newest day, is a level shift (a block of accounts left the sum), not a partial aggregate.
// A fall of half or more is never taken as a shift: that is a broken feed, and the run fails.
const SHIFT_MIN_DAYS = 3;
const SHIFT_TOLERANCE = 0.05;
const SHIFT_MAX_DROP = 0.5;
const FEDIDB_MAX_DAILY_GROWTH = 0.03;
const FEDIDB_FLOOR_TOLERANCE = 0.02;
const FEDIDB_FLOOR_DAYS = 7;
const FEDIDB_MIN_ELAPSED_DAYS = 1 / 24;

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const DAY_MS = 86400e3;
const dayNum = (d) => Date.parse(d + 'T00:00:00Z') / DAY_MS;
const isCount = (n) => Number.isSafeInteger(n) && n > 0;
const ROW_KEYS = ['date', 'total', 'active', 'servers', 'statuses', 'statuses_at', 'fedi_users', 'fedi_instances', 'flags'];
const CSV_COLUMNS = ['date', 'total', 'active', 'servers', 'statuses', 'statuses_at', 'fedi_users', 'fedi_instances', 'net_total', 'net_active', 'posts_per_day', 'flags'];

function retryAfterMs(res) {
  const h = res.headers && res.headers.get && res.headers.get('retry-after');
  const secs = Number(h);
  return Number.isFinite(secs) && secs >= 0 ? secs * 1000 : null;
}

// Polite GET: User-Agent, timeout, honours 429 + Retry-After (a longer wait than a minute gives
// up), backs off on 5xx and network errors unless retry5xx is false, never retries other 4xx.
async function fetchJson(fetchImpl, url, { attempts, sleep, log, retry5xx = true }) {
  let lastErr;
  for (let i = 0; i < attempts; i++) {
    let retryable = true;
    let wait = 0;
    try {
      const res = await fetchImpl(url, {
        headers: { 'User-Agent': UA, Accept: 'application/json' },
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      });
      if (res.ok) return await res.json();
      lastErr = new Error(`HTTP ${res.status}`);
      if (res.status === 429) {
        const ra = retryAfterMs(res);
        if (ra !== null && ra > MAX_RETRY_AFTER_MS) retryable = false;
        else wait = ra === null ? 15e3 : ra;
      } else if (res.status < 500 || !retry5xx) retryable = false;
    } catch (err) {
      lastErr = err;
      if (!retry5xx) retryable = false;
    }
    if (!retryable) break;
    if (i + 1 < attempts) {
      log.warn(`GET ${url} failed (attempt ${i + 1}/${attempts}): ${lastErr.message}`);
      await sleep(wait || 5000 * (i + 1));
    }
  }
  throw lastErr;
}

// joinmastodon /statistics -> [{date, total, active, servers|null}] for complete days only.
function normalizeStats(apiData, today) {
  const counts = { input: 0, today: 0, future: 0, invalid: 0 };
  const byDate = new Map();
  if (!Array.isArray(apiData)) return { rows: [], counts };
  counts.input = apiData.length;
  for (const item of apiData) {
    const raw = String((item && (item.period || item.date || item.created_at)) || '').slice(0, 10);
    const total = parseInt(item && (item.user_count || item.total_users), 10);
    const active = parseInt(item && (item.active_user_count || item.active_users), 10);
    const servers = parseInt(item && item.server_count, 10);
    if (!DATE_RE.test(raw) || Number.isNaN(Date.parse(raw)) || !(total > 0) || !(active > 0)) {
      counts.invalid++;
      continue;
    }
    if (raw === today) {
      counts.today++;
      continue;
    }
    if (raw > today) {
      counts.future++;
      continue;
    }
    byDate.set(raw, { date: raw, total, active, servers: servers > 0 ? servers : null });
  }
  return { rows: [...byDate.values()].sort((a, b) => (a.date < b.date ? -1 : 1)), counts };
}

function parseArchive(text) {
  const eq = text.indexOf('=');
  if (eq === -1) throw new Error('historicalData.js: no assignment found');
  const rows = JSON.parse(text.slice(eq + 1).replace(/;\s*$/, ''));
  if (!Array.isArray(rows)) throw new Error('historicalData.js: not an array');
  return rows;
}

// Archive values win for days already stored (a partial re-fetch must not overwrite a complete
// day); `servers` is only filled in where the archive row has none. Keys are put in contract
// order so JSON.stringify output stays stable.
function mergeRows(archive, apiRows) {
  const byDate = new Map(archive.map((r) => [r.date, r]));
  let added = 0;
  let serversFilled = 0;
  for (const rec of apiRows) {
    const cur = byDate.get(rec.date);
    if (!cur) {
      byDate.set(rec.date, { date: rec.date, total: rec.total, active: rec.active, ...(rec.servers ? { servers: rec.servers } : {}) });
      added++;
    } else if (cur.servers === undefined && rec.servers) {
      cur.servers = rec.servers;
      serversFilled++;
    }
  }
  const rows = [...byDate.values()].sort((a, b) => (a.date < b.date ? -1 : 1)).map((r) => {
    const known = {};
    for (const k of ROW_KEYS) if (r[k] !== undefined) known[k] = r[k];
    const extra = Object.fromEntries(Object.entries(r).filter(([k]) => !ROW_KEYS.includes(k)));
    return { ...known, ...extra };
  });
  return { rows, added, serversFilled };
}

// FediDB software/mastodon -> {statuses, fedi_users, fedi_instances} or null.
function parseFedi(json) {
  if (!json || typeof json !== 'object') return null;
  const out = { statuses: json.status_count, fedi_users: json.user_count, fedi_instances: json.instance_count };
  return Object.values(out).every(isCount) ? out : null;
}

// Only `statuses` is gated (a cumulative count). Real growth is about 0.1% a day, so +3% per
// elapsed day is far beyond anything real, and a fall of more than 2% against a reading from the
// last week is not a crawl wobble. A smaller fall is let through (posts per day leaves negative
// changes out), so a small spike that got in can never make every later correct reading fail.
// fedi_users and fedi_instances are informational. Elapsed time is the real time since the last
// stored, unflagged reading (its statuses_at, or 03:00 UTC the day after its date). The floor only
// applies to a reading from the last week, so one old row can never block readings for good.
function fediPlausible(statuses, readAtMs, day, rows) {
  const prev = [...rows].reverse().find((r) => r.date < day && isCount(r.statuses)
    && !(Array.isArray(r.flags) && r.flags.includes('statuses')));
  if (!prev) return true;
  const elapsed = Math.max(FEDIDB_MIN_ELAPSED_DAYS, (readAtMs - rates.readingTime(prev)) / DAY_MS);
  if (statuses > prev.statuses * (1 + FEDIDB_MAX_DAILY_GROWTH * elapsed)) return false;
  return !(elapsed <= FEDIDB_FLOOR_DAYS && statuses < prev.statuses * (1 - FEDIDB_FLOOR_TOLERANCE));
}

// ISO UTC to the minute, the format of `statuses_at`: 2026-10-12T10:41Z.
function minuteStamp(ms) {
  return new Date(ms).toISOString().slice(0, 16) + 'Z';
}

// rejected: API records the 20% guard refused, ascending. Returns those that form a run of at
// least SHIFT_MIN_DAYS consecutive calendar days, agree within SHIFT_TOLERANCE on both counts, and
// end at the newest API day, and sit less than SHIFT_MAX_DROP below the last archived row: the drop
// is still there, so it is the new level.
function persistentShift(rejected, newestDate, last) {
  const run = [];
  for (let i = rejected.length - 1; i >= 0; i--) {
    const rec = rejected[i];
    const expected = run.length ? new Date(dayNum(run[0].date) * DAY_MS - DAY_MS).toISOString().slice(0, 10) : newestDate;
    if (rec.date !== expected) break;
    run.unshift(rec);
  }
  if (run.length < SHIFT_MIN_DAYS) return [];
  const spread = (key) => Math.max(...run.map((r) => r[key])) / Math.min(...run.map((r) => r[key]));
  const tail = run[run.length - 1];
  if (tail.total < last.total * (1 - SHIFT_MAX_DROP) || tail.active < last.active * (1 - SHIFT_MAX_DROP)) return [];
  return spread('total') <= 1 + SHIFT_TOLERANCE && spread('active') <= 1 + SHIFT_TOLERANCE ? run : [];
}

function serializeJs(rows) {
  return `const historicalData = ${JSON.stringify(rows, null, 2)};`;
}

// net_total / net_active: day-over-day change, blank when either side is missing or flagged, or
// when the previous calendar day has no row (a multi-day change is not a day-over-day change).
function serializeCsv(rows) {
  const lines = [CSV_COLUMNS.join(',')];
  const num = (v) => (Number.isFinite(v) ? String(v) : '');
  const perDay = new Map(rates.postsPerDay(rows).map((x) => [x.date, Math.round(x.value)]));
  rows.forEach((r, i) => {
    const prev = i ? rows[i - 1] : null;
    const adjacent = prev && dayNum(r.date) - dayNum(prev.date) === 1;
    const net = (m) => {
      if (!adjacent || !Number.isFinite(r[m]) || !Number.isFinite(prev[m])) return '';
      if (flagsLib.isFlagged(r, m) || flagsLib.isFlagged(prev, m)) return '';
      return String(r[m] - prev[m]);
    };
    lines.push([
      r.date, num(r.total), num(r.active), num(r.servers), num(r.statuses), r.statuses_at || '', num(r.fedi_users), num(r.fedi_instances),
      net('total'), net('active'), perDay.has(r.date) ? String(perDay.get(r.date)) : '', (r.flags || []).join('|'),
    ].join(','));
  });
  return lines.join('\n') + '\n';
}

function writeAtomic(file, text) {
  if (fs.existsSync(file) && fs.readFileSync(file, 'utf8') === text) return false;
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, text);
  fs.renameSync(tmp, file);
  return true;
}

async function main({
  env = process.env,
  fetchImpl = globalThis.fetch,
  log = console,
  sleep = (ms) => new Promise((r) => setTimeout(r, ms)),
} = {}) {
  const histFile = env.HIST_FILE_OVERRIDE || path.join(ROOT, 'historicalData.js');
  // A bare HIST_FILE_OVERRIDE (the repo gate's updater checks) must not rewrite the real CSV.
  const csvFile = env.CSV_FILE_OVERRIDE || (env.HIST_FILE_OVERRIDE ? null : path.join(ROOT, 'data', 'mastodon-daily.csv'));
  const nowMs = env.NOW ? Date.parse(env.NOW) : Date.now();
  if (!Number.isFinite(nowMs)) throw new Error(`NOW is not a valid time: ${env.NOW}`);
  const today = new Date(nowMs).toISOString().slice(0, 10);
  const yesterday = new Date(nowMs - DAY_MS).toISOString().slice(0, 10);

  log.log(`Fetching ${STATS_URL} ...`);
  const apiData = await fetchJson(fetchImpl, STATS_URL, { attempts: STATS_ATTEMPTS, sleep, log });
  const { rows: apiRows, counts } = normalizeStats(apiData, today);
  log.log(`Received ${counts.input} records from the live API.`);
  if (counts.today) log.log(`Skipped ${counts.today} record(s) for today (${today}) — data is still incomplete.`);
  if (counts.future || counts.invalid) log.warn(`Ignored ${counts.future} future-dated and ${counts.invalid} invalid record(s).`);
  if (counts.input === counts.invalid) throw new Error('No valid data received from API.');

  const archive = fs.existsSync(histFile) ? parseArchive(fs.readFileSync(histFile, 'utf8')) : [];
  log.log(`Loaded ${archive.length} archived rows.`);

  // Guard: a record that falls 20% or more below the newest trusted archived value is a partial
  // aggregate that slipped past the today-skip, not a real drop, unless the same low level holds
  // for SHIFT_MIN_DAYS consecutive days up to the newest one (then it is accepted and logged; the
  // flag rules decide whether the step is shown). If none of the API's new days survive, the run
  // fails at once instead of exiting 0 while the archive stalls.
  let sane = apiRows;
  if (archive.length) {
    const last = [...archive].sort((a, b) => (a.date < b.date ? -1 : 1)).at(-1);
    const rejected = [];
    sane = apiRows.filter((rec) => {
      const bad = (last.total - rec.total) / last.total >= SANITY_THRESHOLD || (last.active - rec.active) / last.active >= SANITY_THRESHOLD;
      if (bad) {
        rejected.push(rec);
        log.warn(`Rejected outlier for ${rec.date}: total=${rec.total}, active=${rec.active} (${SANITY_THRESHOLD * 100}% or more below the last archived row).`);
      }
      return !bad;
    });
    const shift = rejected.length ? persistentShift(rejected, apiRows.at(-1).date, last) : [];
    if (shift.length) {
      log.warn(`Accepted level shift: ${shift.length} consecutive days ${shift[0].date}..${shift.at(-1).date} stay within ${SHIFT_TOLERANCE * 100}% of each other at total ${shift.at(-1).total}, active ${shift.at(-1).active}.`);
      sane = apiRows.filter((rec) => sane.includes(rec) || shift.includes(rec));
    }
    const archived = new Set(archive.map((r) => r.date));
    const fresh = apiRows.filter((rec) => !archived.has(rec.date));
    if (fresh.length && !fresh.some((rec) => sane.includes(rec))) {
      log.warn(`None of the ${fresh.length} new day(s) ${fresh[0].date}..${fresh.at(-1).date} passed the sanity guard. Skipping archive update.`);
      process.exitCode = 1;
      return null;
    }
  }
  if (!sane.length) {
    log.warn('No new records survived the today-skip and sanity filters. Skipping archive update.');
    process.exitCode = 1;
    return null;
  }

  const merged = mergeRows(archive, sane);
  let rows = merged.rows;

  const latest = rows[rows.length - 1];
  let fediStored = false;
  if (latest.date !== yesterday) {
    log.warn(`FediDB: newest complete day is ${latest.date}, not ${yesterday}; not attaching a reading to an older day.`);
  } else if (isCount(latest.statuses)) {
    log.log(`FediDB: ${latest.date} already has a reading; not fetched again.`);
  } else {
    try {
      const reading = parseFedi(await fetchJson(fetchImpl, FEDIDB_URL, { attempts: 2, sleep, log, retry5xx: false }));
      const readAtMs = env.NOW ? nowMs : Date.now();
      if (!reading) log.warn('warning: FediDB response lacks valid status_count / user_count / instance_count; skipped.');
      else if (!fediPlausible(reading.statuses, readAtMs, latest.date, rows)) log.warn('warning: FediDB status_count is below the last stored reading or grew more than 20% a day; skipped.');
      else {
        // Key order is the contract's: statuses, statuses_at, fedi_users, fedi_instances.
        Object.assign(latest, { statuses: reading.statuses, statuses_at: minuteStamp(readAtMs), fedi_users: reading.fedi_users, fedi_instances: reading.fedi_instances });
        fediStored = true;
        log.log(`FediDB: ${latest.date} statuses ${fmt.formatInteger(reading.statuses)} at ${latest.statuses_at}, users ${fmt.formatInteger(reading.fedi_users)}, instances ${fmt.formatInteger(reading.fedi_instances)}`);
      }
    } catch (err) {
      log.warn(`warning: FediDB unavailable (${err.message}); continuing with joinmastodon data only.`);
    }
  }

  rows = flagsLib.flagRows(rows);

  const outputs = [[histFile, serializeJs(rows)]];
  if (csvFile) outputs.push([csvFile, serializeCsv(rows)]);

  // ---- PRERENDER HOOK (PRE part) ---------------------------------------------------------
  // Re-render index.html (numbers, ticker, milestones, strip, JSON-LD, cache-bust stamp) and
  // sitemap.xml (<lastmod> = newest complete day) from the final archive. The build stamp only
  // moves when the archive text changed, so a run with nothing new writes nothing. A bare
  // HIST_FILE_OVERRIDE (the repo gate's updater checks) leaves the real page and sitemap alone,
  // like the CSV; INDEX_FILE_OVERRIDE / SITEMAP_FILE_OVERRIDE point them at scratch copies.
  // Page problems only warn: the data files above must still be committed.
  const indexFile = env.INDEX_FILE_OVERRIDE || (env.HIST_FILE_OVERRIDE ? null : path.join(ROOT, 'index.html'));
  const sitemapFile = env.SITEMAP_FILE_OVERRIDE || (env.HIST_FILE_OVERRIDE ? null : path.join(ROOT, 'sitemap.xml'));
  if (indexFile || sitemapFile) {
    try {
      const prerender = require('./lib/prerender.js');
      const archiveChanged = !fs.existsSync(histFile) || fs.readFileSync(histFile, 'utf8') !== outputs[0][1];
      if (indexFile && fs.existsSync(indexFile)) {
        const res = prerender.prerenderIndex(fs.readFileSync(indexFile, 'utf8'), rows, archiveChanged ? { generatedAt: new Date(nowMs).toISOString() } : {});
        if (res.missing.length) log.warn(`warning: index.html has no slot for: ${res.missing.join(', ')}`);
        if (res.invalid.length) log.warn(`warning: index.html elements with child nodes (left alone): ${res.invalid.join(', ')}`);
        if (res.unknown.length) log.warn(`warning: index.html has unknown data-prerender keys (left alone): ${res.unknown.join(', ')}`);
        // No values means script.js could not be loaded: keep the old page rather than a half-new one.
        if (res.replaced.includes('last-day')) outputs.push([indexFile, res.html]);
        else log.warn('warning: pre-render produced no values; index.html left as it was.');
      } else if (indexFile) log.warn(`warning: ${indexFile} not found; skipping pre-render`);
      if (sitemapFile && fs.existsSync(sitemapFile)) {
        outputs.push([sitemapFile, prerender.updateSitemap(fs.readFileSync(sitemapFile, 'utf8'), rows)]);
      }
    } catch (err) {
      log.warn(`warning: pre-render failed (${err.message}); index.html and sitemap.xml left as they were.`);
    }
  }
  // -----------------------------------------------------------------------------------------

  const written = outputs.filter(([file, text]) => writeAtomic(file, text)).map(([file]) => path.relative(ROOT, file) || file);
  const flagged = rows.filter((r) => r.flags && r.flags.length);
  const newest = rows[rows.length - 1];
  const summary = {
    last_complete_day: newest.date,
    total: newest.total,
    active: newest.active,
    servers: newest.servers ?? null,
    rows: rows.length,
    rows_added: merged.added,
    servers_filled: merged.serversFilled,
    fedidb_reading_stored: fediStored,
    flagged_days: flagged.length,
    written,
  };
  log.log('updated:', JSON.stringify(summary));
  return summary;
}

// Runs on load, as the original file did: script.test.js drives the updater with
// `node -e "require('./updateData.js')"` (no script path) and a mocked fetch, and depends on it.
// So loading this file with node -e / -p or in the REPL runs a live update, on purpose.
if (require.main === module || !process.argv[1]) {
  main().catch((err) => {
    console.error(`updateData failed: ${err.message}`);
    process.exitCode = 1;
  });
}

module.exports = { main, normalizeStats, mergeRows, parseFedi, serializeJs, serializeCsv, parseArchive, STATS_URL, FEDIDB_URL, UA };
