'use strict';
// Pure logic for the Mastodon social boards (scripts/collect-social.js): the account guardrails,
// normalisation of API objects into published records, board ranking, daily snapshots and baselines,
// top-post selection, and validation of the published payload. No I/O, no clock, no network.
//
// Guardrails (docs: SPEC Contract A). An account may be published only if it has at least 10,000
// followers, is discoverable, and is not a bot, locked, a group, noindex, indexable=false, suspended,
// limited, moved or a memorial. A top post additionally needs visibility public, sensitive false, no
// content warning text, an eligible author and a creation time inside the reported UTC day.

const DAY_MS = 86400e3;
const HOUR_MS = 3600e3;

const MIN_FOLLOWERS = 10000;
const BOARD_SIZE = 25;
const POST_CHARS = 280;
const NAME_CHARS = 100;
const HISTORY_DAYS = 8;

const BOARD_KEYS = ['followed', 'gainers_24h', 'losers_24h', 'gainers_7d', 'losers_7d', 'active_24h', 'active_7d'];
const EMBED_KINDS = ['image', 'video', 'link'];

// Hosts the page may load an avatar from (exact match, https, no port, no credentials). Measured on
// 2026-10-12 from the avatar_static URLs in the real responses of a full collector run: the media host
// of each of the 40 largest Mastodon servers (FediDB) plus the host of every account that passed the
// guardrails. Shared object-storage hosts that serve many unrelated tenants (wasabisys.com,
// amazonaws.com, backblazeb2.com) are left out on purpose; their accounts get a placeholder. A host not
// listed gets avatar:null in the data and a blank placeholder on the page; scripts/collect-social.js
// logs the unlisted hosts it meets so this list can be extended on purpose. social.js mirrors it.
const AVATAR_HOSTS = [
  'a.mindlycdn.com',
  'asset.circumstances.run',
  'assets.chaos.social',
  'assets.cybervillains.com',
  'assets.journa.host',
  'assets.newsie.social',
  'assets.toot.cafe',
  'bonn.social',
  'cache.treehouse.systems',
  'cdn.aethy.com',
  'cdn.fosstodon.org',
  'cdn.masto.host',
  'cdn.mstdn.ca',
  'climatejustice.global',
  'cultur.social',
  'cyberplace.social',
  'digipres-club.s3.bhs.io.cloud.ovh.net',
  'ec.social-network.europa.eu',
  'edi.social',
  'f2.tchncs.de',
  'fediscience.org',
  'files.bitbang.social',
  'files.defcon.social',
  'files.mastodon.green',
  'files.mastodon.online',
  'files.mastodon.social',
  'files.mstdn.party',
  'files.ohai.social',
  'files.sfba.social',
  'files.social.openrightsgroup.org',
  'files.sueden.social',
  'files.techhub.social',
  'friend.camp',
  'grapheneos.social',
  'gruenesocial-userfiles.nbg1.your-objectstorage.com',
  'hemmer.land',
  'iconfactory.world',
  'img.mstdn.jp',
  'kolektiva.social',
  'linke.social',
  'linuxrocks.online',
  'm-cdn.flipboard.social',
  'm.f-h.co',
  'masto.es',
  'mastodon-assets.gougere.fr',
  'mastodon-cdn.neat.computer',
  'mastodon.nl',
  'mastodon.sdf.org',
  'mastodon.top',
  'media.hachyderm.io',
  'media.infosec.exchange',
  'media.mas.to',
  'media.mast.lat',
  'media.masto.nu',
  'media.mastodon.cloud',
  'media.mastodon.de',
  'media.mastodon.scot',
  'media.mathstodon.xyz',
  'media.me.dm',
  'media.mstdn.social',
  'media.nerdculture.de',
  'media.norden.social',
  'media.planet.moe',
  'media.tech.lgbt',
  'media.tkz.one',
  'media.troet.cafe',
  'mediacdn.aus.social',
  'neopaquita.es',
  'o.mastodon.au',
  'pixelfed-prod.nyc3.digitaloceanspaces.com',
  'pixelfed.social',
  'pixelfed.uno',
  's3.bewegung.social',
  's3.c.im',
  's3.cmx.im',
  's3.digitalcourage.social',
  's3.masto.ai',
  'social-cdn.vivaldi.net',
  'social-coop-media.ams3.cdn.digitaloceanspaces.com',
  'social-media-cdn.panic.com',
  'social.bund.de',
  'social.heise.de',
  'static.mamot.fr',
  'static.mediapart.social',
  'static.piaille.fr',
  'static.toot.community',
  'stockage.framapiaf.org',
  'system.zdf.social',
  'systemli.social',
  'tapbots.social',
  'thecooltable.wtf',
  'tldr.nettime.org',
  'universites.social',
  'w3csocial.files.fedi.monster',
  'wisskomm.social',
  'xoxo-media.sfo2.cdn.digitaloceanspaces.com',
  'zirkus-media.fra1.cdn.digitaloceanspaces.com',
];

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const HOST_RE = /^(?=.{3,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z][a-z0-9-]{0,61}[a-z0-9]$/;
const ACCT_RE = /^([a-z0-9_]+(?:[.-][a-z0-9_]+)*)@((?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z][a-z0-9-]{0,61}[a-z0-9])$/;
const LANG_RE = /^[a-z]{2,3}(?:-[A-Za-z0-9]{2,8})?$/;

const isoDate = (ms) => new Date(ms).toISOString().slice(0, 10);
const dateMs = (date) => Date.parse(date + 'T00:00:00Z');
const cmp = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
const isInt = (x) => Number.isInteger(x);
const isNum = (x) => typeof x === 'number' && Number.isFinite(x);

// ---------- days ----------

// The report day is the newest complete UTC day: the day before the run's own date.
function reportDay(nowMs) {
  return isoDate(nowMs - DAY_MS);
}

// ---------- urls and hosts ----------

function parseHttps(url, maxLen = 500) {
  if (typeof url !== 'string' || url.length > maxLen) return null;
  let u;
  try { u = new URL(url); } catch { return null; }
  if (u.protocol !== 'https:' || u.username || u.password || u.port || !u.hostname) return null;
  return u;
}

// https URL on a plain DNS host, no credentials, no port. Returns the lowercase host or null.
function httpsHost(url, maxLen = 500) {
  const u = parseHttps(url, maxLen);
  return u && HOST_RE.test(u.hostname) ? u.hostname.toLowerCase() : null;
}

function validHost(host) {
  return typeof host === 'string' && HOST_RE.test(host);
}

function avatarOk(url, hosts = AVATAR_HOSTS) {
  const h = httpsHost(url, 400);
  return h !== null && hosts.includes(h);
}

// ---------- text ----------

// Dropped from published text: C0/C1 controls, bidi controls (not U+200C/U+200D, which Persian, Indic
// scripts and emoji sequences need), zero-width space and the invisible fillers that can make a name or
// post look empty (U+2060-2064, U+3164, U+061C, U+115F/1160, U+180E, U+17B4/17B5, U+034F, U+FFA0, U+FEFF).
const CTRL_RE = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f\u200b\u200e-\u200f\u202a-\u202e\u2060-\u2064\u2066-\u2069\u061c\u3164\u115f\u1160\u180e\u17b4-\u17b5\u034f\uffa0\ufeff]/g;
const CTRL_TEST = new RegExp(CTRL_RE.source);
const NAMED = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };

