/* Mastodon Network Pulse: LDR leaderboards, PST top posts, DEC decentralization.
 *
 * Self-contained: reads window.MASTODON_SERVERS (data/servers.js, Contract S) and window.MASTODON_SOCIAL
 * (data/social.js, Contract A), builds everything inside #social-ldr-root, #social-pst-root and
 * #social-dec-root, and never touches script.js. Both data files are optional and may be malformed: every
 * read is type-checked and nothing here throws to the page.
 *
 * The collectors enforce the guardrails (lib/social.js validateSocial). This file checks them again before
 * anything is drawn, so a bad commit cannot publish a name, link or image the rules forbid.
 */
(function (root) {
  'use strict';

  const doc = root.document;
  if (!doc || typeof doc.addEventListener !== 'function') return;

  const DAY_MS = 86400e3;
  const MIN_FOLLOWERS = 10000;
  const BOARD_SIZE = 25;
  const POSTS_SHOWN = 10;
  const POST_CHARS = 280;
  const NAME_CHARS = 64;
  const NOTE_CHARS = 400;
  const RULES_SHOWN = 8;
  const EMBED_KINDS = ['image', 'video', 'link'];
  const EMPTY = 'Collecting — first data after the next daily run.';
  const UNREADABLE = 'This data file could not be read.';

  // AVATAR_HOSTS: THIS LIST MUST STAY IDENTICAL TO AVATAR_HOSTS IN lib/social.js (same hosts, same order).
  // The collector decides which avatar URLs get written into data/social.js; this list decides which of
  // those the page will load. A host that is in lib but missing here silently becomes a blank placeholder.
  // An avatar loads only from an https URL (no credentials, no port) on a host listed here.
  // Whenever lib/social.js changes this list, copy it over verbatim and re-run the comparison:
  //   node -e "const l=require('./lib/social.js').AVATAR_HOSTS,m=eval(/const AVATAR_HOSTS = (\[[^\]]*\])/.exec(require('fs').readFileSync('social.js','utf8'))[1]);console.log(JSON.stringify(l)===JSON.stringify(m)?'identical':'DIFFERENT')"
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
    'zirkus-media.fra1.cdn.digitaloceanspaces.com'
  ];

  const HOST_RE = /^(?=.{3,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z](?:[a-z0-9-]{0,61}[a-z0-9])?$/i;
  const USER_RE = /^[a-z0-9_]+(?:[a-z0-9_.-]*[a-z0-9_])?$/i;
  const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  const MODES = [
    { id: 'servers', label: 'SERVERS' },
    { id: 'accounts', label: 'ACCOUNTS' }
  ];

  // head: metric column heading. sign: only rows with a positive/negative value belong on a gainers/losers/
  // most-active board (a "gainer" that did not gain is not listed). order: sort direction of the metric.
  const BOARDS = {
    servers: [
      { id: 'largest', label: 'LARGEST', windows: [], head: 'USERS', metric: 'users', order: 'desc' },
      { id: 'active', label: 'ACTIVE (MAU)', windows: [], head: 'MAU', metric: 'mau', order: 'desc' },
      { id: 'gainers', label: 'GAINERS', windows: ['24h', '7d'], head: 'NET USERS', metric: 'net', sign: 'pos', order: 'desc' },
      { id: 'losers', label: 'LOSERS', windows: ['24h', '7d'], head: 'NET USERS', metric: 'net', sign: 'neg', order: 'asc' }
    ],
    accounts: [
      { id: 'followed', label: 'MOST FOLLOWED', windows: [], head: 'FOLLOWERS', metric: 'followers', order: 'desc' },
      { id: 'gainers', label: 'GAINERS', windows: ['24h', '7d'], head: 'NET FOLLOWERS', metric: 'net', sign: 'pos', order: 'desc' },
      { id: 'losers', label: 'LOSERS', windows: ['24h', '7d'], head: 'NET FOLLOWERS', metric: 'net', sign: 'neg', order: 'asc' },
      { id: 'active', label: 'MOST ACTIVE', windows: ['24h', '7d'], head: 'NET POSTS', metric: 'net', sign: 'pos', order: 'desc' }
    ]
  };
  const WINDOW_LABELS = { '24h': '24 hours', '7d': '7 days' };

  // ---------------------------------------------------------------------------
  // Small helpers
  // ---------------------------------------------------------------------------

  const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
  const hasOwn = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
  const num = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : null);

  function esc(value) {
    return String(value).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  // Dropped from every displayed string: C0/C1 controls (tab and newline stay), bidi overrides and isolates,
  // and invisible filler characters that draw nothing but are not whitespace (Hangul and Braille fillers,
  // soft hyphen, word joiner and friends). U+200C and U+200D are kept: emoji sequences and several
  // scripts need them. Length is capped.
  const HIDDEN_RE = /[\u0000-\u0008\u000b-\u001f\u007f-\u009f­͏؜ᅟᅠ឴឵᠎​‎‏‪-‮⁠-⁤⁦-⁩⠀ㅤ﻿ﾠ]/g;

  function cleanText(value, max, keepNewlines) {
    if (typeof value !== 'string') return '';
    let t = value.replace(HIDDEN_RE, '');
    t = keepNewlines ? t.replace(/\n{3,}/g, '\n\n') : t.replace(/\s+/g, ' ');
    t = t.trim();
    const chars = Array.from(t);
    return chars.length > max ? `${chars.slice(0, max - 1).join('').trimEnd()}…` : t;
  }

  // Custom-emoji shortcodes (":blobcat:") cannot be drawn here, so a whole-token shortcode is removed:
  // word characters between colons, with whitespace or the string end on both sides. "Time 10:30:" and
  // "1:10:100" are not tokens and stay. A name with nothing visible left falls back to the username.
  function cleanName(value, fallback) {
    let t = cleanText(value, NAME_CHARS * 2);
    t = t.replace(/(^|\s)(?::[A-Za-z0-9_]{2,}:)+(?=\s|$)/g, '$1').replace(/\s+/g, ' ').trim();
    t = cleanText(t, NAME_CHARS);
    return /[^\s‌‍︀-️]/.test(t) ? t : fallback;
  }

  // formatInteger, formatCompact and formatSigned are copies of lib/format.js (round first, then pick the
  // unit: 999966 is '1.00M', never '1000.0K'; a value that rounds to 0 is never '-0'). Keep them identical.
  const isNum = (n) => typeof n === 'number' && Number.isFinite(n);

  function formatInteger(n) {
    return isNum(n) ? (Math.round(n) + 0).toLocaleString('en-US') : '—';
  }

  function formatCompact(n) {
    if (!isNum(n)) return '—';
    const a = Math.abs(n);
    let body;
    if (Math.round(a) < 1e3) body = Math.round(a).toLocaleString('en-US');
    else if (Number((a / 1e3).toFixed(1)) < 1e3) body = `${(a / 1e3).toFixed(1)}K`;
    else if (Number((a / 1e6).toFixed(2)) < 1e3) body = `${(a / 1e6).toFixed(2)}M`;
    else body = `${(a / 1e9).toFixed(3)}B`;
    return (n < 0 && body !== '0' ? '-' : '') + body;
  }

  function formatSigned(n, compact = true) {
    if (!isNum(n)) return '—';
    const body = compact ? formatCompact(Math.abs(n)) : formatInteger(Math.abs(n));
    return (n < 0 && body !== '0' ? '-' : '+') + body;
  }

  const formatPct = (x, digits) => (isNum(x) ? `${x.toFixed(digits)}%` : '—');
  const formatShare = (x) => formatPct(x * 100, x > 0 && x < 0.01 ? 2 : 1);

  function formatDay(iso) {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(typeof iso === 'string' ? iso : '');
    return m && MONTHS[Number(m[2]) - 1] ? `${MONTHS[Number(m[2]) - 1]} ${Number(m[3])}, ${m[1]}` : '—';
  }

  function formatUtcStamp(iso) {
    const t = typeof iso === 'string' ? Date.parse(iso) : NaN;
    return Number.isFinite(t) ? `${new Date(t).toISOString().slice(0, 16).replace('T', ' ')} UTC` : '—';
  }

  function parseTime(v) {
    const t = typeof v === 'string' ? Date.parse(v) : NaN;
    return Number.isFinite(t) ? t : null;
  }

  function relativeTime(iso, nowMs) {
    const t = parseTime(iso);
    if (t === null) return '—';
    const sec = Math.round((nowMs - t) / 1000);
    if (sec < -300) return '—';
    if (sec < 60) return 'just now';
    const min = Math.floor(sec / 60);
    if (min < 60) return `${min}m ago`;
    const hours = Math.floor(min / 60);
    if (hours < 24) return `${hours}h ago`;
    return relativeDays(Math.floor(hours / 24));
  }

  function relativeDays(days) {
    if (days < 1) return 'today';
    if (days < 30) return `${days}d ago`;
    if (days < 365) return `${Math.floor(days / 30)}mo ago`;
    return `${Math.floor(days / 365)}y ago`;
  }

  // 'YYYY-MM-DD' (a UTC day) -> days before today's UTC day.
  function daysSince(iso, nowMs) {
    const t = parseTime(iso);
    if (t === null) return null;
    const days = Math.floor(nowMs / DAY_MS) - Math.floor(t / DAY_MS);
    return days < 0 ? null : days;
  }

  function accountAge(iso, nowMs) {
    const t = parseTime(iso);
    if (t === null || t > nowMs) return '—';
    const days = Math.floor((nowMs - t) / DAY_MS);
    if (days < 30) return `${days}d`;
    if (days < 365) return `${Math.floor(days / 30)}mo`;
    const years = Math.floor(days / 365);
    const months = Math.min(11, Math.floor((days - years * 365) / 30));
    return months ? `${years}y ${months}mo` : `${years}y`;
  }

  // ---------------------------------------------------------------------------
  // URLs and identities
  // ---------------------------------------------------------------------------

  function cleanDomain(value) {
    if (typeof value !== 'string') return null;
    const d = value.trim().toLowerCase();
    return HOST_RE.test(d) ? d : null;
  }

  // 'user@domain' -> { user, domain, key }; null when either half is not a plain username / hostname.
  function parseAcct(value) {
    if (typeof value !== 'string' || value.length > 320) return null;
    const at = value.indexOf('@');
    if (at < 1 || at !== value.lastIndexOf('@')) return null;
    const user = value.slice(0, at);
    const domain = cleanDomain(value.slice(at + 1));
    if (!domain || user.length > 64 || !USER_RE.test(user)) return null;
    return { user, domain, key: `${user.toLowerCase()}@${domain}` };
  }

  function httpsUrl(value) {
    if (typeof value !== 'string' || value.length > 2048) return null;
    try {
      const u = new URL(value);
      return u.protocol === 'https:' && !u.username && !u.password && !u.port && HOST_RE.test(u.hostname) ? u : null;
    } catch (e) {
      return null;
    }
  }

  function safeAvatarUrl(value) {
    const u = httpsUrl(value);
    return u && AVATAR_HOSTS.indexOf(u.hostname) !== -1 ? u.href : null;
  }

  // The profile link is always rebuilt in the canonical https://host/@user form, so query strings and odd
  // paths from the data never reach an href. The host comes from the account's own url when it is a
  // well-formed profile url (web domain can differ from the acct domain), else from the acct domain.
  function profileUrl(parsed, rawUrl) {
    const u = httpsUrl(rawUrl);
    const path = u ? u.pathname.replace(/\/$/, '') : '';
    if (u && path.toLowerCase() === `/@${parsed.user.toLowerCase()}`) {
      // Keep the casing the server uses in its own url (usernames are case-insensitive).
      return `https://${u.hostname}/@${encodeURIComponent(path.slice(2))}`;
    }
    return `https://${parsed.domain}/@${encodeURIComponent(parsed.user)}`;
  }

  // A post link must be a Mastodon status url of the same author, on the same host as the author's
  // profile link, so the account and the post it points at can never disagree.
  function postUrl(rawUrl, parsed, profile) {
    const u = httpsUrl(rawUrl);
    if (!u) return null;
    const m = /^\/@([^/]+)\/(\d{1,30})$/.exec(u.pathname);
    if (!m) return null;
    let user;
    try {
      user = decodeURIComponent(m[1]);
    } catch (e) {
      return null;
    }
    if (user.toLowerCase() !== parsed.user.toLowerCase()) return null;
    if (`https://${u.hostname}` !== profile.slice(0, profile.indexOf('/@'))) return null;
    return `${profile}/${m[2]}`;
  }

  // ---------------------------------------------------------------------------
  // Data normalisation and guardrails
  // ---------------------------------------------------------------------------

  function normalizeFile(raw) {
    if (!isObj(raw) || raw.schema !== 1 || typeof raw.day !== 'string' || !DATE_RE.test(raw.day)) return null;
    return Number.isFinite(Date.parse(`${raw.day}T00:00:00Z`)) ? raw : null;
  }

  function minFollowers(guardrails) {
    const m = isObj(guardrails) ? num(guardrails.min_followers) : null;
    return Math.max(MIN_FOLLOWERS, m || 0);
  }

  // The collector only writes accounts that passed every rule; the optional flag fields below are checked
  // again whenever the file carries them. Returns { parsed, profile } or null.
  function eligibleAccount(key, acc, guardrails) {
    if (!isObj(acc) || typeof key !== 'string') return null;
    const parsed = parseAcct(key);
    if (!parsed || parsed.key !== key.toLowerCase()) return null;
    if (typeof acc.acct === 'string' && acc.acct.toLowerCase() !== parsed.key) return null;
    if (typeof acc.domain === 'string' && acc.domain.toLowerCase() !== parsed.domain) return null;
    const followers = num(acc.followers);
    if (followers === null || followers < minFollowers(guardrails)) return null;
    if (acc.bot === true || acc.locked === true || acc.group === true || acc.noindex === true) return null;
    if (acc.suspended === true || acc.limited === true || acc.memorial === true || acc.indexable === false) return null;
    if (hasOwn(acc, 'discoverable') && acc.discoverable !== true) return null;
    if (acc.moved !== undefined && acc.moved !== null && acc.moved !== false) return null;
    return { parsed, profile: profileUrl(parsed, acc.url) };
  }

  function sortRows(rows, order) {
    const dir = order === 'asc' ? 1 : -1;
    return rows.sort((a, b) => (a.value - b.value) * dir || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  }

  function keepSign(value, sign) {
    if (sign === 'pos') return value > 0;
    if (sign === 'neg') return value < 0;
    return value >= 0;
  }

  function boardList(data, key) {
    return data && isObj(data.boards) && Array.isArray(data.boards[key]) ? data.boards[key] : [];
  }

  function boardKey(def, win) {
    return def.windows.length ? `${def.id}_${win}` : def.id;
  }

  function serverIndex(data) {
    const map = new Map();
    const list = data && Array.isArray(data.servers) ? data.servers : [];
    for (const s of list) {
      if (!isObj(s)) continue;
      const domain = cleanDomain(s.domain);
      if (!domain || map.has(domain)) continue;
      const version = typeof s.version === 'string' && /^[0-9A-Za-z][0-9A-Za-z.+_~-]{0,39}$/.test(s.version.trim()) ? s.version.trim() : null;
      map.set(domain, {
        domain, users: num(s.users), mau: num(s.mau), statuses: num(s.statuses),
        open: typeof s.open === 'boolean' ? s.open : null, version
      });
    }
    return map;
  }

  function serverRows(data, def, win) {
    const index = serverIndex(data);
    const seen = new Set();
    const rows = [];
    for (const r of boardList(data, boardKey(def, win))) {
      if (!isObj(r)) continue;
      const domain = cleanDomain(r.domain);
      const value = num(r.value);
      if (!domain || value === null || seen.has(domain) || !keepSign(value, def.sign)) continue;
      seen.add(domain);
      rows.push({ id: domain, value, info: index.get(domain) || { domain, users: null, mau: null, statuses: null, open: null, version: null } });
    }
    return sortRows(rows, def.order).slice(0, BOARD_SIZE);
  }

  function accountRows(data, def, win) {
    const accounts = isObj(data.accounts) ? data.accounts : {};
    const seen = new Set();
    const rows = [];
    for (const r of boardList(data, boardKey(def, win))) {
      if (!isObj(r) || typeof r.acct !== 'string') continue;
      const key = r.acct.toLowerCase();
      const value = num(r.value);
      if (value === null || seen.has(key) || !hasOwn(accounts, key) || !keepSign(value, def.sign)) continue;
      const ok = eligibleAccount(key, accounts[key], data.guardrails);
      if (!ok) continue;
      seen.add(key);
      rows.push({ id: key, value, account: accounts[key], parsed: ok.parsed, profile: ok.profile });
    }
    return sortRows(rows, def.order).slice(0, BOARD_SIZE);
  }

  function topPosts(data) {
    const list = Array.isArray(data.top_posts) ? data.top_posts : [];
    const accounts = isObj(data.accounts) ? data.accounts : {};
    const dayStart = Date.parse(`${data.day}T00:00:00Z`);
    const seen = new Set();
    const out = [];
    for (const p of list) {
      if (!isObj(p) || typeof p.author !== 'string') continue;
      const key = p.author.toLowerCase();
      if (!hasOwn(accounts, key)) continue;
      const ok = eligibleAccount(key, accounts[key], data.guardrails);
      if (!ok) continue;
      // Only public, non-sensitive posts without a content warning; the collector filters these before
      // writing, so the fields are usually absent and then nothing is dropped here.
      if (p.visibility !== undefined && p.visibility !== 'public') continue;
      if (p.sensitive === true) continue;
      if (typeof p.spoiler_text === 'string' && p.spoiler_text.trim() !== '') continue;
      const created = parseTime(p.created_at);
      if (created === null || !(created >= dayStart && created < dayStart + DAY_MS)) continue;
      const url = postUrl(p.url, ok.parsed, ok.profile);
      const favourites = num(p.favourites);
      if (!url || favourites === null || favourites < 0 || seen.has(url)) continue;
      seen.add(url);
      out.push({
        url, favourites, created_at: p.created_at,
        text: cleanText(p.text, POST_CHARS, true),
        reblogs: num(p.reblogs), replies: num(p.replies),
        embed: EMBED_KINDS.indexOf(p.embed) !== -1 ? p.embed : null,
        key, account: accounts[key], parsed: ok.parsed, profile: ok.profile
      });
    }
    out.sort((a, b) => b.favourites - a.favourites || (a.url < b.url ? -1 : 1));
    return out.slice(0, POSTS_SHOWN);
  }

  // Shares are fractions of totals.users. A meter whose parts do not nest (top1 <= top5 <= top10 <= 1) is
  // inconsistent, so it is not drawn at all rather than drawn wrong.
  function decentralizationModel(data) {
    const d = data && data.decentralization;
    if (!isObj(d)) return null;
    const share = (v) => {
      const n = num(v);
      return n !== null && n >= 0 && n <= 1 ? n : null;
    };
    const top1 = share(d.top1);
    const top5 = share(d.top5);
    const top10 = share(d.top10);
    if (top1 === null || top5 === null || top10 === null || top1 > top5 || top5 > top10) return null;
    const totals = isObj(data.totals) ? data.totals : {};
    const users = num(totals.users);
    const half = num(d.servers_for_half);
    const listed = num(d.listed);
    // Exact user counts come from the listed servers when they are there; otherwise they are derived from
    // the shares (which are rounded), so the derived figures can be off by a few hundred.
    const counts = [top1, top5 - top1, top10 - top5, 1 - top10].map((f) => (users !== null && users > 0 ? Math.round(f * users) : null));
    const sizes = Array.from(serverIndex(data).values()).map((v) => v.users).filter((v) => v !== null).sort((a, b) => b - a);
    if (users !== null && users > 0 && sizes.length >= 10) {
      const sum = (n) => sizes.slice(0, n).reduce((a, b) => a + b, 0);
      if (sum(10) <= users) {
        counts[0] = sizes[0];
        counts[1] = sum(5) - sum(1);
        counts[2] = sum(10) - sum(5);
        counts[3] = users - sum(10);
      }
    }
    return {
      day: data.day, generatedAt: data.generated_at,
      top1, top5, top10, rest: 1 - top10, counts,
      domain: cleanDomain(d.top1_domain),
      half: half !== null && half >= 1 ? Math.round(half) : null,
      listed: listed !== null && listed >= 1 ? Math.round(listed) : null,
      users: users !== null && users > 0 ? users : null,
      servers: num(totals.servers)
    };
  }

  // ---------------------------------------------------------------------------
  // HTML builders (raw strings in, escaped markup out)
  // ---------------------------------------------------------------------------

  function avatarHTML(url) {
    const safe = safeAvatarUrl(url);
    return safe
      ? `<img class="soc-avatar" src="${esc(safe)}" width="24" height="24" loading="lazy" decoding="async" referrerpolicy="no-referrer" alt="">`
      : '<span class="soc-avatar soc-avatar-blank" aria-hidden="true"></span>';
  }

  function toneOf(value, signed) {
    return signed ? (value < 0 ? 'down' : value > 0 ? 'up' : '') : '';
  }

  const SERVER_COLS = [
    { cls: 'soc-col-rank', head: '#', title: '' },
    { cls: 'soc-col-name', head: 'Server', title: '' },
    { cls: 'soc-col-metric', head: null, title: '' },
    { cls: 'soc-col-opt', head: 'Users', title: 'Registered users on the server, as counted by FediDB', hide: (d) => d.metric === 'users' },
    { cls: 'soc-col-opt', head: 'MAU', title: 'Monthly active users reported by the server (last 30 days)', hide: (d) => d.metric === 'mau' },
    { cls: 'soc-col-opt', head: 'Posts', title: 'Total posts on the server' },
    { cls: 'soc-col-opt soc-col-xl', head: 'Sign-up', title: 'Whether anyone can register without approval' },
    { cls: 'soc-col-opt soc-col-xl', head: 'Version', title: 'Mastodon version the server runs' }
  ];

  const ACCOUNT_COLS = [
    { cls: 'soc-col-rank', head: '#', title: '' },
    { cls: 'soc-col-name', head: 'Account', title: '' },
    { cls: 'soc-col-metric', head: null, title: '' },
    { cls: 'soc-col-opt', head: 'Followers', title: 'Followers as reported by the account’s own server', hide: (d) => d.metric === 'followers' },
    { cls: 'soc-col-opt', head: 'Posts', title: 'Total posts, including replies and boosts' },
    { cls: 'soc-col-opt', head: 'Last post', title: 'UTC day of the account’s latest post' },
    { cls: 'soc-col-opt soc-col-xl', head: 'Age', title: 'Time since the account was created' },
    { cls: 'soc-col-opt soc-col-xl', head: 'Server', title: 'The server the account lives on' }
  ];

  function buildHeadHTML(cols, def, metricHead) {
    return `<tr>${cols.map((c) => {
      if (c.hide && c.hide(def)) return '';
      const label = c.head === null ? metricHead : c.head;
      return `<th scope="col" class="${c.cls}"${c.title ? ` title="${esc(c.title)}"` : ''}>${esc(label)}</th>`;
    }).join('')}</tr>`;
  }

  function metricCell(def, value) {
    const signed = def.metric === 'net';
    const text = signed ? formatSigned(value, false) : formatInteger(value);
    return `<td class="soc-col-metric ${toneOf(value, signed)}"><span class="soc-metric-main">${esc(text)}</span></td>`;
  }

  function buildServerRowsHTML(rows, def) {
    return rows.map((r, i) => {
      const s = r.info;
      const reg = s.open === true ? '<span class="soc-tag soc-tag-open" title="Anyone can register without approval">OPEN</span>'
        : s.open === false ? '<span class="soc-tag" title="Registration is closed or needs approval">CLOSED</span>'
          : '—';
      // The small line under the name is the phone layout's stand-in for the hidden columns.
      const size = def.metric === 'users'
        ? (s.mau !== null ? `${formatCompact(s.mau)} MAU` : '')
        : (s.users !== null ? `${formatCompact(s.users)} users` : '');
      const meta = [size, s.open === true ? 'open' : s.open === false ? 'closed' : '', s.version ? `v${s.version}` : '']
        .filter(Boolean).join(' · ');
      return '<tr>'
        + `<td class="soc-col-rank">${i + 1}</td>`
        + `<td class="soc-col-name"><a class="soc-acct" href="${esc(`https://${r.id}`)}" target="_blank" rel="noopener">`
        + `<span class="soc-acct-text"><span class="soc-acct-name">${esc(r.id)}</span>${meta ? `<span class="soc-acct-meta">${esc(meta)}</span>` : ''}</span></a></td>`
        + metricCell(def, r.value)
        + (def.metric === 'users' ? '' : `<td class="soc-col-opt">${esc(formatInteger(s.users))}</td>`)
        + (def.metric === 'mau' ? '' : `<td class="soc-col-opt">${esc(formatInteger(s.mau))}</td>`)
        + `<td class="soc-col-opt">${esc(formatInteger(s.statuses))}</td>`
        + `<td class="soc-col-opt soc-col-xl">${reg}</td>`
        + `<td class="soc-col-opt soc-col-xl">${esc(s.version ? s.version : '—')}</td>`
        + '</tr>';
    }).join('\n');
  }

  function accountMeta(a, nowMs) {
    const created = typeof a.created_at === 'string' && parseTime(a.created_at) !== null ? a.created_at : null;
    const last = typeof a.last_posted === 'string' && daysSince(a.last_posted, nowMs) !== null ? a.last_posted : null;
    return {
      last: last ? relativeDays(daysSince(last, nowMs)) : '—',
      lastTitle: last ? formatDay(last) : 'No post found',
      age: created ? accountAge(created, nowMs) : '—',
      ageTitle: created ? `Created ${formatDay(created)}` : ''
    };
  }

  function buildAccountRowsHTML(rows, def, nowMs) {
    return rows.map((r, i) => {
      const a = r.account;
      const m = accountMeta(a, nowMs);
      const name = cleanName(a.display_name, r.parsed.user);
      const followers = num(a.followers);
      // The small line under the name is the phone layout's stand-in for the hidden columns; it never
      // repeats the board's own metric, which stays visible.
      const meta = def.metric === 'followers'
        ? `${formatInteger(num(a.posts))} posts${m.last === '—' ? '' : ` · ${m.last}`}`
        : `${formatInteger(followers)} followers`;
      return '<tr>'
        + `<td class="soc-col-rank">${i + 1}</td>`
        + `<td class="soc-col-name"><a class="soc-acct" href="${esc(r.profile)}" target="_blank" rel="noopener">${avatarHTML(a.avatar)}`
        + `<span class="soc-acct-text"><span class="soc-acct-name">${esc(name)}</span><span class="soc-acct-handle">@${esc(r.parsed.key)}</span>`
        + `<span class="soc-acct-meta">${esc(meta)}</span></span></a></td>`
        + metricCell(def, r.value)
        + (def.metric === 'followers' ? '' : `<td class="soc-col-opt">${esc(formatInteger(followers))}</td>`)
        + `<td class="soc-col-opt">${esc(formatInteger(num(a.posts)))}</td>`
        + `<td class="soc-col-opt" title="${esc(m.lastTitle)}">${esc(m.last)}</td>`
        + `<td class="soc-col-opt soc-col-xl" title="${esc(m.ageTitle)}">${esc(m.age)}</td>`
        + `<td class="soc-col-opt soc-col-xl"><span class="soc-host" title="${esc(r.parsed.domain)}">${esc(r.parsed.domain)}</span></td>`
        + '</tr>';
    }).join('\n');
  }

  function buildPostCardsHTML(posts, nowMs) {
    const count = (v) => (v === null ? '—' : formatCompact(v));
    return posts.map((p, i) => {
      const name = cleanName(p.account.display_name, p.parsed.user);
      const when = relativeTime(p.created_at, nowMs);
      return '<li class="soc-post-card">'
        + '<div class="soc-post-head">'
        + `<span class="soc-post-rank">${String(i + 1).padStart(2, '0')}</span>`
        + `<a class="soc-acct" href="${esc(p.profile)}" target="_blank" rel="noopener">${avatarHTML(p.account.avatar)}`
        + `<span class="soc-acct-text"><span class="soc-acct-name">${esc(name)}</span><span class="soc-acct-handle">@${esc(p.parsed.key)}</span></span></a>`
        + `<a class="soc-post-time" href="${esc(p.url)}" target="_blank" rel="noopener" title="${esc(formatUtcStamp(p.created_at))}">${esc(when)}</a>`
        + '</div>'
        + (p.text
          ? `<p class="soc-post-text">${esc(p.text)}</p>`
          : `<p class="soc-post-text soc-post-text-empty">${esc(`[${p.embed || 'no text'}]`)}</p>`)
        + '<div class="soc-post-stats">'
        + `<span class="soc-stat-main"><b>${esc(formatCompact(p.favourites))}</b> favourites</span>`
        + `<span><b>${esc(count(p.reblogs))}</b> boosts</span>`
        + `<span><b>${esc(count(p.replies))}</b> replies</span>`
        + `<a class="soc-post-open" href="${esc(p.url)}" target="_blank" rel="noopener">OPEN <span aria-hidden="true">↗</span></a>`
        + '</div></li>';
    }).join('\n');
  }

  function buildDecentralizationHTML(m) {
    const seg = (cls, frac) => (frac > 0 ? `<span class="soc-seg ${cls}" style="width:${(frac * 100).toFixed(4)}%"></span>` : '');
    const parts = [
      { cls: 'soc-seg-1', name: m.domain ? `Largest server <span class="soc-dec-note">${esc(m.domain)}</span>` : 'Largest server', frac: m.top1, count: m.counts[0] },
      { cls: 'soc-seg-5', name: 'Next 4 largest <span class="soc-dec-note">ranks 2 to 5</span>', frac: m.top5 - m.top1, count: m.counts[1] },
      { cls: 'soc-seg-10', name: 'Next 5 largest <span class="soc-dec-note">ranks 6 to 10</span>', frac: m.top10 - m.top5, count: m.counts[2] },
      { cls: 'soc-seg-rest', name: 'All other servers', frac: m.rest, count: m.counts[3] }
    ];
    const item = (p) => `<li><span class="soc-swatch ${p.cls}" aria-hidden="true"></span><span class="soc-dec-name">${p.name}</span>`
      + `<span class="soc-dec-num">${p.count !== null ? esc(formatInteger(p.count)) : ''}</span>`
      + `<span class="soc-dec-pct">${esc(formatShare(p.frac))}</span></li>`;
    const label = `Share of Mastodon users by server size: largest server ${formatShare(m.top1)}, next four ${formatShare(m.top5 - m.top1)}, `
      + `next five ${formatShare(m.top10 - m.top5)}, all other servers ${formatShare(m.rest)}`;
    const halfText = m.half !== null
      ? `${formatInteger(m.half)} ${m.half === 1 ? 'server holds' : 'servers hold'} half of all users`
      : m.listed !== null
        ? `More than ${formatInteger(m.listed)} servers are needed to reach half of all users`
        : 'Half of all users are spread over more servers than are listed';
    const foot = [
      m.users !== null ? `${formatInteger(m.users)} users${m.servers !== null ? ` on ${formatInteger(m.servers)} servers` : ''} counted by FediDB on ${formatDay(m.day)}` : `Counted by FediDB on ${formatDay(m.day)}`,
      m.listed !== null ? `the ${formatInteger(m.listed)} largest servers are listed individually` : ''
    ].filter(Boolean).join(' · ');
    return '<div class="soc-dec-hero">'
      + `<span class="soc-dec-big">${esc(formatShare(m.top1))}</span>`
      + `<span class="soc-dec-big-label">of users are on ${m.domain ? esc(m.domain) : 'the largest server'}</span>`
      + `<span class="soc-dec-sub">${esc(halfText)}</span>`
      + '</div>'
      + '<div class="soc-dec-detail">'
      + `<div class="soc-dec-bar" role="img" aria-label="${esc(label)}">${parts.map((p) => seg(p.cls, p.frac)).join('')}</div>`
      + `<ul class="soc-dec-legend">${parts.map(item).join('')}</ul>`
      + `<p class="soc-dec-foot">${esc(foot)} · Base: FediDB, Mastodon servers</p>`
      + '</div>';
  }

  // ---------------------------------------------------------------------------
  // Panels
  // ---------------------------------------------------------------------------

  const state = { mode: null, board: { servers: 'largest', accounts: 'followed' }, win: '24h' };
  const mounted = { ldr: null, pst: null, dec: null };
  let seenServers;
  let seenSocial;

  const byId = (id) => doc.getElementById(id);

  // A data file that fails to parse leaves its global undefined, exactly like a 404. The two are told
  // apart by loading the file once more through a script element of our own: a missing file fires
  // `error`, a file that arrives but defines nothing fires `load` with the global still undefined.
  const DATA_FILES = {
    servers: { global: 'MASTODON_SERVERS', src: /(?:^|\/)data\/servers\.js(?:[?#]|$)/ },
    social: { global: 'MASTODON_SOCIAL', src: /(?:^|\/)data\/social\.js(?:[?#]|$)/ }
  };
  const probed = { servers: null, social: null };

  function probeMissingFiles() {
    Object.keys(DATA_FILES).forEach((name) => {
      const f = DATA_FILES[name];
      if (root[f.global] !== undefined || probed[name] !== null) return;
      probed[name] = 'pending';
      const tag = Array.prototype.find.call(doc.getElementsByTagName('script'), (el) => f.src.test(el.getAttribute('src') || ''));
      if (!tag) {
        probed[name] = 'absent';
        return;
      }
      const p = doc.createElement('script');
      const done = (state) => {
        probed[name] = state;
        if (p.parentNode) p.parentNode.removeChild(p);
        renderAll();
      };
      p.async = true;
      p.onload = () => done(root[f.global] === undefined ? 'corrupt' : 'ok');
      p.onerror = () => done('absent');
      p.src = tag.src;
      (doc.head || doc.documentElement).appendChild(p);
    });
  }

  // True when the file is there but unusable: defined with a bad shape, or loaded without defining anything.
  function unreadable(name, raw, normalized) {
    if (raw === undefined) return probed[name] === 'corrupt';
    return !normalized;
  }

  // Newest follower-snapshot date: the newest history entry, else the build date. `day` is the top-posts day
  // and is not the date of the follower counts.
  function snapshotDate(social) {
    let best = null;
    (Array.isArray(social.history) ? social.history : []).forEach((h) => {
      if (isObj(h) && typeof h.date === 'string' && DATE_RE.test(h.date) && (best === null || h.date > best)) best = h.date;
    });
    if (best) return best;
    const t = parseTime(social.generated_at);
    return t === null ? null : new Date(t).toISOString().slice(0, 10);
  }

  function setText(el, text) {
    if (el) el.textContent = text;
  }

  function setList(ul, lines) {
    if (!ul) return;
    ul.textContent = '';
    lines.forEach((line) => {
      if (!line) return;
      const li = doc.createElement('li');
      li.textContent = line;
      ul.appendChild(li);
    });
    ul.hidden = !ul.children.length;
  }

  function panelBar(code, id, title, sub, tagId) {
    return '<div class="panel-bar"><div class="panel-title">'
      + `<span class="fn-key" aria-hidden="true"><span class="fn-code">${code}</span><span class="fn-go">GO</span></span>`
      + `<h2 id="${id}">${title} <span class="h-sub">${sub}</span></h2></div>`
      + `<div class="panel-tools"><span class="scale-tag" id="${tagId}">NO DATA</span></div></div>`;
  }

  function mountLdr() {
    const el = byId('social-ldr-root');
    if (!el) return;
    el.classList.add('soc-root');
    el.innerHTML = panelBar('LDR', 'soc-ldr-heading', 'Leaderboards', 'servers and accounts', 'soc-ldr-asof')
      + '<div class="soc-controls">'
      + '<div class="soc-pill" role="group" aria-label="Leaderboard type" id="soc-ldr-mode"></div>'
      + '<div class="soc-pill" role="group" aria-label="Leaderboard" id="soc-ldr-board"></div>'
      + '<div class="soc-pill" role="group" aria-label="Window" id="soc-ldr-win" hidden></div>'
      + '</div>'
      + '<p class="visually-hidden" id="soc-ldr-live" role="status" aria-live="polite"></p>'
      + `<p class="soc-empty" id="soc-ldr-empty">${esc(EMPTY)}</p>`
      + '<div class="soc-table-wrap" id="soc-ldr-wrap" tabindex="0" role="region" aria-label="Leaderboard table" hidden>'
      + '<table class="soc-table"><caption class="visually-hidden" id="soc-ldr-caption"></caption>'
      + '<thead id="soc-ldr-head"></thead><tbody id="soc-ldr-body"></tbody></table></div>'
      + '<ul class="soc-notes" id="soc-ldr-notes" hidden></ul>'
      + '<p class="chart-foot soc-guard" id="soc-ldr-guard"></p>';
    mounted.ldr = el;
    el.addEventListener('click', (e) => {
      const b = e.target && e.target.closest ? e.target.closest('button[data-soc]') : null;
      if (!b || !el.contains(b)) return;
      const kind = b.getAttribute('data-soc');
      const val = b.getAttribute('data-val');
      if (kind === 'mode' && MODES.some((m) => m.id === val)) state.mode = val;
      else if (kind === 'board' && BOARDS[state.mode].some((d) => d.id === val)) state.board[state.mode] = val;
      else if (kind === 'win' && WINDOW_LABELS[val]) state.win = val;
      else return;
      safely(renderLdr, 'ldr');
    });
    el.addEventListener('error', (e) => {
      if (e.target && e.target.tagName === 'IMG') e.target.classList.add('soc-avatar-broken');
    }, true);
  }

  // A pill is rebuilt only when its set of buttons changes; otherwise aria-pressed is flipped in place so
  // the button a keyboard user just activated keeps focus.
  function syncPill(el, items, current, kind) {
    const sig = items.map((it) => it.id).join('|');
    if (el.getAttribute('data-sig') !== sig) {
      el.setAttribute('data-sig', sig);
      el.innerHTML = items.map((it) => `<button type="button" class="soc-btn" data-soc="${kind}" data-val="${esc(it.id)}" aria-pressed="false"`
        + `${it.title ? ` title="${esc(it.title)}"` : ''}>${esc(it.label)}</button>`).join('');
    }
    Array.prototype.forEach.call(el.children, (b) => b.setAttribute('aria-pressed', String(b.getAttribute('data-val') === current)));
  }

  function boardCaveats(mode, def, win, servers, social) {
    const w = WINDOW_LABELS[win] || '';
    const out = [];
    if (mode === 'servers') {
      if (def.id === 'largest') out.push('Registered users per server as counted by FediDB, Mastodon software only. This is a different base from the joinmastodon total in the page header, so the two do not add up.');
      else if (def.id === 'active') out.push('Monthly active users (MAU) each server reports: people active in the last 30 days, not daily.');
      else out.push(`Net change in registered users over ${w}, from our daily FediDB snapshots of the 100 largest servers. Net, not gross: purged or deleted accounts are subtracted, so a server can lose users after a clean-up. Needs a snapshot that far back.`);
      const cov = servers && isObj(servers.coverage) ? servers.coverage : null;
      const d7 = cov ? num(cov.days_7d) : null;
      if ((def.id === 'gainers' || def.id === 'losers') && win === '7d' && d7 !== null && d7 < 7) {
        out.push(`Only ${d7} of the last 7 days have been collected so far${DATE_RE.test(String(cov.first_day)) ? ` (since ${formatDay(cov.first_day)})` : ''}.`);
      }
    } else {
      if (def.id === 'followed') out.push('Followers as reported by each account’s own server at the last daily run.');
      else if (def.id === 'active') out.push(`Net change in an account’s post count over ${w}, from daily snapshots. Net, not gross: deleted posts are subtracted, and replies and boosts count as posts. Needs a snapshot that far back.`);
      else out.push(`Net change in followers over ${w}, from daily snapshots (unfollows and removals included). Needs a snapshot that far back.`);
      const cov = social && isObj(social.coverage) ? social.coverage : null;
      const d7 = cov ? num(cov.days_7d) : null;
      if (def.windows.length && win === '7d' && d7 !== null && d7 < 7) {
        out.push(`Only ${d7} of the last 7 days have been collected so far${DATE_RE.test(String(cov.first_day)) ? ` (since ${formatDay(cov.first_day)})` : ''}.`);
      }
      if (cov) {
        const note = cleanText(cov.note, NOTE_CHARS);
        if (note) out.push(note);
        const pool = num(cov.pool);
        const scanned = num(cov.servers_scanned);
        if (pool !== null && scanned !== null) out.push(`Checked ${formatInteger(pool)} accounts found on ${formatInteger(scanned)} servers; only those that pass the rules below can be listed.`);
      }
    }
    return out;
  }

  function guardLine(mode, social) {
    if (mode === 'servers') {
      return 'Source: FediDB (fedidb.org), servers running Mastodon software. The 100 largest servers are tracked individually; servers FediDB has not seen are missing.';
    }
    const min = minFollowers(social && social.guardrails);
    const rules = social && isObj(social.guardrails) && Array.isArray(social.guardrails.rules)
      ? social.guardrails.rules.map((r) => cleanText(r, 200)).filter(Boolean).slice(0, RULES_SHOWN) : [];
    const base = `Only public accounts with at least ${formatInteger(min)} followers that opted in to discovery are named; bots, locked, group and moved accounts are left out.`;
    return rules.length ? rules.join(' ') : base;
  }

  function renderLdr() {
    const el = mounted.ldr;
    if (!el) return;
    const servers = normalizeFile(root.MASTODON_SERVERS);
    const social = normalizeFile(root.MASTODON_SOCIAL);
    const nowMs = Date.now();

    if (state.mode === null) {
      const hasS = servers && serverRows(servers, BOARDS.servers[0], '24h').length;
      const hasA = social && accountRows(social, BOARDS.accounts[0], '24h').length;
      state.mode = !hasS && hasA ? 'accounts' : 'servers';
    }
    const mode = state.mode;
    const defs = BOARDS[mode];
    const def = defs.find((d) => d.id === state.board[mode]) || defs[0];
    const win = def.windows.indexOf(state.win) !== -1 ? state.win : (def.windows[0] || null);

    syncPill(byId('soc-ldr-mode'), MODES, mode, 'mode');
    syncPill(byId('soc-ldr-board'), defs, def.id, 'board');
    const winPill = byId('soc-ldr-win');
    winPill.hidden = !def.windows.length;
    syncPill(winPill, def.windows.map((w) => ({ id: w, label: w.toUpperCase(), title: `Last ${WINDOW_LABELS[w]}` })), win, 'win');

    const raw = mode === 'servers' ? root.MASTODON_SERVERS : root.MASTODON_SOCIAL;
    const data = mode === 'servers' ? servers : social;
    const rows = !data ? [] : mode === 'servers' ? serverRows(data, def, win) : accountRows(data, def, win);
    const cols = mode === 'servers' ? SERVER_COLS : ACCOUNT_COLS;
    const head = win ? `${def.head} ${win.toUpperCase()}` : def.head;

    byId('soc-ldr-head').innerHTML = buildHeadHTML(cols, def, head);
    byId('soc-ldr-body').innerHTML = mode === 'servers' ? buildServerRowsHTML(rows, def) : buildAccountRowsHTML(rows, def, nowMs);
    byId('soc-ldr-wrap').hidden = !rows.length;

    let empty = '';
    if (!rows.length) {
      if (unreadable(mode === 'servers' ? 'servers' : 'social', raw, data)) empty = UNREADABLE;
      else {
        empty = EMPTY + (data && def.windows.length ? ` Changes need a daily snapshot ${win === '7d' ? '6 to 8 days' : '20 to 36 hours'} old.` : '');
      }
    }
    const emptyEl = byId('soc-ldr-empty');
    emptyEl.hidden = !empty;
    setText(emptyEl, empty);

    const label = def.label.toLowerCase();
    const noun = mode === 'servers' ? 'servers' : 'accounts';
    setText(byId('soc-ldr-caption'), `${mode === 'servers' ? 'Servers' : 'Accounts'}, ${label}${win ? `, last ${WINDOW_LABELS[win]}` : ''}`);
    setText(byId('soc-ldr-live'), `${label}${win ? `, ${WINDOW_LABELS[win]}` : ''}: ${rows.length} ${noun}`);
    setList(byId('soc-ldr-notes'), data ? boardCaveats(mode, def, win, servers, social) : []);
    setText(byId('soc-ldr-guard'), guardLine(mode, social));

    const tag = byId('soc-ldr-asof');
    const asOf = !data ? null : mode === 'servers' ? data.day : snapshotDate(data);
    setText(tag, !data ? 'NO DATA' : `AS OF ${asOf || '—'}`);
    tag.title = data ? `Built ${formatUtcStamp(data.generated_at)}` : '';
  }

  function mountSimple(rootId, key, code, headingId, title, sub, tagId, body) {
    const el = byId(rootId);
    if (!el) return;
    el.classList.add('soc-root');
    el.innerHTML = panelBar(code, headingId, title, sub, tagId) + body;
    mounted[key] = el;
  }

  function mountPst() {
    mountSimple('social-pst-root', 'pst', 'PST', 'soc-pst-heading', 'Top posts of the day', 'most favourited, UTC day', 'soc-pst-asof',
      '<p class="chart-subtitle" id="soc-pst-subtitle"></p>'
      + '<ul class="soc-notes" id="soc-pst-notes" hidden></ul>'
      + `<p class="soc-empty" id="soc-pst-empty">${esc(EMPTY)}</p>`
      + '<ol class="soc-post-list" id="soc-pst-list" hidden></ol>'
      + '<p class="chart-foot soc-guard">Authors must meet the same rules as the leaderboards. Only public posts without a content warning or a sensitive-media flag are shown. Text is shortened to 280 characters.</p>');
    if (mounted.pst) {
      mounted.pst.addEventListener('error', (e) => {
        if (e.target && e.target.tagName === 'IMG') e.target.classList.add('soc-avatar-broken');
      }, true);
    }
  }

  function renderPst() {
    const el = mounted.pst;
    if (!el) return;
    const raw = root.MASTODON_SOCIAL;
    const social = normalizeFile(raw);
    const posts = social ? topPosts(social) : [];
    const list = byId('soc-pst-list');
    list.innerHTML = buildPostCardsHTML(posts, Date.now());
    list.hidden = !posts.length;
    const emptyEl = byId('soc-pst-empty');
    const empty = posts.length ? '' : (unreadable('social', raw, social) ? UNREADABLE : EMPTY);
    emptyEl.hidden = !empty;
    setText(emptyEl, empty);
    setText(byId('soc-pst-subtitle'), `The ${POSTS_SHOWN} most-favourited posts created on the UTC day shown, by accounts with ${formatInteger(minFollowers(social && social.guardrails))}+ followers. `
      + 'These are trending candidates ranked by favourites, not every post: Mastodon has no public index of all posts, so a popular post can be missed. '
      + 'Counts are as one server showed them when collected. Posts with no text show [image], [video] or [link].');
    setList(byId('soc-pst-notes'), []);
    const tag = byId('soc-pst-asof');
    setText(tag, social ? `UTC DAY ${social.day}` : 'NO DATA');
    tag.title = social ? `Built ${formatUtcStamp(social.generated_at)}` : '';
  }

  function mountDec() {
    mountSimple('social-dec-root', 'dec', 'DEC', 'soc-dec-heading', 'Decentralization', 'how concentrated users are', 'soc-dec-asof',
      '<p class="chart-subtitle">Share of Mastodon users on the largest servers, from FediDB’s count of users on servers running Mastodon software. '
      + 'That count is a different base from the joinmastodon total in the page header. Only the 100 largest servers are listed individually.</p>'
      + `<p class="soc-empty" id="soc-dec-empty">${esc(EMPTY)}</p>`
      + '<div class="soc-dec-grid" id="soc-dec-body" hidden></div>');
  }

  function renderDec() {
    const el = mounted.dec;
    if (!el) return;
    const raw = root.MASTODON_SERVERS;
    const servers = normalizeFile(raw);
    const model = servers ? decentralizationModel(servers) : null;
    const box = byId('soc-dec-body');
    box.innerHTML = model ? buildDecentralizationHTML(model) : '';
    box.hidden = !model;
    const emptyEl = byId('soc-dec-empty');
    let empty = model ? '' : EMPTY;
    if (!model) {
      if (unreadable('servers', raw, servers)) empty = UNREADABLE;
      else if (servers && isObj(servers.decentralization)) empty = 'The decentralization figures in the data file are inconsistent, so they are not shown.';
    }
    emptyEl.hidden = !empty;
    setText(emptyEl, empty);
    const tag = byId('soc-dec-asof');
    setText(tag, model ? `AS OF ${model.day}` : 'NO DATA');
    tag.title = model ? `Built ${formatUtcStamp(model.generatedAt)}` : '';
  }

  // ---------------------------------------------------------------------------
  // Start
  // ---------------------------------------------------------------------------

  function safely(fn, name) {
    try {
      fn();
    } catch (err) {
      if (root.console && root.console.error) root.console.error(`Social panel ${name} failed to render.`, err);
      const el = mounted[name];
      if (el) {
        const msg = doc.createElement('p');
        msg.className = 'soc-empty';
        msg.textContent = 'This panel could not be displayed.';
        el.appendChild(msg);
      }
    }
  }

  function renderAll() {
    safely(renderLdr, 'ldr');
    safely(renderPst, 'pst');
    safely(renderDec, 'dec');
    seenServers = root.MASTODON_SERVERS;
    seenSocial = root.MASTODON_SOCIAL;
  }

  function init() {
    safely(mountLdr, 'ldr');
    safely(mountPst, 'pst');
    safely(mountDec, 'dec');
    renderAll();
    probeMissingFiles();
    // Data files loaded late (dynamic script tags) are picked up when the page finishes loading.
    root.addEventListener('load', () => {
      if (root.MASTODON_SERVERS !== seenServers || root.MASTODON_SOCIAL !== seenSocial) renderAll();
    });
  }

  root.MastodonSocialPanels = { refresh: renderAll };

  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', init);
  else init();
})(typeof window !== 'undefined' ? window : globalThis);
