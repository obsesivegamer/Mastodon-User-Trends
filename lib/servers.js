'use strict';
// Server board for the Mastodon page: Contract S (data/servers.js). Pure functions, no I/O.
// Source is FediDB (software "mastodon"); its totals are a different base from joinmastodon's
// statistics API and are never mixed with it.

const DAY_MS = 86400e3;
const HOUR_MS = 3600e3;
const SCHEMA = 1;
const SOURCE = 'fedidb';
const TOP_N = 100; // servers listed
const BOARD_SIZE = 25;
const HISTORY_DAYS = 8; // today + 7 prior days: the oldest still serves as the 7d baseline
const MIN_SERVERS = 50; // below this the file is not worth publishing
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const BOARD_KEYS = ['largest', 'active', 'gainers_24h', 'losers_24h', 'gainers_7d', 'losers_7d'];
const BASELINES = {
  '24h': { target: 24 * HOUR_MS, min: 20 * HOUR_MS, max: 36 * HOUR_MS },
  '7d': { target: 7 * DAY_MS, min: 6 * DAY_MS, max: 8 * DAY_MS },
};

const isoDate = (ms) => new Date(ms).toISOString().slice(0, 10);
const dateMs = (d) => Date.parse(`${d}T00:00:00Z`);
const isCount = (x) => Number.isInteger(x) && x >= 0 && x <= Number.MAX_SAFE_INTEGER;
const cmp = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
const round4 = (x) => Math.round(x * 1e4) / 1e4;

const LABEL = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/;
// Same pattern the panel (social.js) accepts; the value is shown on the page, so nothing else gets through.
const VERSION_RE = /^[0-9A-Za-z][0-9A-Za-z.+_~-]{0,39}$/;
// Domains come from the network and end up in the page, so only plain lowercase DNS names pass.
function isSafeDomain(d) {
  if (typeof d !== 'string' || d.length > 253) return false;
  const labels = d.split('.');
  return labels.length >= 2 && labels.every((l) => LABEL.test(l)) && !/^[0-9]+$/.test(labels[labels.length - 1]);
}

// One FediDB /v1/servers row -> Contract S server row, or null if it is not usable.
function normalizeServer(raw) {
  const domain = raw && typeof raw.domain === 'string' ? raw.domain.trim().toLowerCase() : '';
  const stats = raw && raw.stats;
  if (!isSafeDomain(domain) || !stats || !isCount(stats.user_count) || !isCount(stats.status_count)) return null;
  const v = raw.software && raw.software.version;
  return {
    domain,
    users: stats.user_count,
    mau: isCount(stats.monthly_active_users) ? stats.monthly_active_users : null,
    statuses: stats.status_count,
    open: raw.open_registration === true,
    version: typeof v === 'string' && VERSION_RE.test(v) ? v : null,
  };
}

// Raw rows (any number of pages, in FediDB's users-descending order) -> top n by users, unique domains.
// Cursor paging can repeat a row. Unusable rows are returned in `droppedRows` with their position in
// the raw order and their user count when it is a valid one, so the caller can refuse a run in which a
// row that belongs in the list went missing (see droppedProblem).
function topServers(rawRows, n = TOP_N) {
  const byDomain = new Map();
  const droppedRows = [];
  rawRows.forEach((raw, index) => {
    const s = normalizeServer(raw);
    if (!s) {
      const users = raw && raw.stats && isCount(raw.stats.user_count) ? raw.stats.user_count : null;
      droppedRows.push({ index, users, domain: raw && typeof raw.domain === 'string' ? raw.domain.slice(0, 80) : null });
      return;
    }
    const prev = byDomain.get(s.domain);
    if (!prev || s.users > prev.users) byDomain.set(s.domain, { server: s, index });
  });
  const ranked = [...byDomain.values()].sort((a, b) => b.server.users - a.server.users || cmp(a.server.domain, b.server.domain)).slice(0, n);
  const servers = ranked.map((r) => r.server);
  const lastIndex = ranked.length ? Math.max(...ranked.map((r) => r.index)) : -1;
  return { servers, dropped: droppedRows.length, droppedRows, lastIndex };
}