function decodeEntities(s) {
  return s.replace(/&(#x[0-9a-f]{1,6}|#\d{1,7}|[a-z]{2,6});/gi, (m, e) => {
    if (e[0] === '#') {
      const cp = e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      if (!(cp > 0 && cp <= 0x10ffff) || (cp >= 0xd800 && cp <= 0xdfff)) return '';
      return String.fromCodePoint(cp);
    }
    const v = NAMED[e.toLowerCase()];
    return v === undefined ? m : v;
  });
}

function truncate(text, max = POST_CHARS) {
  const chars = Array.from(typeof text === 'string' ? text : '');
  return chars.length > max ? chars.slice(0, max - 1).join('').trimEnd() + '…' : chars.join('');
}

function dropEmoji(text, emojis) {
  let out = text;
  for (const e of Array.isArray(emojis) ? emojis : []) {
    const code = e && typeof e.shortcode === 'string' ? e.shortcode : '';
    if (/^[A-Za-z0-9_]{2,60}$/.test(code)) out = out.split(`:${code}:`).join('');
  }
  return out;
}

// Mastodon status HTML -> plain text: hidden URL prefixes removed, line breaks kept, tags stripped,
// entities decoded, custom-emoji shortcodes dropped, control and bidi characters dropped, at most
// `max` characters.
function htmlToText(html, emojis, max = POST_CHARS) {
  let s = typeof html === 'string' ? html.slice(0, 20000) : '';
  s = s.replace(/<span class="invisible">[\s\S]*?<\/span>/gi, '');
  s = s.replace(/<span class="ellipsis">([\s\S]*?)<\/span>/gi, '$1…');
  s = s.replace(/<(p|span)\s+[^>]*class="[^"]*\bquote-inline\b[^"]*"[^>]*>[\s\S]*?<\/\1>/gi, '');
  s = s.replace(/<br\s*\/?>/gi, '\n').replace(/<\/p>\s*<p[^>]*>/gi, '\n\n').replace(/<\/(?:p|div|li|blockquote|h[1-6]|pre)>/gi, '\n');
  s = s.replace(/<[^>]*>/g, '');
  s = decodeEntities(s).replace(/\r\n?/g, '\n').replace(CTRL_RE, '');
  s = dropEmoji(s, emojis);
  s = s.replace(/^\s*RE:[ \u00a0]+(?:https?:\/\/)?[^\s/@]+\/\S*[ \t]*(?:\n|$)/, '');
  s = s.split('\n').map((l) => l.replace(/[ \t\u00a0]+/g, ' ').trim()).join('\n').replace(/\n{3,}/g, '\n\n').trim();
  return truncate(s, max);
}

