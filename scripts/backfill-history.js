#!/usr/bin/env node
'use strict';
// One-shot, re-runnable backfill of the days missing from historicalData.js.
//
// Source: Internet Archive Wayback Machine captures of https://api.joinmastodon.org/statistics.
// Every capture holds the ~30 UTC days the API returned at that moment, as
// [{period, server_count, user_count, active_user_count}], i.e. the same joinmastodon series
// updateData.js archives day by day (user_count, active_user_count, server_count). Nothing is
// interpolated and no other base (FediDB etc.) is used for total / active.
//
// Evaluated and rejected: github.com/rattletat/mastodon-statistics (a daily GitHub Actions copy
// of the same endpoint). It keeps the FIRST value seen per period, and the API lists the current
// day while it is still being computed (zeros, or a few thousand accounts), so 274 of 568 days
// compared against this archive differ, by up to 100%. Not a reading of a complete day.
// An all-zero entry in a capture (the API's crawler produced nothing, e.g. 2022-12-07 and
// 2022-12-08) is not a reading either and stays a gap.
//
// Rules
//   - Existing rows always win. Only dates that have no row are added. Captured days that
//     overlap an existing row are compared with it and reported, never written.
//   - Entries dated on or after the capture's own UTC day are partial and skipped (the same
//     "skip today" rule as updateData.js, which also supplies the entry parser).
//   - Several captures may contain one missing day: the earliest wins (the first reading, which
//     is also what the daily updater would have kept), and for every missing day the earliest
//     capture after it is the one downloaded. Disagreement between captures is reported.
//   - After merging, flags are recomputed with lib/flags.js and the file is written with
//     updateData.js's serializeJs, exactly as the updater does.
//
// Offline by default: no network unless --fetch is passed. Downloads are cached in
// .cache/backfill-history/ (gitignored), so a re-run only asks Wayback for what is still missing.
//
// Usage: node scripts/backfill-history.js [options]
//   --fetch            allow network access (CDX list + capture downloads)
//   --write            write historicalData.js (default: dry run, report only)
//   --all              download every 200-status capture, not only those that cover a missing
//                      day (gives overlap statistics over the whole history; ~600 requests)
//   --fill-servers     also add `servers` to existing rows that lack it, from the earliest
//                      capture that contains the day (needs --all to reach old days)
//   --wayback-limit N  download at most N captures this run (default: unlimited)
//   --gap-ms N         pause between Wayback downloads, default 10000 (archive.org blocks
//                      the client's IP for a while when asked faster than ~10 a minute)
//   --block-wait-s N   wait this long after a refused connection, default 300
//   --retry-failed     retry captures that failed three times before
//   --cache DIR        cache directory (default .cache/backfill-history)
//   --hist FILE        archive to read/write (default historicalData.js)
//   --report FILE      also write the JSON report to FILE
//
// Terms: Wayback captures are served by archive.org; the captured API is the public
// joinmastodon.org statistics endpoint. See data/README.md for the sources paragraph.

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { normalizeStats, parseArchive, serializeJs } = require('../updateData.js');
const flagsLib = require('../lib/flags.js');

const ROOT = path.join(__dirname, '..');
const UA = 'Mastodon-User-Trends (+https://github.com/obsesivegamer/Mastodon-User-Trends)';
const API = 'api.joinmastodon.org/statistics';
const CDX_URL = `https://web.archive.org/cdx/search/cdx?url=${API}&output=json&fl=timestamp,statuscode,mimetype,digest&filter=statuscode:200`;
const snapUrl = (ts) => `https://web.archive.org/web/${ts}id_/https://${API}`;
const DAY_MS = 86400e3;
const WINDOW_DAYS = 30;
const MAX_ATTEMPTS = 3;
const GIVE_UP_AFTER = 6;
const HOLE_CONFIRMATIONS = 2;

const dayNum = (d) => Math.round(Date.parse(d + 'T00:00:00Z') / DAY_MS);
const numDay = (n) => new Date(n * DAY_MS).toISOString().slice(0, 10);
const captureDay = (ts) => `${ts.slice(0, 4)}-${ts.slice(4, 6)}-${ts.slice(6, 8)}`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------- pure helpers ----------

