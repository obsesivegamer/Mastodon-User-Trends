#!/usr/bin/env node
// Builds data/social.js (window.MASTODON_SOCIAL): most-followed accounts, follower and post movers, and
// top posts of the last complete UTC day, from the public APIs of the largest Mastodon servers.
//
//   node scripts/collect-social.js
//
// Discovery, in order (see lib/social.js for the guardrails every published account passes):
//   1. trending posts and the profile directory (order=active, local) of the largest servers by FediDB users
//   2. accounts already published in data/social.js (their followers/posts history), so they persist
//   3. accounts followed by a rotating sample of the accounts found so far (one page each)
// Identity is the server that serves the profile: an account is published as username@<host> only when
// that same host's own response (directory, lookup, its trends or its follow lists) describes a local
// account with a profile url on that host. Everything learned through another server (follow lists of
// other hosts, trending authors, history) only nominates a candidate; it is never used as a value until
// accounts/lookup on the candidate's own host confirms it.
//
// Env: DATA_DIR (default ./data, where social.js is read and written), NOW (ISO time, for tests).
// Exits non-zero and writes nothing if too little was found or validation fails, so a bad run leaves the
// previous data/social.js in place. No local state is kept: accounts under 10,000 followers are never
// written anywhere.

const fs = require('fs');
const path = require('path');
const social = require('../lib/social.js');

const UA = 'Mastodon-User-Trends (+https://github.com/obsesivegamer/Mastodon-User-Trends)';
const FEDIDB = 'https://api.fedidb.org/v1';

const CONFIG = {
  servers: 40,
  trendPages: 3,
  dirPages: 200,
  dirInactiveDays: 90,
  gapMs: 1100,
  concurrency: 20,
  dirHostMs: 8 * 60e3,
  hostBudget: 900,
  requestTimeoutMs: 45e3,
  refreshMin: 5000,
  lookupCap: 2500,
  expandSeeds: 250,
  candidatePosts: 150,
  historyMax: 2000,
  timeBudgetMs: 35 * 60e3,
  minServers: 5,
  minEligible: 20,
  maxBodyBytes: 4 * 1024 * 1024,
  maxWaitMs: 60e3,
  maxRedirects: 2,
};

const RULES = [
  'Only accounts with 10,000 or more followers are listed.',
  'Accounts must have opted into discoverability (the profile directory); accounts that opted out of search indexing are never listed.',
  'Bots, locked, group, no-index, suspended, limited, moved and memorial accounts are never listed.',
  'Accounts are identified by the server that serves their profile (the handle shown is username@that server), and follower and post counts are read from that server.',
  'Top posts must be public, not marked sensitive, carry no content warning, come from a listed account and have been created on the reported UTC day.',
];

const sleepReal = (ms) => new Promise((r) => setTimeout(r, ms));

function fnv(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h;
}

async function mapLimit(items, limit, fn) {
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const i = next++;
      await fn(items[i], i);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
}

function writeAtomic(file, text) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, text);
  fs.renameSync(tmp, file);
}