function plainName(name, emojis, fallback) {
  let s = typeof name === 'string' ? name.slice(0, 600) : '';
  s = dropEmoji(s.replace(CTRL_RE, ''), emojis).replace(/\s+/g, ' ').trim();
  s = truncate(s, NAME_CHARS);
  return /[^\s\u200c\u200d]/.test(s) ? s : fallback;
}

// ---------- accounts ----------

// Raw Mastodon Account entity -> may it be published? `raw` must come from the account's own server.
function isEligibleAccount(a) {
  if (!a || typeof a !== 'object') return false;
  if (!(Number.isFinite(a.followers_count) && a.followers_count >= MIN_FOLLOWERS)) return false;
  if (a.discoverable !== true) return false;
  if (a.bot === true || a.locked === true || a.group === true || a.noindex === true) return false;
  if (a.indexable === false) return false;
  if (a.suspended === true || a.limited === true || a.memorial === true) return false;
  if (a.moved) return false;
  return true;
}

const dateOnly = (v) => (typeof v === 'string' && DATE_RE.test(v.slice(0, 10)) ? v.slice(0, 10) : null);

// Raw Account -> contract record. `acct` is the full lowercase handle chosen by the collector
// (user@domain). Avatars on hosts outside `hosts` become null. Returns null when the object cannot be published as is.
function toAccount(raw, acct, hosts = AVATAR_HOSTS) {
  const m = ACCT_RE.exec(acct);
  const urlHost = raw && httpsHost(raw.url);
  if (!m || !urlHost || typeof raw.username !== 'string') return null;
  if (urlHost !== m[2] || raw.username.toLowerCase() !== m[1]) return null;
  const avatar = typeof raw.avatar_static === 'string' ? raw.avatar_static : typeof raw.avatar === 'string' ? raw.avatar : '';
  const usable = avatarOk(avatar, hosts) && !/\/missing\.png(?:$|\?)/.test(avatar);
  return {
    acct,
    display_name: plainName(raw.display_name, raw.emojis, raw.username),
    avatar: usable ? avatar : null,
    url: raw.url,
    followers: raw.followers_count,
    following: Number.isFinite(raw.following_count) ? raw.following_count : 0,
    posts: Number.isFinite(raw.statuses_count) ? raw.statuses_count : 0,
    last_posted: dateOnly(raw.last_status_at),
    created_at: dateOnly(raw.created_at),
    domain: m[2],
  };
}