function missingDays(rows) {
  const have = new Set(rows.map((r) => r.date));
  const out = [];
  for (let n = dayNum(rows[0].date); n <= dayNum(rows[rows.length - 1].date); n++) {
    const d = numDay(n);
    if (!have.has(d)) out.push(d);
  }
  return out;
}

function gapRuns(days) {
  const runs = [];
  for (const d of days) {
    const last = runs[runs.length - 1];
    if (last && dayNum(d) - dayNum(last.to) === 1) last.to = d;
    else runs.push({ from: d, to: d });
  }
  return runs.map((r) => ({ ...r, days: dayNum(r.to) - dayNum(r.from) + 1 }));
}

// One capture body -> complete-day entries {date, total, active, servers|null}. The capture's own
// UTC day and later are dropped by normalizeStats (partial or future).
function extractEntries(body, ts) {
  const json = JSON.parse(body);
  const { rows, counts } = normalizeStats(json, captureDay(ts));
  // Days the API lists with all-zero counts (its crawler produced nothing): not a reading.
  const zeros = json
    .filter((i) => i && !(parseInt(i.user_count, 10) > 0) && !(parseInt(i.active_user_count, 10) > 0) && !(parseInt(i.server_count, 10) > 0))
    .map((i) => String(i.period || '').slice(0, 10));
  return { entries: rows, counts, zeros };
}

function decodeBody(buf) {
  const bytes = buf[0] === 0x1f && buf[1] === 0x8b ? zlib.gunzipSync(buf) : buf;
  const text = bytes.toString('utf8').trim();
  const json = JSON.parse(text);
  if (!Array.isArray(json) || !json.length) throw new Error('not a non-empty JSON array');
  return text;
}

// ---------- cache + network ----------

const readJson = (file, fallback = null) => (fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : fallback);
function writeAtomic(file, text) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, text);
  fs.renameSync(tmp, file);
}

// A refused / reset connection (archive.org does this to a client that asked too fast) is flagged
// `blocked` so the caller can wait it out instead of counting it against the capture.
async function httpGet(url, { timeoutMs = 90000 } = {}) {
  let res;
  try {
    res = await fetch(url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(timeoutMs), redirect: 'follow' });
  } catch (err) {
    const e = new Error(`${err.name === 'TimeoutError' ? 'timeout' : 'connection failed'}${err.cause && err.cause.code ? ` (${err.cause.code})` : ''}`);
    e.blocked = err.name !== 'TimeoutError';
    throw e;
  }
  if (!res.ok) {
    const e = new Error(`HTTP ${res.status}`);
    e.blocked = res.status === 429;
    throw e;
  }
  return { buf: Buffer.from(await res.arrayBuffer()), url: res.url };
}

async function loadCdx(opts, log) {
  const file = path.join(opts.cache, 'cdx.json');
  if (opts.fetch) {
    for (let i = 0; i < 4; i++) {
      try {
        log(`fetching CDX list (attempt ${i + 1})`);
        const { buf } = await httpGet(CDX_URL, { timeoutMs: 120000 });
        const list = JSON.parse(buf.toString('utf8'));
        if (!Array.isArray(list) || list.length < 2) throw new Error('empty CDX answer');
        writeAtomic(file, JSON.stringify(list));
        break;
      } catch (err) {
        log(`CDX failed: ${err.message}`);
        if (i < 3) await sleep(err.blocked ? opts.blockWaitS * 1000 : 15000 * 2 ** i);
      }
    }
  }
  const list = readJson(file);
  if (!list) return null;
  return list.slice(1).filter((r) => /^\d{14}$/.test(r[0]) && r[1] === '200').map((r) => ({ ts: r[0], digest: r[3] }));
}

function loadSnaps(opts) {
  const dir = path.join(opts.cache, 'snaps');
  const out = new Map();
  if (!fs.existsSync(dir)) return out;
  for (const f of fs.readdirSync(dir).sort()) {
    const m = /^(\d{14})\.json$/.exec(f);
    if (!m) continue;
    try {
      out.set(m[1], extractEntries(fs.readFileSync(path.join(dir, f), 'utf8'), m[1]));
    } catch {
      /* corrupt cache file: ignored, will be re-fetched */
    }
  }
  return out;
}