// Why unusable rows make the result untrustworthy, or null. A dropped row counts as "ranked in" when
// FediDB listed it before the last server we kept, or when its own user count beats the smallest kept
// server. Silently skipping it would shift every rank, share and board. Many small drops are refused too.
function droppedProblem({ servers, droppedRows, lastIndex }, totalUsers) {
  if (!droppedRows.length) return null;
  const smallest = servers.length ? servers[servers.length - 1].users : 0;
  const ranked = droppedRows.filter((r) => r.index < lastIndex || (r.users !== null && r.users > smallest));
  if (ranked.length) {
    const r = ranked[0];
    return `${ranked.length} unusable FediDB row(s) rank inside the top ${servers.length} (first: ${r.domain || 'no domain'}, users ${r.users === null ? 'unknown' : r.users})`;
  }
  const sum = droppedRows.reduce((a, r) => a + (r.users || 0), 0);
  if (isCount(totalUsers) && totalUsers > 0 && sum > totalUsers * 0.01) {
    return `unusable FediDB rows hold ${sum} users, more than 1% of the total ${totalUsers}`;
  }
  return null;
}

// FediDB /v1/software/mastodon -> totals. The MAU field is `monthly_actives` there (the per-server
// rows call it `monthly_active_users`); null when absent.
function normalizeTotals(raw) {
  if (!raw || !isCount(raw.user_count) || !isCount(raw.status_count) || !isCount(raw.instance_count)) {
    throw new Error('FediDB software totals are missing user_count, status_count or instance_count');
  }
  const mau = [raw.monthly_actives, raw.monthly_active_users].find(isCount);
  return { users: raw.user_count, statuses: raw.status_count, servers: raw.instance_count, mau: mau === undefined ? null : mau };
}

// ---------- history and movers ----------

function snapshotMs(s) {
  const at = Date.parse(s.at);
  return Number.isFinite(at) ? at : dateMs(s.date);
}

function cleanHistory(history) {
  if (!Array.isArray(history)) return [];
  return history.filter((s) => s && DATE_RE.test(s.date || '') && Number.isFinite(dateMs(s.date)) && s.users && typeof s.users === 'object' && !Array.isArray(s.users));
}

// One snapshot per UTC date. A rerun on the same day keeps the first snapshot, so the baseline the
// next run compares against never moves (same rule as the Bluesky site's follower history).
// Each snapshot carries `at` (ISO time taken): the 24h window needs hours, not just the date.
function addSnapshot(history, nowMs, servers) {
  const snaps = cleanHistory(history).map((s) => ({ date: s.date, at: new Date(snapshotMs(s)).toISOString(), users: s.users }));
  const date = isoDate(nowMs);
  if (!snaps.some((s) => s.date === date)) {
    snaps.push({ date, at: new Date(nowMs).toISOString(), users: Object.fromEntries(servers.map((s) => [s.domain, s.users])) });
  }
  snaps.sort((a, b) => cmp(a.date, b.date));
  return snaps.slice(-HISTORY_DAYS);
}

// The snapshot whose age is closest to targetMs within [minMs, maxMs], or null.
function pickBaseline(snapshots, nowMs, targetMs, minMs, maxMs) {
  let best = null;
  let bestDiff = Infinity;
  for (const s of snapshots || []) {
    const age = nowMs - snapshotMs(s);
    if (!(age >= minMs && age <= maxMs)) continue;
    const diff = Math.abs(age - targetMs);
    if (diff < bestDiff) { best = s; bestDiff = diff; }
  }
  return best;
}