// ---------- boards ----------

// rows: [[acct, value]] best first. First `n` rows with a finite value.
function topRows(rows, n = BOARD_SIZE) {
  return rows.slice(0, n).map(([acct, value]) => ({ acct, value }));
}

// current / base: Map or object acct -> number. Returns {gainers, losers} (top n each) of net change.
function moverBoards(current, base, n = BOARD_SIZE) {
  const rows = [];
  if (base) {
    for (const [acct, now] of current) {
      const before = base[acct];
      if (!Number.isFinite(before)) continue;
      rows.push([acct, now - before]);
    }
  }
  const gainers = rows.filter((r) => r[1] > 0).sort((a, b) => b[1] - a[1] || cmp(a[0], b[0]));
  const losers = rows.filter((r) => r[1] < 0).sort((a, b) => a[1] - b[1] || cmp(a[0], b[0]));
  return { gainers: topRows(gainers, n), losers: topRows(losers, n) };
}

// Net change in posts (statuses_count) over the window; accounts with no gain are not listed.
function activeBoard(current, base, n = BOARD_SIZE) {
  return moverBoards(current, base, n).gainers;
}

function followedBoard(current, n = BOARD_SIZE) {
  return topRows([...current].sort((a, b) => b[1] - a[1] || cmp(a[0], b[0])), n);
}

// ---------- daily snapshots ----------

const BASELINES = {
  '24h': { target: 24 * HOUR_MS, min: 20 * HOUR_MS, max: 36 * HOUR_MS },
  '7d': { target: 7 * DAY_MS, min: 6 * DAY_MS, max: 8 * DAY_MS },
};

const snapMs = (s) => Date.parse(typeof s.at === 'string' ? s.at : `${s.date}T12:00:00Z`);

// The snapshot whose age is closest to `target` within [min, max], or null.
function pickBaseline(snapshots, nowMs, target, min, max) {
  let best = null;
  let bestDiff = Infinity;
  for (const s of snapshots || []) {
    const age = nowMs - snapMs(s);
    if (!(age >= min && age <= max)) continue;
    const diff = Math.abs(age - target);
    if (diff < bestDiff) { best = s; bestDiff = diff; }
  }
  return best;
}

// history: array of {date, at, followers, posts}, oldest first. One snapshot per UTC date: the first
// run of the day keeps its values and `at`, so a rerun never moves the baseline; a rerun only adds
// accounts the day's snapshot does not have yet. Keeps the newest 8 dates.
function addSnapshot(history, atMs, followers, posts) {
  const snaps = (Array.isArray(history) ? history : []).filter((s) => s && DATE_RE.test(s.date || ''));
  const date = isoDate(atMs);
  const today = snaps.find((s) => s.date === date);
  if (!today) snaps.push({ date, at: new Date(atMs).toISOString(), followers, posts });
  else {
    const f = { ...today.followers };
    const p = { ...today.posts };
    for (const k of Object.keys(followers)) if (!(k in f)) { f[k] = followers[k]; p[k] = posts[k]; }
    snaps[snaps.indexOf(today)] = { ...today, followers: f, posts: p };
  }
  snaps.sort((a, b) => cmp(a.date, b.date));
  return snaps.slice(-HISTORY_DAYS);
}