// HTTP client: one request at a time per host, spaced by gapMs (a default Mastodon server allows 300
// requests per 5 minutes per IP), waits out X-RateLimit-Remaining/Reset and 429 Retry-After for at most
// min(maxWaitMs, time left) and abandons the host otherwise, retries timeouts and 5xx with backoff, gives
// up on a host after repeated failures, and never retries other 4xx. Only https, port-less, credential-less
// URLs are requested; redirects are followed only within the same host (at most maxRedirects); bodies are
// read through a size cap; nothing is requested after hardStop, and no wait outlasts it.
function createClient({ fetchImpl, sleep, now, log, cfg, stats, hardStop }) {
  const hosts = new Map();
  const state = (h) => {
    if (!hosts.has(h)) hosts.set(h, { next: 0, remaining: null, resetAt: 0, fails: 0, dead: false, n: 0, limited: 0 });
    return hosts.get(h);
  };
  const dead = (msg) => Object.assign(new Error(msg), { status: 0, dead: true });

  async function readJson(res) {
    const cap = cfg.maxBodyBytes;
    const len = Number(res.headers.get('content-length'));
    if (Number.isFinite(len) && len > cap) {
      if (res.body && res.body.cancel) res.body.cancel().catch(() => {});
      throw new Error('response too large');
    }
    if (res.body && typeof res.body.getReader === 'function') {
      const reader = res.body.getReader();
      const chunks = [];
      let size = 0;
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.length;
        if (size > cap) {
          reader.cancel().catch(() => {});
          throw new Error('response too large');
        }
        chunks.push(value);
      }
      return JSON.parse(Buffer.concat(chunks).toString('utf8'));
    }
    return res.json();
  }

  async function fetchOnce(url, signal) {
    let cur = url;
    for (let hop = 0; hop <= cfg.maxRedirects; hop++) {
      const res = await fetchImpl(cur, { headers: { 'User-Agent': UA, Accept: 'application/json' }, signal, redirect: 'manual' });
      if (!(res.status >= 300 && res.status < 400)) return res;
      if (res.body && res.body.cancel) res.body.cancel().catch(() => {});
      let next;
      try { next = new URL(res.headers.get('location') || '', cur); } catch { next = null; }
      const from = new URL(cur);
      if (!next || next.protocol !== 'https:' || next.host !== from.host || next.username || next.password) {
        throw Object.assign(new Error(`HTTP ${res.status} redirect not followed`), { status: res.status, redirect: true });
      }
      cur = next.href;
    }
    throw Object.assign(new Error('too many redirects'), { status: 0, redirect: true });
  }

  async function getJson(url, { retries = 2 } = {}) {
    const u = new URL(url);
    if (u.protocol !== 'https:' || u.port || u.username || u.password) throw Object.assign(new Error(`refusing ${u.protocol}//${u.host}`), { status: 0 });
    const host = u.host;
    const s = state(host);
    let lastErr;
    for (let attempt = 0; attempt <= retries; attempt++) {
      let left = hardStop - now();
      if (left <= 0) throw dead('time budget used');
      if (s.dead) throw dead(`${host}: given up for this run`);
      if (s.n >= cfg.hostBudget) throw dead(`${host}: request budget used`);
      if (s.remaining !== null && s.remaining <= 4 && s.resetAt > now()) {
        const w = s.resetAt - now() + 1000;
        if (w > Math.min(cfg.maxWaitMs, left)) { s.dead = true; throw dead(`${host}: rate limit window too long to wait (${Math.round(w / 1000)}s)`); }
        await sleep(w);
      }
      const t = now();
      const at = Math.max(t, s.next);
      left = hardStop - t;
      if (at - t > left) throw dead('time budget used');
      s.next = at + cfg.gapMs;
      if (at > t) await sleep(at - t);
      left = hardStop - now();
      if (left <= 0) throw dead('time budget used');
      s.n++;
      stats.requests++;
      if (stats.requests % 250 === 0) log(`progress: ${stats.requests} requests, ${Math.round((now() - stats.started) / 1000)}s`);
      stats.byHost[host] = (stats.byHost[host] || 0) + 1;

      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), Math.min(cfg.requestTimeoutMs, left));
      const sent = now();
      let res;
      let body;
      let parseErr = null;
      try {
        res = await fetchOnce(url, ctrl.signal);
        const rem = Number(res.headers.get('x-ratelimit-remaining'));
        const reset = Date.parse(res.headers.get('x-ratelimit-reset') || '');
        if (Number.isFinite(rem)) s.remaining = rem;
        if (Number.isFinite(reset)) s.resetAt = reset;
        if (!stats.limits[host] && res.headers.get('x-ratelimit-limit')) stats.limits[host] = Number(res.headers.get('x-ratelimit-limit'));
        if (res.ok) {
          try {
            body = await readJson(res);
          } catch (e) {
            if (e && e.name === 'AbortError') throw e;
            parseErr = e;
          }
        }
      } catch (e) {
        clearTimeout(timer);
        if (e && e.redirect) {
          stats.failures++;
          throw Object.assign(new Error(`${host}: ${e.message}`), { status: e.status, redirect: true });
        }
        lastErr = Object.assign(new Error(`${host}: ${e && e.name === 'AbortError' ? 'timeout' : e.message}`), { status: 0 });
        s.fails++;
        stats.failures++;
        if (s.fails >= 4) s.dead = true;
        const back = Math.min(2000 * 2 ** attempt, Math.max(0, hardStop - now()));
        if (attempt < retries && back > 0) await sleep(back);
        continue;
      }
      clearTimeout(timer);
      stats.hostMs[host] = (stats.hostMs[host] || 0) + (now() - sent);
      if (res.ok) {
        if (parseErr) {
          stats.failures++;
          throw Object.assign(new Error(`${host}: unusable response (${parseErr.message})`), { status: 200, bad: true });
        }
        s.fails = 0;
        return body;
      }
      lastErr = Object.assign(new Error(`HTTP ${res.status} for ${url}`), { status: res.status });
      if (res.status === 429) {
        s.limited++;
        stats.rateLimited++;
        const ra = Number(res.headers.get('retry-after'));
        const wait = Number.isFinite(ra) && ra > 0 ? ra * 1000 : s.resetAt > now() ? s.resetAt - now() + 1000 : 60e3;
        const room = Math.min(cfg.maxWaitMs, hardStop - now());
        if (wait > room || s.limited >= 4) {
          log(`${host}: 429, retry in ${Math.round(wait / 1000)}s is too long; giving up on this host`);
          s.dead = true;
          throw lastErr;
        }
        log(`${host}: 429, waiting ${Math.round(wait / 1000)}s`);
        s.remaining = 0;
        s.resetAt = now() + wait;
        await sleep(wait);
        continue;
      }
      if (res.status >= 500) {
        s.fails++;
        stats.failures++;
        if (s.fails >= 4) s.dead = true;
        const back = Math.min(2000 * 2 ** attempt, Math.max(0, hardStop - now()));
        if (attempt < retries && back > 0) await sleep(back);
        continue;
      }
      throw lastErr;
    }
    throw lastErr;
  }
  return { getJson, hosts };
}