// ---------- planning ----------

// date -> [{ts, ...entry}] earliest capture first; plus per-capture bounds for hole detection.
function coverage(snaps) {
  const cov = new Map();
  for (const ts of [...snaps.keys()].sort()) {
    for (const e of snaps.get(ts).entries) {
      if (!cov.has(e.date)) cov.set(e.date, []);
      cov.get(e.date).push({ ts, ...e });
    }
  }
  return cov;
}

// A day is an "API hole" when HOLE_CONFIRMATIONS captures with different content have entries
// both before and after it but not the day itself: the API simply had no row for it.
function holes(snaps, cdx, days) {
  const digestOf = new Map((cdx || []).map((c) => [c.ts, c.digest]));
  const out = new Set();
  for (const d of days) {
    const seen = new Set();
    for (const [ts, { entries }] of snaps) {
      if (!entries.length || entries[0].date >= d || entries[entries.length - 1].date <= d) continue;
      if (entries.some((e) => e.date === d)) continue;
      seen.add(digestOf.get(ts) || ts);
    }
    if (seen.size >= HOLE_CONFIRMATIONS) out.add(d);
  }
  return out;
}

// Downloads captures until every missing day is covered, proven to be an API hole, or has no
// candidate capture left.
async function fetchNeeded(missing, cdx, snaps, failed, opts, log) {
  const st = { budget: opts.waybackLimit, streak: 0, blocks: 0, first: true, done: 0, aborted: false };
  const digestOf = new Map(cdx.map((c) => [c.ts, c.digest]));

  const tryFetch = async (ts) => {
    if (st.budget <= 0) {
      log('download limit reached');
      st.aborted = true;
      return false;
    }
    if (!st.first) await sleep(opts.gapMs);
    st.first = false;
    for (;;) {
      try {
        const { buf, url } = await httpGet(snapUrl(ts));
        // Wayback answers a capture whose payload is byte-identical to an earlier one with a
        // redirect to that earlier capture. Same CDX digest = same content, so it is accepted.
        const landed = (/\/web\/(\d{14})id_\//.exec(url) || [])[1];
        if (landed !== ts && !(landed && digestOf.get(landed) && digestOf.get(landed) === digestOf.get(ts))) throw new Error(`redirected to ${url}`);
        const text = decodeBody(buf);
        const parsed = extractEntries(text, ts);
        writeAtomic(path.join(opts.cache, 'snaps', `${ts}.json`), text);
        snaps.set(ts, parsed);
        delete failed[ts];
        st.budget--;
        st.streak = 0;
        st.blocks = 0;
        st.done++;
        log(`capture ${ts}: ${parsed.entries.length} complete days ${parsed.entries[0]?.date}..${parsed.entries.at(-1)?.date} (${st.done} downloaded)`);
        return true;
      } catch (err) {
        if (err.blocked) {
          st.blocks++;
          if (st.blocks > 3) {
            log(`archive.org keeps refusing connections (${err.message}); stopping, re-run later`);
            st.aborted = true;
            return false;
          }
          log(`archive.org refused (${err.message}); waiting ${opts.blockWaitS}s before retry ${st.blocks}/3`);
          await sleep(opts.blockWaitS * 1000);
          continue;
        }
        failed[ts] = (failed[ts] || 0) + 1;
        st.streak++;
        st.budget--;
        log(`capture ${ts}: ${err.message} (failure ${failed[ts]})`);
        writeAtomic(path.join(opts.cache, 'failed.json'), JSON.stringify(failed));
        if (st.streak >= GIVE_UP_AFTER) {
          log(`${st.streak} failures in a row, giving up for this run`);
          st.aborted = true;
        }
        return false;
      }
    }
  };
  const usable = (c) => !snaps.has(c.ts) && (opts.retryFailed || (failed[c.ts] || 0) < MAX_ATTEMPTS);

  if (opts.all) {
    const todo = cdx.filter(usable);
    log(`${todo.length} captures to download`);
    for (const c of todo) {
      if (st.aborted) return;
      await tryFetch(c.ts);
    }
    return;
  }
  // For every missing day the capture wanted is the earliest one after it (the first reading,
  // the closest to what the daily updater would have stored). Later windows are only used when
  // the earliest capture turns out not to hold the day.
  for (const d of missing) {
    for (let guard = 0; guard < 8 && !st.aborted; guard++) {
      const cov = coverage(snaps);
      if (holes(snaps, cdx, [d]).has(d)) break;
      const n = dayNum(d);
      const after = cdx.filter((c) => dayNum(captureDay(c.ts)) > n && dayNum(captureDay(c.ts)) <= n + WINDOW_DAYS + 1);
      const fetchedDigests = new Set([...snaps.keys()].map((ts) => digestOf.get(ts)));
      const have = (c) => snaps.has(c.ts) || fetchedDigests.has(c.digest);
      const first = after[0];
      if (!first) break;
      if (have(first) && (cov.get(d) || []).length) break;
      const next = after.find((c) => !have(c) && usable(c));
      if (!next) break;
      await tryFetch(next.ts);
    }
  }
}

const SANITY = 0.2;

// A source row is rejected when total or active sits >= 20% away from BOTH adjacent days of its
// own series in the same direction (a partial aggregate or a one-day glitch, the same idea as
// updateData.js's 20% guard). Days without both neighbours are not tested.
function isSpike(series, date) {
  const prev = series.get(numDay(dayNum(date) - 1));
  const next = series.get(numDay(dayNum(date) + 1));
  const cur = series.get(date);
  if (!prev || !next || !cur) return false;
  return ['total', 'active'].some((k) => {
    const lo = (v) => (v - cur[k]) / v >= SANITY;
    const hi = (v) => (cur[k] - v) / v >= SANITY;
    return (lo(prev[k]) && lo(next[k])) || (hi(prev[k]) && hi(next[k]));
  });
}

const fmtRun = (r) => `${r.from}${r.days > 1 ? ' .. ' + r.to : ''} (${r.days} d)`;

function pct(sorted, p) {
  if (!sorted.length) return null;
  return sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))];
}