// Removes accounts that are no longer publishable from every snapshot.
function purgeHistory(history, accts) {
  return history.map((s) => {
    const followers = {};
    const posts = {};
    for (const [k, v] of Object.entries(s.followers || {})) if (!accts.has(k)) followers[k] = v;
    for (const [k, v] of Object.entries(s.posts || {})) if (!accts.has(k)) posts[k] = v;
    return { ...s, followers, posts };
  });
}

// ---------- top posts ----------

function embedKind(status) {
  const media = status && Array.isArray(status.media_attachments) ? status.media_attachments : [];
  const t = media.length && media[0] ? media[0].type : '';
  if (t === 'image') return 'image';
  if (t === 'video' || t === 'gifv') return 'video';
  if (status && status.card && typeof status.card.url === 'string') return 'link';
  return null;
}

// Origin host and id of a Mastodon status, from its URI (https://host/users/name/statuses/123) or its
// public URL (https://host/@name/123); null for software whose addresses have another shape.
function originOf(addr) {
  const a = typeof addr === 'string' ? addr : '';
  const m = /^https:\/\/([^/:@]+)\/users\/[^/]+\/statuses\/(\d{1,25})$/.exec(a) || /^https:\/\/([^/:@]+)\/@[^/]+\/(\d{1,25})$/.exec(a);
  return m && validHost(m[1].toLowerCase()) ? { host: m[1].toLowerCase(), id: m[2] } : null;
}

// Pure post filter. statuses: Mastodon Status entities; authors: Map acct-key-by-profile-url ->
// published account record (already eligibility-checked, home-server fresh), keyed by lowercase url.
// Returns up to n posts sorted by favourites.
function selectTopPosts(statuses, authors, day, n = BOARD_SIZE) {
  const start = dateMs(day);
  const end = start + DAY_MS;
  const out = [];
  const seen = new Set();
  for (const s of statuses || []) {
    if (!s || typeof s !== 'object' || s.reblog) continue;
    const created = Date.parse(s.created_at);
    if (!(created >= start && created < end)) continue;
    if (s.visibility !== 'public' || s.sensitive !== false) continue;
    if (typeof s.spoiler_text !== 'string' || s.spoiler_text.trim() !== '') continue;
    const acc = s.account && typeof s.account.url === 'string' ? authors.get(s.account.url.toLowerCase()) : null;
    if (!acc) continue;
    const host = httpsHost(s.url);
    if (!host || host !== httpsHost(acc.url)) continue;
    if (String(s.account.username).toLowerCase() !== acc.acct.split('@')[0]) continue;
    if (httpsHost(s.uri) !== host) continue;
    if (seen.has(s.url) || !Number.isFinite(s.favourites_count)) continue;
    seen.add(s.url);
    out.push({
      url: s.url,
      author: acc.acct,
      text: htmlToText(s.content, s.emojis),
      created_at: new Date(created).toISOString(),
      favourites: s.favourites_count,
      reblogs: Number.isFinite(s.reblogs_count) ? s.reblogs_count : 0,
      replies: Number.isFinite(s.replies_count) ? s.replies_count : 0,
      embed: embedKind(s),
      language: typeof s.language === 'string' && LANG_RE.test(s.language) ? s.language : null,
    });
  }
  out.sort((a, b) => b.favourites - a.favourites || cmp(a.url, b.url));
  return out.slice(0, n);
}

// ---------- validation ----------