// Net change in users per server against a baseline snapshot. Only servers present in the baseline
// count; with no baseline both lists are empty.
function moverBoards(servers, baseline, n = BOARD_SIZE) {
  const rows = [];
  if (baseline) {
    for (const s of servers) {
      const before = baseline.users[s.domain];
      if (!isCount(before)) continue;
      rows.push({ domain: s.domain, value: s.users - before });
    }
  }
  const gainers = rows.filter((r) => r.value > 0).sort((a, b) => b.value - a.value || cmp(a.domain, b.domain)).slice(0, n);
  const losers = rows.filter((r) => r.value < 0).sort((a, b) => a.value - b.value || cmp(a.domain, b.domain)).slice(0, n);
  return { gainers, losers };
}

// ---------- boards, decentralization, coverage ----------

function buildBoards(servers, baselines, n = BOARD_SIZE) {
  const boards = {
    largest: servers.slice(0, n).map((s) => ({ domain: s.domain, value: s.users })),
    active: servers.filter((s) => s.mau > 0).sort((a, b) => b.mau - a.mau || cmp(a.domain, b.domain)).slice(0, n).map((s) => ({ domain: s.domain, value: s.mau })),
  };
  for (const win of ['24h', '7d']) {
    const { gainers, losers } = moverBoards(servers, baselines[win], n);
    boards[`gainers_${win}`] = gainers;
    boards[`losers_${win}`] = losers;
  }
  return boards;
}

// Shares are of the FediDB total for all Mastodon servers (not of the listed ones), 0..1.
function decentralization(servers, totalUsers) {
  const share = (k) => round4(servers.slice(0, k).reduce((a, s) => a + s.users, 0) / totalUsers);
  let cum = 0;
  let forHalf = null;
  for (let i = 0; i < servers.length; i++) {
    cum += servers[i].users;
    if (cum * 2 >= totalUsers) { forHalf = i + 1; break; }
  }
  return {
    top1: share(1),
    top5: share(5),
    top10: share(10),
    top1_domain: servers.length ? servers[0].domain : null,
    servers_for_half: forHalf,
    listed: servers.length,
    denominator: 'totals.users',
  };
}

// days_7d: distinct snapshot dates within the 7 UTC days ending today (today counts).
function coverage(history, day) {
  const from = isoDate(dateMs(day) - 6 * DAY_MS);
  const dates = history.map((s) => s.date).filter((d) => d >= from && d <= day).sort();
  return { days_7d: Math.min(7, dates.length), first_day: dates.length ? dates[0] : day };
}

// totals: normalizeTotals(); servers: topServers().servers; previous: parsed prior file or null.
function buildServers({ totals, servers, previous, nowMs }) {
  const prevHistory = previous ? cleanHistory(previous.history) : [];
  // Ages are measured from the time of today's kept snapshot, not the clock: a rerun later the same
  // day then picks the same baselines as the first run and cannot empty the 24h boards.
  const today = prevHistory.find((s) => s.date === isoDate(nowMs));
  const anchorMs = today ? snapshotMs(today) : nowMs;
  const baselines = {};
  for (const win of ['24h', '7d']) {
    const b = BASELINES[win];
    baselines[win] = pickBaseline(prevHistory, anchorMs, b.target, b.min, b.max);
  }
  const history = addSnapshot(prevHistory, nowMs, servers);
  const day = isoDate(nowMs);
  return {
    schema: SCHEMA,
    generated_at: new Date(nowMs).toISOString(),
    day,
    source: SOURCE,
    totals,
    servers,
    boards: buildBoards(servers, baselines),
    decentralization: decentralization(servers, totals.users),
    coverage: coverage(history, day),
    history,
  };
}

// ---------- validation ----------