// pairs: [{date, a:{total,active,servers}, b:{...}, lag?}] -> how often and by how much they differ.
function compare(pairs) {
  const out = { compared: pairs.length, identical: 0, differing: 0, total_differs: 0, active_differs: 0, servers_compared: 0, servers_differs: 0 };
  const rel = [];
  const worst = [];
  for (const p of pairs) {
    const dt = p.b.total - p.a.total;
    const da = p.b.active - p.a.active;
    if (!dt && !da) out.identical++;
    else {
      out.differing++;
      if (dt) out.total_differs++;
      if (da) out.active_differs++;
      rel.push(Math.max(Math.abs(dt) / p.a.total, Math.abs(da) / p.a.active));
      worst.push({ date: p.date, a: p.a, b: p.b, d_total: dt, d_active: da, via: p.via });
    }
    if (p.a.servers && p.b.servers) {
      out.servers_compared++;
      if (p.a.servers !== p.b.servers) out.servers_differs++;
    }
  }
  rel.sort((x, y) => x - y);
  const r = (v) => (v === null ? null : Number(v.toFixed(6)));
  out.rel_diff_of_differing = { median: r(pct(rel, 50)), p90: r(pct(rel, 90)), max: r(rel.length ? rel[rel.length - 1] : null) };
  out.over_1pct = rel.filter((v) => v > 0.01).length;
  out.over_0_1pct = rel.filter((v) => v > 0.001).length;
  worst.sort((x, y) => Math.abs(y.d_total) + Math.abs(y.d_active) - Math.abs(x.d_total) - Math.abs(x.d_active));
  out.largest = worst.slice(0, 10);
  return out;
}