// Returns a list of problems (empty = valid). Checks shape, ordering, that every board and post author
// has an account record, and that every published account passes the guardrails visible in the data.
function validateSocial(s, opts = {}) {
  const hosts = opts.avatarHosts || AVATAR_HOSTS;
  const errors = [];
  const err = (m) => errors.push(m);
  if (!s || typeof s !== 'object') return ['payload is not an object'];
  if (s.schema !== 1) err('schema must be 1');
  if (!Number.isFinite(Date.parse(s.generated_at))) err('generated_at is not a date');
  if (!DATE_RE.test(s.day || '')) err('day is not YYYY-MM-DD');
  const cov = s.coverage || {};
  if (!isInt(cov.days_7d) || cov.days_7d < 0 || cov.days_7d > 7) err('coverage.days_7d must be 0..7');
  if (!DATE_RE.test(cov.first_day || '')) err('coverage.first_day is not YYYY-MM-DD');
  if (!isInt(cov.pool) || cov.pool < 0) err('coverage.pool must be a non-negative integer');
  if (!isInt(cov.servers_scanned) || cov.servers_scanned < 0) err('coverage.servers_scanned must be a non-negative integer');
  if (typeof cov.note !== 'string' || !cov.note) err('coverage.note must be a non-empty string');
  const g = s.guardrails || {};
  if (g.min_followers !== MIN_FOLLOWERS) err('guardrails.min_followers must be 10000');
  if (!Array.isArray(g.rules) || !g.rules.length || g.rules.some((r) => typeof r !== 'string' || !r)) err('guardrails.rules must be a list of strings');

  const accounts = s.accounts && typeof s.accounts === 'object' && !Array.isArray(s.accounts) ? s.accounts : null;
  if (!accounts) return [...errors, 'accounts missing'];
  const boards = s.boards && typeof s.boards === 'object' ? s.boards : null;
  if (!boards) return [...errors, 'boards missing'];
  const referenced = new Set();

  for (const key of BOARD_KEYS) {
    const rows = boards[key];
    if (!Array.isArray(rows)) { err(`boards.${key} must be an array`); continue; }
    if (rows.length > BOARD_SIZE) err(`boards.${key} has more than ${BOARD_SIZE} rows`);
    const seen = new Set();
    let prev = null;
    for (const r of rows) {
      if (!r || typeof r.acct !== 'string') { err(`boards.${key} row without acct`); continue; }
      if (seen.has(r.acct)) err(`boards.${key} lists ${r.acct} twice`);
      seen.add(r.acct);
      referenced.add(r.acct);
      if (!isInt(r.value)) { err(`boards.${key} ${r.acct} value is not an integer`); continue; }
      if (prev != null && (key.startsWith('losers_') ? r.value < prev : r.value > prev)) err(`boards.${key} is not sorted`);
      prev = r.value;
      if (key === 'followed' && r.value < MIN_FOLLOWERS) err(`boards.${key} ${r.acct} is under ${MIN_FOLLOWERS} followers`);
      if ((key.startsWith('gainers_') || key.startsWith('active_')) && r.value <= 0) err(`boards.${key} ${r.acct} is not a gain`);
      if (key.startsWith('losers_') && r.value >= 0) err(`boards.${key} ${r.acct} is not a loss`);
    }
  }
  for (const k of Object.keys(boards)) if (!BOARD_KEYS.includes(k)) err(`boards.${k} is not a known board`);

  const posts = Array.isArray(s.top_posts) ? s.top_posts : null;
  if (!posts) err('top_posts must be an array');
  else {
    if (posts.length > BOARD_SIZE) err(`top_posts has more than ${BOARD_SIZE} posts`);
    const dayStart = DATE_RE.test(s.day || '') ? dateMs(s.day) : NaN;
    const urls = new Set();
    let prev = null;
    for (const p of posts) {
      if (!p || typeof p !== 'object') { err('top_posts entry is not an object'); continue; }
      const host = httpsHost(p.url);
      if (!host) { err(`post ${String(p.url).slice(0, 80)} has a bad url`); continue; }
      if (urls.has(p.url)) err(`post ${p.url} is listed twice`);
      urls.add(p.url);
      referenced.add(p.author);
      const a = accounts[p.author];
      if (a && httpsHost(a.url) !== host) err(`post ${p.url} is not hosted on its author's server`);
      if (typeof p.text !== 'string' || Array.from(p.text).length > POST_CHARS) err(`post ${p.url} text is missing or over ${POST_CHARS} chars`);
      else if (CTRL_TEST.test(p.text)) err(`post ${p.url} text has control characters`);
      const created = Date.parse(p.created_at);
      if (!(created >= dayStart && created < dayStart + DAY_MS)) err(`post ${p.url} was not created on ${s.day}`);
      if (!isInt(p.favourites) || p.favourites < 0) err(`post ${p.url} favourites is not a count`);
      else { if (prev != null && p.favourites > prev) err('top_posts is not sorted by favourites'); prev = p.favourites; }
      for (const k of ['reblogs', 'replies']) if (!isInt(p[k]) || p[k] < 0) err(`post ${p.url} ${k} is not a count`);
      if (p.embed !== null && !EMBED_KINDS.includes(p.embed)) err(`post ${p.url} embed must be null or one of ${EMBED_KINDS.join(', ')}`);
      if (p.language !== null && !(typeof p.language === 'string' && LANG_RE.test(p.language))) err(`post ${p.url} language must be null or a language code`);
    }
  }

  for (const acct of referenced) if (!Object.prototype.hasOwnProperty.call(accounts, acct)) err(`${acct} is referenced but missing from accounts`);
  for (const [key, a] of Object.entries(accounts)) {
    if (!referenced.has(key)) err(`${key} is in accounts but not referenced`);
    if (!a || typeof a !== 'object') { err(`${key} account is not an object`); continue; }
    const m = ACCT_RE.exec(key);
    if (!m) err(`${key} is not a lowercase user@domain handle`);
    if (a.acct !== key) err(`${key} acct field does not match its key`);
    if (m && a.domain !== m[2]) err(`${key} domain does not match its handle`);
    const urlHost = httpsHost(a.url);
    if (!urlHost) err(`${key} url is not a plain https url`);
    else if (m && urlHost !== m[2]) err(`${key} url is not on the server named in its handle`);
    if (!(isInt(a.followers) && a.followers >= MIN_FOLLOWERS)) err(`${key} is under ${MIN_FOLLOWERS} followers`);
    for (const k of ['following', 'posts']) if (!isInt(a[k]) || a[k] < 0) err(`${key} ${k} is not a count`);
    if (typeof a.display_name !== 'string' || Array.from(a.display_name).length > NAME_CHARS) err(`${key} display_name is not a string of at most ${NAME_CHARS} chars`);
    if (a.avatar !== null && !avatarOk(a.avatar, hosts)) err(`${key} avatar is not null or an https url on an allowed host`);
    for (const k of ['last_posted', 'created_at']) if (a[k] !== null && !DATE_RE.test(a[k] || '')) err(`${key} ${k} is not a date or null`);
  }

  const history = Array.isArray(s.history) ? s.history : null;
  if (!history) err('history must be an array');
  else {
    if (history.length > HISTORY_DAYS) err(`history has more than ${HISTORY_DAYS} snapshots`);
    let prevDate = '';
    for (const h of history) {
      if (!h || !DATE_RE.test(h.date || '')) { err('history entry without a date'); continue; }
      if (h.date <= prevDate) err(`history is not ascending at ${h.date}`);
      prevDate = h.date;
      if (h.at !== undefined && !Number.isFinite(Date.parse(h.at))) err(`history ${h.date} at is not a date`);
      const maps = {};
      for (const k of ['followers', 'posts']) {
        const m = h[k];
        if (!m || typeof m !== 'object' || Array.isArray(m)) { err(`history ${h.date} ${k} is not an object`); continue; }
        maps[k] = m;
        for (const [acct, v] of Object.entries(m)) {
          if (!ACCT_RE.test(acct)) err(`history ${h.date} ${k} has a bad handle ${acct.slice(0, 80)}`);
          if (!isInt(v) || v < 0) err(`history ${h.date} ${k} ${acct} is not a count`);
          if (k === 'followers' && !(v >= MIN_FOLLOWERS)) err(`history ${h.date} lists ${acct} under ${MIN_FOLLOWERS} followers`);
        }
      }
      if (maps.followers && maps.posts) {
        for (const acct of Object.keys(maps.posts)) if (!(acct in maps.followers)) err(`history ${h.date} has posts for ${acct}, which is not an account with ${MIN_FOLLOWERS}+ followers in that snapshot`);
        for (const acct of Object.keys(maps.followers)) if (!(acct in maps.posts)) err(`history ${h.date} has followers but no posts for ${acct}`);
      }
    }

    // every published account is in the newest snapshot, and board values agree with account records
    // and with the baseline the history provides
    const last = history.length ? history[history.length - 1] : null;
    if (last && last.followers) for (const acct of Object.keys(accounts)) if (!(acct in last.followers)) err(`${acct} is published but not in the newest history snapshot`);
    for (const r of boards.followed || []) {
      const a = r && accounts[r.acct];
      if (a && r.value !== a.followers) err(`boards.followed ${r.acct} value ${r.value} does not equal its account followers ${a.followers}`);
    }
    const nowMs = Date.parse(s.generated_at);
    if (Number.isFinite(nowMs)) {
      for (const win of ['24h', '7d']) {
        const b = BASELINES[win];
        const base = pickBaseline(history.filter((h) => h && h.followers && h.posts && Number.isFinite(snapMs(h))), nowMs, b.target, b.min, b.max);
        for (const [key, field, mapKey] of [[`gainers_${win}`, 'followers', 'followers'], [`losers_${win}`, 'followers', 'followers'], [`active_${win}`, 'posts', 'posts']]) {
          const rows = Array.isArray(boards[key]) ? boards[key] : [];
          if (!base && rows.length) err(`boards.${key} has rows but history has no ${win} baseline`);
          if (!base) continue;
          for (const r of rows) {
            const a = r && accounts[r.acct];
            if (!a) continue;
            const before = base[mapKey][r.acct];
            if (!Number.isFinite(before)) err(`boards.${key} ${r.acct} has no value in the ${win} baseline snapshot`);
            else if (r.value !== a[field] - before) err(`boards.${key} ${r.acct} value ${r.value} does not equal ${a[field]} - ${before}`);
          }
        }
      }
    }
  }
  return errors;
}