function loadPrevious(file, log) {
  let text;
  try {
    text = fs.readFileSync(file, 'utf8');
  } catch (e) {
    if (e.code === 'ENOENT') return null;
    throw e;
  }
  const prev = social.parseScript(text);
  if (!prev || prev.schema !== 1 || !Array.isArray(prev.history)) {
    log(`warning: ${file} is not a readable schema 1 payload; starting without history`);
    return null;
  }
  return prev;
}

const USERNAME_RE = /^[a-z0-9_]+(?:[.-][a-z0-9_]+)*$/;

async function main({ env = process.env, fetchImpl = globalThis.fetch, sleep = sleepReal, log = (...a) => console.log(...a), now = Date.now, options = {} } = {}) {
  const cfg = { ...CONFIG, ...options };
  const started = now();
  const hardStop = started + cfg.timeBudgetMs;
  const nowMs = env.NOW ? Date.parse(env.NOW) : started;
  if (!Number.isFinite(nowMs)) throw new Error(`bad NOW: ${env.NOW}`);
  const dataDir = env.DATA_DIR || path.join(__dirname, '..', 'data');
  const outFile = path.join(dataDir, 'social.js');
  const day = social.reportDay(nowMs);
  const genDate = new Date(nowMs).toISOString().slice(0, 10);
  const dayStart = Date.parse(`${day}T00:00:00Z`);
  // `until` is the share of the time budget a phase may use, so a slow discovery cannot starve the
  // lookups and the post checks that must follow it.
  const timeUp = (until = 1) => now() - started > cfg.timeBudgetMs * until;
  const stats = { requests: 0, failures: 0, rateLimited: 0, byHost: {}, hostMs: {}, limits: {}, phases: {}, started };
  const client = createClient({ fetchImpl, sleep, now, log, cfg, stats, hardStop });
  const warnings = [];
  const warn = (m) => { warnings.push(m); log(`warning: ${m}`); };
  const phase = (name, since) => { stats.phases[name] = Math.round((now() - since) / 1000); };
  const avatarHosts = options.avatarHosts || social.AVATAR_HOSTS;

  const prev = loadPrevious(outFile, log);
  const prevHistory = prev ? prev.history : [];
  const prevAccounts = prev && prev.accounts && typeof prev.accounts === 'object' ? prev.accounts : {};
  const legacyKeys = !(prev && prev.guardrails && prev.guardrails.identity === 'serving-host');
  const prevKeys = new Set();
  for (const h of prevHistory) for (const k of Object.keys(h.followers || {})) if (social.ACCT_RE.test(k)) prevKeys.add(k);
  for (const k of Object.keys(prevAccounts)) if (social.ACCT_RE.test(k)) prevKeys.add(k);

  // ---- 1. which servers
  let serverList = [];
  try {
    let cursor = '';
    while (serverList.length < cfg.servers && !timeUp(0.1)) {
      const url = `${FEDIDB}/servers?software=mastodon&limit=40${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`;
      const res = await client.getJson(url, { retries: 3 });
      for (const d of res.data || []) {
        const domain = d && typeof d.domain === 'string' ? d.domain.toLowerCase() : '';
        if (social.validHost(domain) && !serverList.includes(domain)) serverList.push(domain);
      }
      cursor = res.meta && res.meta.next_cursor;
      if (!cursor || !(res.data || []).length) break;
    }
  } catch (e) {
    warn(`FediDB server list failed (${e.message}); falling back to the servers of already published accounts`);
  }
  if (!serverList.length && !legacyKeys) {
    const counts = new Map();
    for (const k of prevKeys) { const d = k.split('@')[1]; counts.set(d, (counts.get(d) || 0) + 1); }
    serverList = [...counts].sort((a, b) => b[1] - a[1]).map(([d]) => d);
  }
  serverList = serverList.slice(0, cfg.servers);
  if (!serverList.length) throw new Error('no servers to scan');
  const serverSet = new Set(serverList);
  log(`servers: ${serverList.length} (${serverList.slice(0, 5).join(', ')}, ...)`);

  // ---- candidate registry. key = username@<host that serves the profile>; `fresh` means that host's own
  // response described the account as local with a profile url on that host.
  const cands = new Map(); // key -> {key, username, urlHost, raw, fresh, via, stub, persisted, looked}
  const statuses = new Map(); // status uri -> status (trend copies, used only to nominate posts)
  const gone = new Set(); // keys that must leave every published snapshot
  const via = {};

  function addCandidate(raw, requestHost, source) {
    if (!raw || typeof raw !== 'object' || typeof raw.url !== 'string' || typeof raw.username !== 'string') return null;
    if (!Number.isFinite(raw.followers_count)) return null;
    const urlHost = social.httpsHost(raw.url);
    const username = raw.username.toLowerCase();
    if (!urlHost || !USERNAME_RE.test(username)) return null;
    const key = `${username}@${urlHost}`;
    if (!social.ACCT_RE.test(key)) return null;
    const local = typeof raw.acct === 'string' && raw.acct.toLowerCase() === username;
    const fresh = local && urlHost === requestHost;
    let c = cands.get(key);
    if (!c) {
      c = { key, username, urlHost, raw: null, fresh: false, via: source, stub: false };
      cands.set(key, c);
      via[source] = (via[source] || 0) + 1;
    }
    c.stub = false;
    if (!c.raw || (fresh && !c.fresh) || (!fresh && !c.fresh && raw.followers_count > c.raw.followers_count)) {
      c.raw = raw;
      c.fresh = fresh;
    }
    return c;
  }

  function addStatus(s, requestHost) {
    if (!s || typeof s !== 'object' || typeof s.uri !== 'string' || !s.account) return;
    addCandidate(s.account, requestHost, 'trend');
    const cur = statuses.get(s.uri);
    if (!cur || (s.favourites_count || 0) > (cur.favourites_count || 0)) statuses.set(s.uri, s);
  }

  // Runs fn(host, job) for each job, one host after another per host (the client spaces them), several
  // hosts at once; hosts with the most work start first.
  async function perHost(jobsByHost, fn, until = 1) {
    const hosts = [...jobsByHost.keys()].sort((a, b) => jobsByHost.get(b).length - jobsByHost.get(a).length);
    await mapLimit(hosts, cfg.concurrency, async (host) => {
      for (const job of jobsByHost.get(host)) {
        if (timeUp(until)) return;
        try {
          await fn(host, job);
        } catch (e) {
          if (e.dead) return;
        }
      }
    });
  }

  // ---- 2. trends and directories
  const scanned = new Set();
  const dirCutoff = nowMs - cfg.dirInactiveDays * social.DAY_MS;
  const t1 = now();
  const dirStats = {};
  await perHost(new Map(serverList.map((d) => [d, [d]])), async (domain) => {
    const st = (dirStats[domain] = { trends: 0, dirPages: 0, dirAccounts: 0, error: null });
    for (let p = 0; p < cfg.trendPages && !timeUp(0.55); p++) {
      let list;
      try {
        list = await client.getJson(`https://${domain}/api/v1/trends/statuses?limit=40&offset=${p * 40}`);
      } catch (e) {
        if (!st.error) st.error = `trends: ${e.message}`;
        if (e.dead) return;
        break;
      }
      if (!Array.isArray(list)) break;
      scanned.add(domain);
      st.trends += list.length;
      for (const s of list) addStatus(s, domain);
      if (list.length < 40) break;
    }
    const dirStart = now();
    for (let p = 0; p < cfg.dirPages && !timeUp(0.55) && now() - dirStart < cfg.dirHostMs; p++) {
      let list;
      try {
        list = await client.getJson(`https://${domain}/api/v1/directory?limit=80&offset=${p * 80}&order=active&local=true`);
      } catch (e) {
        st.error = `directory: ${e.message}`;
        return;
      }
      if (!Array.isArray(list)) return;
      scanned.add(domain);
      st.dirPages++;
      st.dirAccounts += list.length;
      for (const a of list) addCandidate(a, domain, 'directory');
      const last = list.length ? Date.parse(list[list.length - 1].last_status_at) : NaN;
      if (list.length < 80 || (Number.isFinite(last) && last < dirCutoff)) return;
    }
  }, 0.55);
  phase('discovery', t1);
  log(`discovery: ${scanned.size} of ${serverList.length} servers answered, ${cands.size} accounts, ${statuses.size} trending posts, ${stats.requests} requests, ${stats.phases.discovery}s`);
  if (scanned.size < cfg.minServers) throw new Error(`only ${scanned.size} servers answered; refusing to publish`);

  // Persisted accounts not met again are looked up on the server named in their key. Keys written before
  // keys meant "serving host" may name a handle domain: those are kept only when the host is known to serve
  // the account (a stored profile url on it, or one of the scanned servers); the rest are dropped.
  let migrationDropped = 0;
  for (const key of prevKeys) {
    if (cands.has(key)) { cands.get(key).persisted = true; continue; }
    const [username, domain] = key.split('@');
    if (legacyKeys) {
      const url = prevAccounts[key] && social.httpsHost(prevAccounts[key].url);
      if (!(url ? url === domain : serverSet.has(domain))) { gone.add(key); migrationDropped++; continue; }
    }
    cands.set(key, { key, username, urlHost: domain, raw: null, fresh: false, via: 'previous', stub: true });
    via.previous = (via.previous || 0) + 1;
  }
  if (migrationDropped) log(`migration: dropped ${migrationDropped} history keys whose serving host cannot be confirmed`);

  // ---- 3. read candidates from their own servers
  const lookupOk = new Map(); // host -> number of accounts/lookup 200s this run
  const notFound = []; // {key, host}
  async function refresh(label, until) {
    const t = now();
    const todo = [...cands.values()].filter((c) => !c.fresh && !c.looked && (c.stub || c.persisted || (c.raw && c.raw.followers_count >= cfg.refreshMin)));
    todo.sort((a, b) => ((b.stub || b.persisted ? 1 : 0) - (a.stub || a.persisted ? 1 : 0)) || ((b.raw ? b.raw.followers_count : 0) - (a.raw ? a.raw.followers_count : 0)) || (a.key < b.key ? -1 : 1));
    const jobs = new Map();
    for (const c of todo.slice(0, cfg.lookupCap)) {
      c.looked = true;
      if (!jobs.has(c.urlHost)) jobs.set(c.urlHost, []);
      jobs.get(c.urlHost).push(c);
    }
    let ok = 0;
    await perHost(jobs, async (host, c) => {
      let a;
      try {
        a = await client.getJson(`https://${host}/api/v1/accounts/lookup?acct=${encodeURIComponent(c.username)}`, { retries: 1 });
      } catch (e) {
        if (e.status === 404 || e.status === 410) notFound.push({ key: c.key, host });
        if (e.dead) throw e;
        return;
      }
      if (!a || typeof a !== 'object') return;
      lookupOk.set(host, (lookupOk.get(host) || 0) + 1);
      // the host's own answer about its own account: local handle, profile url on this host, same username
      if (typeof a.url !== 'string' || social.httpsHost(a.url) !== host) return;
      if (String(a.username).toLowerCase() !== c.username || String(a.acct).toLowerCase() !== c.username) return;
      if (!Number.isFinite(a.followers_count)) return;
      c.raw = a;
      c.fresh = true;
      ok++;
    }, until);
    phase(label, t);
    log(`${label}: ${todo.length} due, ${[...jobs.values()].reduce((n, l) => n + l.length, 0)} looked up on ${jobs.size} servers, ${ok} read, ${stats.phases[label]}s`);
  }
  await refresh('refresh', 0.7);

  // ---- 4. follow-list expansion
  if (cfg.expandSeeds > 0 && !timeUp(0.75)) {
    const t = now();
    const seeds = [...cands.values()]
      .filter((c) => c.fresh && social.isEligibleAccount(c.raw) && /^\d{1,25}$/.test(String(c.raw.id)))
      .sort((a, b) => fnv(`${day}|${a.key}`) - fnv(`${day}|${b.key}`))
      .slice(0, cfg.expandSeeds);
    const jobs = new Map();
    for (const c of seeds) {
      if (!jobs.has(c.urlHost)) jobs.set(c.urlHost, []);
      jobs.get(c.urlHost).push(c);
    }
    const before = cands.size;
    await perHost(jobs, async (host, c) => {
      const list = await client.getJson(`https://${host}/api/v1/accounts/${c.raw.id}/following?limit=80`, { retries: 1 });
      if (Array.isArray(list)) for (const a of list) addCandidate(a, host, 'following');
    }, 0.8);
    phase('expansion', t);
    log(`expansion: ${seeds.length} seeds on ${jobs.size} servers, +${cands.size - before} accounts, ${stats.phases.expansion}s`);
    await refresh('refresh2', 0.9);
  }

  // ---- 5. who is publishable, and who must leave the history
  for (const n of notFound) if ((lookupOk.get(n.host) || 0) >= 1) gone.add(n.key);
  const current = new Map(); // key -> {rec, raw}
  for (const c of cands.values()) {
    if (!c.fresh) continue;
    if (!social.isEligibleAccount(c.raw)) { gone.add(c.key); continue; }
    const rec = social.toAccount(c.raw, c.key, avatarHosts);
    if (!rec) continue;
    current.set(c.key, { rec, raw: c.raw });
  }
  for (const k of current.keys()) gone.delete(k);
  log(`eligible: ${current.size} of ${cands.size} accounts (${Object.entries(via).map(([k, v]) => `${v} via ${k}`).join(', ')})`);
  if (current.size < cfg.minEligible) throw new Error(`only ${current.size} eligible accounts; refusing to publish`);
  const prevLatest = prevHistory.length ? Object.keys(prevHistory[prevHistory.length - 1].followers || {}).length : 0;
  if (prevLatest >= 50 && current.size < prevLatest * 0.5) throw new Error(`only ${current.size} eligible accounts against ${prevLatest} in the last snapshot; refusing to publish`);

  // An account stays in the history only while it was verified (200, eligible) in this run or one of the
  // two runs before it. Today's own earlier snapshot counts as this run.
  const recent = new Set(current.keys());
  const before = prevHistory.filter((h) => h.date < genDate).slice(-2);
  const todaySnap = prevHistory.find((h) => h.date === genDate);
  for (const h of [...before, ...(todaySnap ? [todaySnap] : [])]) for (const k of Object.keys(h.followers || {})) recent.add(k);
  let stale = 0;
  for (const h of prevHistory) for (const k of Object.keys(h.followers || {})) if (!recent.has(k) && !gone.has(k)) { gone.add(k); stale++; }
  if (stale) log(`history: ${stale} accounts not verified in the last 3 runs were dropped`);

  // ---- 6. top posts. A post is published only from a response of its own origin server, whose host must be
  // the verified author's host; trend copies only nominate candidates.
  const t6 = now();
  const authors = new Map([...current.values()].map((v) => [v.rec.url.toLowerCase(), v.rec]));
  const onDay = (s) => {
    const t = Date.parse(s.created_at);
    return t >= dayStart && t < dayStart + social.DAY_MS && s.visibility === 'public' && s.sensitive === false && typeof s.spoiler_text === 'string' && s.spoiler_text.trim() === '' && !s.reblog;
  };
  const picked = [...statuses.values()]
    .filter((s) => onDay(s) && s.account && authors.has(String(s.account.url).toLowerCase()))
    .sort((a, b) => (b.favourites_count || 0) - (a.favourites_count || 0) || (a.uri < b.uri ? -1 : 1))
    .slice(0, cfg.candidatePosts);
  const wanted = new Map(); // origin host -> Set of ids
  const want = (o, authorHost) => {
    if (!o || o.host !== authorHost) return;
    if (!wanted.has(o.host)) wanted.set(o.host, new Set());
    wanted.get(o.host).add(o.id);
  };
  for (const s of picked) {
    const author = authors.get(String(s.account.url).toLowerCase());
    want(social.originOf(s.uri) || social.originOf(s.url), social.httpsHost(author.url));
  }
  let carried = 0;
  if (prev && prev.day === day && Array.isArray(prev.top_posts)) {
    for (const p of prev.top_posts) {
      const o = social.originOf(p && p.url);
      if (o && !(wanted.get(o.host) && wanted.get(o.host).has(o.id))) { want(o, o.host); carried++; }
    }
  }
  const jobs = new Map([...wanted].map(([h, ids]) => [h, [...ids]]));
  const finals = [];
  let refetched = 0;
  await perHost(jobs, async (host, id) => {
    let s;
    try {
      s = await client.getJson(`https://${host}/api/v1/statuses/${id}`, { retries: 1 });
    } catch (e) {
      if (e.dead) throw e;
      return;
    }
    if (!s || typeof s !== 'object' || typeof s.uri !== 'string' || typeof s.url !== 'string' || !s.account) return;
    if (social.httpsHost(s.url) !== host || social.httpsHost(s.uri) !== host || social.httpsHost(s.account.url) !== host) return;
    if (!Number.isFinite(s.favourites_count)) return;
    refetched++;
    finals.push(s);
  });
  phase('posts', t6);
  const topPosts = social.selectTopPosts(finals, authors, day);
  log(`posts: ${picked.length} candidates (+${carried} carried), ${refetched} read from their origin servers, ${topPosts.length} kept, ${stats.phases.posts}s`);

  // ---- 7. boards and history
  const history0 = social.purgeHistory(prevHistory, gone);
  const byFollowers = [...current.keys()].sort((a, b) => current.get(b).rec.followers - current.get(a).rec.followers || (a < b ? -1 : 1)).slice(0, cfg.historyMax);
  const snapFollowers = {};
  const snapPosts = {};
  for (const k of byFollowers) { snapFollowers[k] = current.get(k).rec.followers; snapPosts[k] = current.get(k).rec.posts; }
  const history = social.addSnapshot(history0, nowMs, snapFollowers, snapPosts);
  const followers = new Map(byFollowers.map((k) => [k, snapFollowers[k]]));
  const postsNow = new Map(byFollowers.map((k) => [k, snapPosts[k]]));

  const boards = { followed: social.followedBoard(followers) };
  for (const win of ['24h', '7d']) {
    const b = social.BASELINES[win];
    const base = social.pickBaseline(history0, nowMs, b.target, b.min, b.max);
    const { gainers, losers } = social.moverBoards(followers, base && base.followers);
    boards[`gainers_${win}`] = gainers;
    boards[`losers_${win}`] = losers;
    boards[`active_${win}`] = social.activeBoard(postsNow, base && base.posts);
    log(`baseline ${win}: ${base ? `${base.date} (${base.at})` : 'none yet'}`);
  }

  // ---- 8. assemble, validate, write
  const displayed = new Set(topPosts.map((p) => p.author));
  for (const rows of Object.values(boards)) for (const r of rows) displayed.add(r.acct);
  const accounts = {};
  for (const k of [...displayed].sort()) accounts[k] = current.get(k).rec;

  const weekFrom = new Date(Date.parse(genDate + 'T00:00:00Z') - 6 * social.DAY_MS).toISOString().slice(0, 10);
  const out = {
    schema: 1,
    generated_at: new Date(nowMs).toISOString(),
    day,
    coverage: {
      days_7d: history.filter((h) => h.date >= weekFrom && h.date <= genDate).length,
      first_day: history[0].date,
      pool: cands.size,
      servers_scanned: scanned.size,
      note: `Accounts are found through the public profile directories and trending posts of the ${serverList.length} largest Mastodon servers (FediDB), plus accounts they follow and accounts listed earlier. Only accounts that opted into discoverability can appear, and large accounts on other servers are missed, so this list is not exhaustive. Top posts are trending candidates ranked by favourites, not every post.`,
    },
    guardrails: { min_followers: social.MIN_FOLLOWERS, identity: 'serving-host', rules: RULES },
    accounts,
    boards,
    top_posts: topPosts,
    history,
  };
  const problems = social.validateSocial(out, { avatarHosts: options.avatarHosts });
  if (problems.length) throw new Error(`validation failed:\n  ${problems.slice(0, 20).join('\n  ')}`);

  const unlisted = {};
  for (const { raw } of current.values()) {
    const a = raw.avatar_static || raw.avatar;
    const h = typeof a === 'string' && social.httpsHost(a);
    if (h && !avatarHosts.includes(h)) unlisted[h] = (unlisted[h] || 0) + 1;
  }
  if (Object.keys(unlisted).length) log(`avatar hosts not in AVATAR_HOSTS (avatar shown as placeholder): ${JSON.stringify(unlisted)}`);

  if (!options.dryRun) writeAtomic(outFile, social.renderScript(out));
  const summary = {
    seconds: Math.round((now() - started) / 1000),
    requests: stats.requests,
    failures: stats.failures,
    rateLimited: stats.rateLimited,
    phases: stats.phases,
    pool: cands.size,
    eligible: current.size,
    displayed: displayed.size,
    posts: topPosts.length,
    snapshot: byFollowers.length,
    dropped: { migration: migrationDropped, stale, gone: gone.size },
    warnings: warnings.length,
  };
  log(`done: ${JSON.stringify(summary)}`);
  return { out, summary, stats, dirStats, current, unlisted };
}

module.exports = { main, createClient, mapLimit, CONFIG, RULES };

if (require.main === module) {
  main().then(
    () => process.exit(0),
    (e) => {
      console.error(`collect-social failed: ${e.message}`);
      process.exit(1);
    },
  );
}