function buildPlan(archive, snaps, cdx, opts) {
  const cov = coverage(snaps);
  const have = new Map(archive.map((r) => [r.date, r]));
  const missing = missingDays(archive);
  const apiHoles = holes(snaps, cdx, missing.filter((d) => !cov.has(d)));
  const rejected = [];

  // Spike checks run on the series of earliest-capture values.
  const waySeries = new Map([...cov].map(([d, hits]) => [d, hits[0]]));
  const added = [];
  const captureConflicts = [];
  for (const d of missing) {
    const hits = cov.get(d);
    if (hits) {
      if (isSpike(waySeries, d)) {
        rejected.push({ date: d, ts: hits[0].ts, total: hits[0].total, active: hits[0].active });
        continue;
      }
      const w = hits[0];
      added.push({ date: d, total: w.total, active: w.active, ...(w.servers ? { servers: w.servers } : {}), ts: w.ts });
      for (const o of hits.slice(1)) {
        if (o.total !== w.total || o.active !== w.active) {
          captureConflicts.push({ date: d, first: w.ts, other: o.ts, d_total: o.total - w.total, d_active: o.active - w.active });
        }
      }
    }
  }
  const filled = new Set(added.map((a) => a.date));
  const remaining = missing.filter((d) => !filled.has(d));

  const pairs = (src) => src.filter((p) => have.has(p.date)).map((p) => ({ date: p.date, a: have.get(p.date), b: p, via: p.ts, lag: p.lag }));
  const wayAll = [];
  for (const [ts, { entries }] of snaps) for (const e of entries) wayAll.push({ ...e, ts, lag: dayNum(captureDay(ts)) - dayNum(e.date) });
  const overlap = { wayback_vs_archive: compare(pairs(wayAll)), wayback_by_lag_days: {} };
  const byLag = { '1': [], '2': [], '3-7': [], '8-30': [] };
  for (const p of pairs(wayAll)) byLag[p.lag === 1 ? '1' : p.lag === 2 ? '2' : p.lag <= 7 ? '3-7' : '8-30'].push(p);
  for (const [k, v] of Object.entries(byLag)) {
    const c = compare(v);
    overlap.wayback_by_lag_days[k] = { compared: c.compared, identical: c.identical, differing: c.differing };
  }
  const serversFill = [];
  if (opts.fillServers) {
    for (const r of archive) {
      if (r.servers !== undefined) continue;
      const hit = (cov.get(r.date) || []).find((h) => h.servers);
      if (hit) serversFill.push({ date: r.date, servers: hit.servers, ts: hit.ts });
    }
  }
  const zeroDays = new Set();
  for (const { zeros } of snaps.values()) for (const z of zeros || []) zeroDays.add(z);
  const remainingWhy = Object.fromEntries(remaining.map((d) => [d, zeroDays.has(d) ? 'API lists the day with zero counts' : apiHoles.has(d) ? 'API has no row for the day' : 'no capture holds it']));
  return { missing, added, remaining, remainingWhy, apiHoles: [...apiHoles], rejected, captureConflicts, overlap, serversFill };
}

function merge(archive, plan) {
  const byDate = new Map(archive.map((r) => [r.date, { ...r }]));
  for (const a of plan.added) {
    const { ts, ...row } = a;
    byDate.set(a.date, row);
  }
  for (const s of plan.serversFill) {
    const r = byDate.get(s.date);
    if (r && r.servers === undefined) r.servers = s.servers;
  }
  const order = ['date', 'total', 'active', 'servers', 'statuses', 'fedi_users', 'fedi_instances', 'flags'];
  const rows = [...byDate.values()]
    .sort((a, b) => (a.date < b.date ? -1 : 1))
    .map((r) => {
      const o = {};
      for (const k of order) if (r[k] !== undefined) o[k] = r[k];
      for (const k of Object.keys(r)) if (!(k in o)) o[k] = r[k];
      return o;
    });
  return flagsLib.flagRows(rows);
}

// ---------- CLI ----------

function parseArgs(argv) {
  const o = { fetch: false, write: false, all: false, fillServers: false, waybackLimit: Infinity, gapMs: 10000, blockWaitS: 300, retryFailed: false,
    cache: path.join(ROOT, '.cache', 'backfill-history'), hist: path.join(ROOT, 'historicalData.js'), report: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--fetch') o.fetch = true;
    else if (a === '--write') o.write = true;
    else if (a === '--all') o.all = true;
    else if (a === '--fill-servers') o.fillServers = true;
    else if (a === '--retry-failed') o.retryFailed = true;
    else if (a === '--wayback-limit') o.waybackLimit = Number(argv[++i]);
    else if (a === '--gap-ms') o.gapMs = Number(argv[++i]);
    else if (a === '--block-wait-s') o.blockWaitS = Number(argv[++i]);
    else if (a === '--cache') o.cache = path.resolve(argv[++i]);
    else if (a === '--hist') o.hist = path.resolve(argv[++i]);
    else if (a === '--report') o.report = path.resolve(argv[++i]);
    else throw new Error(`unknown option ${a}`);
  }
  return o;
}