// ---------- file format ----------

function renderScript(social) {
  const json = JSON.stringify(social).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
  return `// generated by scripts/collect-social.js — do not edit\nwindow.MASTODON_SOCIAL = ${json};\n`;
}

// Text of data/social.js -> the payload object (or null if it is not that file).
function parseScript(text) {
  const head = 'window.MASTODON_SOCIAL = ';
  const i = typeof text === 'string' ? text.indexOf(head) : -1;
  if (i < 0) return null;
  const end = text.lastIndexOf(';');
  if (end < i) return null;
  try {
    const v = JSON.parse(text.slice(i + head.length, end));
    return v && typeof v === 'object' ? v : null;
  } catch {
    return null;
  }
}

module.exports = {
  DAY_MS,
  HOUR_MS,
  MIN_FOLLOWERS,
  BOARD_SIZE,
  BOARD_KEYS,
  POST_CHARS,
  HISTORY_DAYS,
  EMBED_KINDS,
  AVATAR_HOSTS,
  BASELINES,
  ACCT_RE,
  reportDay,
  httpsHost,
  validHost,
  avatarOk,
  decodeEntities,
  truncate,
  htmlToText,
  plainName,
  isEligibleAccount,
  toAccount,
  topRows,
  moverBoards,
  activeBoard,
  followedBoard,
  pickBaseline,
  addSnapshot,
  purgeHistory,
  embedKind,
  originOf,
  selectTopPosts,
  validateSocial,
  renderScript,
  parseScript,
};
