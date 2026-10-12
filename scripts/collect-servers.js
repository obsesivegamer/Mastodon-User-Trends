#!/usr/bin/env node
// Collects the Mastodon server board from FediDB and writes data/servers.js (Contract S).
// Run daily by .github/workflows/collect-servers.yml.
//
// Requests per run: 1 software totals + 3 server pages (the API caps `limit` at 40 and pages by cursor).
// FediDB allows 30 requests per minute per IP (x-ratelimit-limit); we pace at one request per 3 s and
// honour Retry-After on a 429. Gainers and losers compare against the previous file's history, so they
// stay empty until a snapshot 20-36 h (24h) or 6-8 days (7d) old exists.
//
// Env: DATA_DIR (default ./data). SERVERS_ACCEPT_DROP=1 or --accept-drop: one-off, accept a level change
// of more than 20% (total users, server count or the largest server) that would otherwise be refused.
// The snapshot is still validated. Use it only after checking the drop is real, then run without it.
//
// Known limit: FediDB pages with a cursor holding only `user_count`, so a server tied on user_count with
// the last row of a page can be skipped by the API itself. Two servers sharing a count at a page edge
// (40 or 80) is rare, and the sibling reappears on the next run; we cannot see or fix it from here.

const fs = require('fs');
const path = require('path');
const servers = require('../lib/servers.js');

const UA = 'Mastodon-User-Trends (+https://github.com/obsesivegamer/Mastodon-User-Trends)';
const API = 'https://api.fedidb.org/v1';
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
const FILE = path.join(DATA_DIR, 'servers.js');
const PAGE_LIMIT = 40; // the API rejects anything larger with a redirect
const MAX_PAGES = 5;
const PACE_MS = 3000;
const ATTEMPTS = 5;
const TIMEOUT_MS = 30e3;
const MAX_WAIT_MS = 90e3;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// One paced, retrying GET returning parsed JSON. Redirects are not followed (a 3xx means the query was
// rejected). `stats` counts requests, retries included.
function makeClient({ fetchImpl = fetch, pace = PACE_MS, sleepImpl = sleep, log = console.log } = {}) {
  const stats = { requests: 0, retries: 0, throttled: 0 };
  let last = 0;
  async function getJson(url) {
    let lastErr;
    let waited = false; // a 429 already slept for Retry-After
    for (let i = 0; i < ATTEMPTS; i++) {
      if (i) { stats.retries++; if (!waited) await sleepImpl(Math.min(30e3, 2000 * 2 ** i)); }
      waited = false;
      const wait = last + pace - Date.now();
      if (wait > 0) await sleepImpl(wait);
      last = Date.now();
      stats.requests++;
      try {
        const res = await fetchImpl(url, { headers: { 'User-Agent': UA, Accept: 'application/json' }, redirect: 'manual', signal: AbortSignal.timeout(TIMEOUT_MS) });
        if (res.status === 429) {
          stats.throttled++;
          const retryAfter = Number(res.headers.get('retry-after'));
          const ms = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 30e3;
          log(`429 from FediDB, waiting ${Math.ceil(Math.min(ms, MAX_WAIT_MS) / 1000)}s`);
          await sleepImpl(Math.min(ms, MAX_WAIT_MS));
          waited = true;
          lastErr = new Error('HTTP 429');
          continue;
        }
        if (res.status >= 300 && res.status < 400) throw Object.assign(new Error(`HTTP ${res.status} (query rejected)`), { fatal: true });
        // A permanent client error cannot succeed on retry (408 and 429 are the transient ones).
        if (res.status >= 400 && res.status < 500 && res.status !== 408) throw Object.assign(new Error(`HTTP ${res.status}`), { fatal: true });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const header = res.headers.get('x-ratelimit-remaining');
        if (header !== null && header !== '' && Number(header) <= 2) await sleepImpl(20e3); // absent header = unknown
        return await res.json();
      } catch (err) {
        if (err.fatal) throw err;
        lastErr = err;
      }
    }
    throw lastErr;
  }
  return { getJson, stats };
}