// Returns a list of problems (empty = valid).
function serversProblems(s) {
  const errors = [];
  const err = (m) => errors.push(m);
  if (!s || typeof s !== 'object') return ['payload is not an object'];
  if (s.schema !== SCHEMA) err(`schema must be ${SCHEMA}`);
  if (!Number.isFinite(Date.parse(s.generated_at))) err('generated_at is not a date');
  if (!DATE_RE.test(s.day || '') || !Number.isFinite(dateMs(s.day))) err('day is not YYYY-MM-DD');
  if (s.source !== SOURCE) err(`source must be ${SOURCE}`);

  const t = s.totals || {};
  for (const k of ['users', 'statuses', 'servers']) if (!isCount(t[k])) err(`totals.${k} is not a count`);
  if (t.mau !== null && !isCount(t.mau)) err('totals.mau must be a count or null');

  const servers = Array.isArray(s.servers) ? s.servers : null;
  const byDomain = new Map();
  if (!servers) err('servers must be an array');
  else {
    if (servers.length < MIN_SERVERS) err(`only ${servers.length} servers listed, need at least ${MIN_SERVERS}`);
    if (servers.length > TOP_N) err(`more than ${TOP_N} servers listed`);
    let prev = Infinity;
    let sum = 0;
    for (const r of servers) {
      if (!r || !isSafeDomain(r.domain)) { err(`server with an unusable domain: ${JSON.stringify(r && r.domain)}`); continue; }
      if (byDomain.has(r.domain)) err(`${r.domain} listed twice`);
      byDomain.set(r.domain, r);
      if (!isCount(r.users)) err(`${r.domain} users is not a count`);
      else { if (r.users > prev) err('servers are not sorted by users'); prev = r.users; sum += r.users; }
      if (r.mau !== null && !isCount(r.mau)) err(`${r.domain} mau must be a count or null`);
      if (!isCount(r.statuses)) err(`${r.domain} statuses is not a count`);
      if (typeof r.open !== 'boolean') err(`${r.domain} open is not boolean`);
      if (r.version !== null && !(typeof r.version === 'string' && VERSION_RE.test(r.version))) err(`${r.domain} version must match ${VERSION_RE} or be null`);
    }
    if (isCount(t.users) && sum > t.users) err(`listed servers hold ${sum} users, more than the FediDB total ${t.users}`);
  }

  const boards = s.boards && typeof s.boards === 'object' ? s.boards : null;
  if (!boards) err('boards missing');
  else {
    for (const key of BOARD_KEYS) {
      const rows = boards[key];
      if (!Array.isArray(rows)) { err(`boards.${key} must be an array`); continue; }
      if (rows.length > BOARD_SIZE) err(`boards.${key} has more than ${BOARD_SIZE} rows`);
      const seen = new Set();
      let prev = null;
      for (const r of rows) {
        const server = r && byDomain.get(r.domain);
        if (!server) { err(`boards.${key} lists ${r && r.domain}, which is not a listed server`); continue; }
        if (seen.has(r.domain)) err(`boards.${key} lists ${r.domain} twice`);
        seen.add(r.domain);
        if (!Number.isInteger(r.value)) { err(`boards.${key} ${r.domain} value is not an integer`); continue; }
        if (prev != null && (key.startsWith('losers_') ? r.value < prev : r.value > prev)) err(`boards.${key} is not sorted`);
        prev = r.value;
        if (key.startsWith('gainers_') && r.value <= 0) err(`boards.${key} ${r.domain} is not a gain`);
        if (key.startsWith('losers_') && r.value >= 0) err(`boards.${key} ${r.domain} is not a loss`);
        if (key === 'largest' && r.value !== server.users) err(`boards.largest ${r.domain} does not match its users`);
        if (key === 'active' && r.value !== server.mau) err(`boards.active ${r.domain} does not match its mau`);
      }
    }
  }

  const d = s.decentralization;
  if (!d || typeof d !== 'object') err('decentralization missing');
  else if (servers && isCount(t.users) && t.users > 0) {
    const want = decentralization(servers, t.users);
    for (const k of Object.keys(want)) if (d[k] !== want[k]) err(`decentralization.${k} is ${JSON.stringify(d[k])}, expected ${JSON.stringify(want[k])}`);
    for (const k of ['top1', 'top5', 'top10']) if (!(d[k] >= 0 && d[k] <= 1)) err(`decentralization.${k} is outside 0..1`);
  }

  const cov = s.coverage || {};
  if (!Number.isInteger(cov.days_7d) || cov.days_7d < 0 || cov.days_7d > 7) err('coverage.days_7d must be 0..7');
  if (!DATE_RE.test(cov.first_day || '')) err('coverage.first_day is not YYYY-MM-DD');

  const hist = Array.isArray(s.history) ? s.history : null;
  if (!hist) err('history must be an array');
  else {
    if (hist.length > HISTORY_DAYS) err(`history has more than ${HISTORY_DAYS} snapshots`);
    let prev = '';
    for (const h of hist) {
      if (!h || !DATE_RE.test(h.date || '')) { err('history entry without a date'); continue; }
      if (h.date <= prev) err('history is not ascending by unique date');
      prev = h.date;
      if (!Number.isFinite(Date.parse(h.at))) err(`history ${h.date} at is not a date`);
      if (!h.users || typeof h.users !== 'object' || Array.isArray(h.users)) { err(`history ${h.date} users is not an object`); continue; }
      for (const [dom, n] of Object.entries(h.users)) {
        if (!isSafeDomain(dom) || !isCount(n)) { err(`history ${h.date} has a bad entry for ${dom}`); break; }
      }
    }
    if (hist.length && DATE_RE.test(s.day || '') && hist[hist.length - 1].date !== s.day) err('the newest history snapshot is not for `day`');
  }
  return errors;
}