function summarize(plan, archiveRows, snapCount, cdxCount) {
  return {
    archive_rows: archiveRows,
    missing_before: plan.missing.length,
    gaps_before: gapRuns(plan.missing).map(fmtRun),
    filled: plan.added.length,
    rejected_as_spikes: plan.rejected,
    remaining: plan.remaining.length,
    remaining_gaps: gapRuns(plan.remaining).map(fmtRun),
    remaining_reasons: [...new Set(Object.values(plan.remainingWhy))].map((w) => `${w}: ${Object.entries(plan.remainingWhy).filter(([, v]) => v === w).map(([d]) => d).join(', ')}`),
    wayback_captures_used: Object.entries(plan.added.reduce((m, a) => ((m[a.ts] = (m[a.ts] || 0) + 1), m), {})).map(([ts, days]) => ({ ts, url: snapUrl(ts), days })),
    wayback_captures_cached: snapCount,
    wayback_captures_listed: cdxCount,
    capture_vs_capture_disagreements: plan.captureConflicts.length,
    servers_filled_in_existing_rows: plan.serversFill.length,
  };
}

async function main(argv = process.argv.slice(2), log = (m) => console.log(m)) {
  const opts = parseArgs(argv);
  const archive = parseArchive(fs.readFileSync(opts.hist, 'utf8')).sort((a, b) => (a.date < b.date ? -1 : 1));
  const missing0 = missingDays(archive);
  log(`archive: ${archive.length} rows ${archive[0].date}..${archive[archive.length - 1].date}, ${missing0.length} missing days in ${gapRuns(missing0).length} gaps`);

  const cdx = await loadCdx(opts, log);
  if (!cdx) log(opts.fetch ? 'no CDX list available' : 'no cached CDX list; pass --fetch to download it');
  const snaps = loadSnaps(opts);
  const failed = readJson(path.join(opts.cache, 'failed.json'), {});
  if (opts.fetch && cdx) await fetchNeeded(missing0, cdx, snaps, failed, opts, log);
  log(`captures in cache: ${snaps.size}${cdx ? ` of ${cdx.length} listed` : ''}`);

  const plan = buildPlan(archive, snaps, cdx, opts);
  const summary = summarize(plan, archive.length, snaps.size, cdx ? cdx.length : null);
  log(JSON.stringify(summary, (k, v) => (Array.isArray(v) && v.every((x) => typeof x === 'string') ? v.join('; ') : v), 1));
  log(JSON.stringify({ overlap: Object.fromEntries(Object.entries(plan.overlap).map(([k, v]) => [k, v.largest ? { ...v, largest: undefined } : v])) }));

  if (!plan.added.length && !plan.serversFill.length) {
    log('nothing to merge; historicalData.js untouched');
  } else if (!opts.write) {
    log('dry run: pass --write to update the archive');
  } else {
    const rows = merge(archive, plan);
    const changed = writeIfChanged(opts.hist, serializeJs(rows));
    log(changed ? `wrote ${path.relative(ROOT, opts.hist)}: ${rows.length} rows` : 'archive already up to date');
  }
  if (opts.report) writeAtomic(opts.report, JSON.stringify({ summary, added: plan.added, remaining_days: plan.remaining, api_holes: plan.apiHoles, capture_conflicts: plan.captureConflicts, overlap: plan.overlap }, null, 2));
  return summary;
}

function writeIfChanged(file, text) {
  if (fs.existsSync(file) && fs.readFileSync(file, 'utf8') === text) return false;
  writeAtomic(file, text);
  return true;
}

if (require.main === module) {
  main().catch((err) => {
    console.error(`backfill-history failed: ${err.message}`);
    process.exitCode = 1;
  });
}

module.exports = { main, missingDays, gapRuns, extractEntries, buildPlan, merge, compare, isSpike };