// Pages /servers by cursor until `want` usable rows or no further cursor (at most MAX_PAGES). The next
// URL is built from the cursor itself, never from `links.next`, so a response cannot send the collector
// to another host.
async function fetchServerRows(getJson, want = servers.TOP_N) {
  const rows = [];
  const seen = new Set();
  let cursor = null;
  for (let page = 0; page < MAX_PAGES; page++) {
    const url = `${API}/servers?software=mastodon&limit=${PAGE_LIMIT}${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`;
    const d = await getJson(url);
    if (!d || !Array.isArray(d.data)) throw new Error('unexpected FediDB servers response');
    rows.push(...d.data);
    cursor = d.meta && typeof d.meta.next_cursor === 'string' ? d.meta.next_cursor : null;
    if (servers.topServers(rows, want).servers.length >= want || !d.data.length || !cursor || seen.has(cursor)) break;
    seen.add(cursor);
  }
  return rows;
}

function readPrevious(file) {
  let text;
  try {
    text = fs.readFileSync(file, 'utf8');
  } catch (err) {
    if (err.code === 'ENOENT') return null;
    throw err;
  }
  // An unreadable file must stop the run: carrying on would publish one day of history and skip every
  // comparison with the previous counts. Delete the file to start over on purpose.
  try {
    const parsed = servers.parseScript(text);
    if (!parsed || parsed.schema !== servers.SCHEMA || !Array.isArray(parsed.servers) || !Array.isArray(parsed.history)) throw new Error('unexpected schema');
    return parsed;
  } catch (err) {
    throw new Error(`${file} exists but cannot be read (${err.message}); fix it or delete it to start without history`);
  }
}

function writeAtomic(file, text) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, text);
  fs.renameSync(tmp, file);
}

// `fetchImpl`, `now`, `pace`, `sleepImpl` let a scratch script drive this without the network.
async function main({ file = FILE, fetchImpl = fetch, now = Date.now, pace = PACE_MS, sleepImpl = sleep, log = console.log, acceptDrop = false } = {}) {
  const started = Date.now();
  const client = makeClient({ fetchImpl, pace, sleepImpl, log });
  const previous = readPrevious(file);

  const totals = servers.normalizeTotals(await client.getJson(`${API}/software/mastodon`));
  const rows = await fetchServerRows(client.getJson);
  const ranked = servers.topServers(rows);
  const { servers: top } = ranked;
  if (ranked.dropped) log(`${ranked.dropped} unusable server rows in the pages read`);
  const droppedIssue = servers.droppedProblem(ranked, totals.users);
  if (droppedIssue) throw new Error(`refusing to write ${path.basename(file)}: ${droppedIssue}`);

  const next = servers.validateServers(servers.buildServers({ totals, servers: top, previous, nowMs: now() }));
  const refuse = servers.refuseReason(previous, next, { acceptDrop });
  if (refuse) throw new Error(`refusing to overwrite ${path.basename(file)}: ${refuse}`);
  const accepted = acceptDrop && servers.refuseReason(previous, next);
  if (accepted) log(`--accept-drop: accepting the level change (${accepted})`);

  writeAtomic(file, servers.renderScript(next));
  const d = next.decentralization;
  log(`wrote ${path.basename(file)}: ${next.servers.length} servers, ${totals.users} users, top1 ${(d.top1 * 100).toFixed(1)}%, ` +
    `servers_for_half ${d.servers_for_half}, history ${next.history.length} day(s), ` +
    `movers 24h ${next.boards.gainers_24h.length}+${next.boards.losers_24h.length} / 7d ${next.boards.gainers_7d.length}+${next.boards.losers_7d.length}`);
  log(`${client.stats.requests} requests (${client.stats.retries} retries, ${client.stats.throttled} throttled) in ${Math.round((Date.now() - started) / 100) / 10}s`);
  return next;
}

module.exports = { main, makeClient, fetchServerRows };

const ACCEPT_DROP = process.argv.includes('--accept-drop') || process.env.SERVERS_ACCEPT_DROP === '1';

if (require.main === module) main({ acceptDrop: ACCEPT_DROP }).catch((err) => { console.error(err.message || err); process.exitCode = 1; });