// Throws before anything is written when the payload breaks the contract.
function validateServers(s) {
  const problems = serversProblems(s);
  if (problems.length) {
    const shown = problems.slice(0, 15).join('\n  - ');
    throw new Error(`servers data is invalid (${problems.length} problems):\n  - ${shown}`);
  }
  return s;
}

// Why `next` must not replace `previous`, or null. Guards against a bad FediDB day wiping a good file.
// `acceptDrop` (the manual --accept-drop flag) skips only the level-change rules, for a drop that is real;
// the next run is compared against the new level again. A clock that went backwards is never accepted.
function refuseReason(previous, next, { acceptDrop = false } = {}) {
  if (!previous || !Array.isArray(previous.servers) || !previous.totals) return null;
  if (typeof previous.day === 'string' && previous.day > next.day) return `previous file is for ${previous.day}, newer than ${next.day}`;
  if (acceptDrop) return null;
  if (previous.servers.length >= MIN_SERVERS && next.servers.length < previous.servers.length * 0.9) {
    return `only ${next.servers.length} servers listed, previous file had ${previous.servers.length}`;
  }
  if (isCount(previous.totals.users) && previous.totals.users > 0 && next.totals.users < previous.totals.users * 0.8) {
    return `total users fell from ${previous.totals.users} to ${next.totals.users} (more than 20%)`;
  }
  const prevTop = previous.servers[0];
  if (prevTop && next.servers[0] && next.servers[0].users < prevTop.users * 0.8) {
    return `largest server fell from ${prevTop.users} to ${next.servers[0].users} (more than 20%)`;
  }
  return null;
}

// ---------- file format ----------

const PREFIX = '// generated by scripts/collect-servers.js — do not edit\nwindow.MASTODON_SERVERS = ';

function renderScript(servers) {
  return `${PREFIX}${JSON.stringify(servers)};\n`;
}

// Reads a file written by renderScript. JSON.parse only, nothing is evaluated.
function parseScript(text) {
  const m = /^window\.MASTODON_SERVERS = (.*);\s*$/m.exec(text);
  if (!m) throw new Error('not a data/servers.js file');
  return JSON.parse(m[1]);
}

module.exports = {
  SCHEMA, TOP_N, VERSION_RE, BOARD_SIZE, HISTORY_DAYS, MIN_SERVERS, BASELINES, BOARD_KEYS,
  isSafeDomain, normalizeServer, topServers, droppedProblem, normalizeTotals,
  addSnapshot, pickBaseline, moverBoards, buildBoards, decentralization, coverage, buildServers,
  serversProblems, validateServers, refuseReason, renderScript, parseScript,
};
