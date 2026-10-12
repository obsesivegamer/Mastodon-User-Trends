'use strict';
// Server-side pre-render of index.html and sitemap.xml. Pure string transforms: crawlers and
// no-JS readers get the numbers script.js paints after load, so nothing flips when it runs.
//
// Every number and sentence comes from script.js's own pure builders (computePrerenderValues,
// computeTickerItems, buildTickerHTML, buildMilestoneRowsHTML, buildIndexStripHTML), the same
// functions the page calls, so the static markup is what the browser would paint in the default
// view. This file only finds the slots in the HTML, writes the build stamp, the cache-bust
// marker and the JSON-LD, and moves the sitemap's <lastmod>.
//
// CLI: node lib/prerender.js [--dry-run] [--data FILE] [--index FILE] [--sitemap FILE] [--generated ISO]

const fmt = require('./format.js');

const SITE_URL = 'https://obsesivegamer.github.io/Mastodon-User-Trends/';
const CSV_URL = SITE_URL + 'data/mastodon-daily.csv';
const REPO_URL = 'https://github.com/obsesivegamer/Mastodon-User-Trends';

// Keys the markup is expected to carry as <tag data-prerender="KEY">TEXT</tag>. computePrerenderValues
// may return more; the union is what a page must contain.
const INLINE_KEYS = [
  'last-day', 'generated',
  'total-users', 'total-users-compact',
  'mau', 'mau-full', 'mau-day', 'engagement', 'mau-peak', 'mau-peak-date',
  'mau-velocity-7d', 'mau-velocity-last', 'mau-velocity-peak', 'mau-velocity-peak-date',
  'signups-7d', 'signups-last', 'signups-peak', 'signups-peak-date',
  'servers', 'servers-sentence', 'posts-sentence',
];
const BLOCK_KEYS = ['ticker', 'milestones', 'strip'];
const JSONLD_KEY = 'jsonld';
const STAMP_KEY = 'data-stamp';
const GENERATED_KEY = 'generated';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

let uiModule;
function loadUi() {
  if (uiModule === undefined) {
    try {
      const ui = require('../script.js');
      const needed = ['buildSeries', 'computePrerenderValues', 'computeTickerItems', 'buildTickerHTML', 'buildMilestoneRowsHTML', 'buildIndexStripHTML'];
      uiModule = needed.every((fn) => typeof ui[fn] === 'function') ? ui : null;
    } catch {
      uiModule = null;
    }
  }
  return uiModule;
}

const HTML_ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => HTML_ESCAPES[c]);
}

function validRows(rows) {
  return Array.isArray(rows) ? rows.filter((r) => r && typeof r.date === 'string' && DATE_RE.test(r.date)) : [];
}

function lastDay(rows) {
  let best = null;
  for (const r of validRows(rows)) if (best === null || r.date > best) best = r.date;
  return best;
}

function firstDay(rows) {
  let best = null;
  for (const r of validRows(rows)) if (best === null || r.date < best) best = r.date;
  return best;
}

// {key: text} for the inline slots, exactly script.js's own values. {} when script.js is unusable.
function computeValues(rows, ui = loadUi()) {
  if (!ui) return {};
  try {
    return ui.computePrerenderValues(rows, ui.buildSeries(rows));
  } catch {
    return {};
  }
}

// {ticker, milestones, strip}: arrays of lines. A block whose builder is unavailable is omitted
// (the page's block stays as it was and is reported missing).
function renderBlocks(rows, ui = loadUi()) {
  const out = {};
  if (!ui || !validRows(rows).length) return out;
  const lines = (s) => (s ? String(s).split('\n') : []);
  try {
    const series = ui.buildSeries(rows);
    out.ticker = lines(ui.buildTickerHTML(ui.computeTickerItems(rows, series)));
    out.milestones = lines(ui.buildMilestoneRowsHTML(rows, series));
    out.strip = lines(ui.buildIndexStripHTML(rows, series));
  } catch {
    return {};
  }
  return out;
}

// ---- generated / cache-bust stamp -------------------------------------------------------------

function generatedFromHtml(html) {
  const m = /<[^<>]*\bdata-prerender\s*=\s*["']generated["'][^<>]*>\s*(\d{4}-\d{2}-\d{2}) (\d{2}):(\d{2}) UTC\s*</.exec(html);
  return m ? Date.parse(`${m[1]}T${m[2]}:${m[3]}:00Z`) : NaN;
}

// ISO time (minute precision, so the shown stamp, the cache-bust stamp and dateModified always
// agree and a re-run reproduces them) for: the explicit value, else the one already on the page,
// else the start of the last archive day.
function resolveGenerated(html, rows, generatedAt) {
  let t = generatedAt ? Date.parse(generatedAt) : NaN;
  if (!Number.isFinite(t)) t = generatedFromHtml(html);
  if (!Number.isFinite(t)) {
    const day = lastDay(rows);
    t = day ? Date.parse(day + 'T00:00:00Z') : NaN;
  }
  return Number.isFinite(t) ? new Date(Math.floor(t / 60000) * 60000).toISOString() : null;
}

function compactStamp(iso) {
  return iso ? iso.slice(0, 16).replace(/\D/g, '') : null;
}

// ---- JSON-LD ----------------------------------------------------------------------------------

function buildJsonLd(rows, options = {}) {
  const first = firstDay(rows) || '2022-09-30';
  const last = lastDay(rows) || '';
  const modified = options.generatedAt || last;
  const faq = Array.isArray(options.faq) ? options.faq.filter((f) => f && f.question && f.answer) : [];

  const graph = [
    {
      '@type': 'WebApplication',
      '@id': SITE_URL + '#app',
      name: 'Mastodon Network Pulse',
      alternateName: 'Mastodon User Trends',
      url: SITE_URL,
      description: 'Terminal-style dashboard for Mastodon: total users, monthly active users, net daily change, servers and posts per day, updated twice a day from public data.',
      applicationCategory: 'ReferenceApplication',
      operatingSystem: 'Any',
      isAccessibleForFree: true,
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
      about: { '@type': 'Thing', name: 'Mastodon', sameAs: 'https://joinmastodon.org/' },
      dateModified: modified,
    },
  ];
  if (faq.length) {
    graph.push({
      '@type': 'FAQPage',
      '@id': SITE_URL + '#faq',
      mainEntity: faq.map((f) => ({
        '@type': 'Question',
        name: f.question,
        acceptedAnswer: { '@type': 'Answer', text: f.answer },
      })),
    });
  }
  graph.push({
    '@type': 'Dataset',
    '@id': SITE_URL + '#dataset',
    name: 'Mastodon daily users, monthly active users, servers and posts',
    description: `Daily Mastodon time series from ${first} to ${last}: total users and monthly active users (trailing 30 days) as reported by joinmastodon.org's statistics API, server count, FediDB's status, user and server counts for Mastodon-software servers, net daily changes, and per-day flags for readings treated as unreliable.`,
    url: SITE_URL,
    keywords: ['Mastodon', 'Mastodon users', 'Mastodon monthly active users', 'Mastodon user growth', 'Fediverse', 'ActivityPub', 'social media statistics'],
    creator: { '@type': 'Person', name: 'obsesivegamer', url: 'https://github.com/obsesivegamer' },
    isAccessibleForFree: true,
    isBasedOn: ['https://api.joinmastodon.org/statistics', 'https://api.fedidb.org/v1/software/mastodon'],
    creditText: 'User, monthly active user and server counts from the joinmastodon.org statistics API; status, user and server totals for Mastodon-software servers from FediDB (fedidb.org).',
    license: REPO_URL + '/blob/master/LICENSE',
    temporalCoverage: `${first}/${last}`,
    dateModified: modified,
    variableMeasured: [
      'Total users',
      'Monthly active users',
      'Net daily change of total users',
      'Net daily change of monthly active users',
      'Servers',
      'FediDB posts (statuses)',
      'FediDB users',
      'FediDB servers',
    ],
    distribution: [{ '@type': 'DataDownload', encodingFormat: 'text/csv', contentUrl: CSV_URL }],
  });
  return { '@context': 'https://schema.org', '@graph': graph };
}

const NAMED_ENTITIES = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', mdash: '—', ndash: '–', hellip: '…',
  rsquo: '’', lsquo: '‘', ldquo: '“', rdquo: '”', middot: '·', times: '×', rarr: '→', larr: '←',
  asymp: '≈', ge: '≥', le: '≤', plusmn: '±', minus: '−', deg: '°', copy: '©', bull: '•', thinsp: ' ',
};

function decodeEntities(s) {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) => {
    if (e[0] === '#') {
      const code = e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(code) && code <= 0x10ffff ? String.fromCodePoint(code) : m;
    }
    return Object.prototype.hasOwnProperty.call(NAMED_ENTITIES, e.toLowerCase()) ? NAMED_ENTITIES[e.toLowerCase()] : m;
  });
}

// Same text rules as script.js's faqText: <br> and block ends become spaces, whitespace collapses.
function htmlToText(html) {
  return decodeEntities(
    html
      .replace(/<!--[\s\S]*?-->/g, '')
      .replace(/<(script|style)\b[\s\S]*?<\/\1>/gi, '')
      .replace(/<(br|\/p|\/li|\/div|\/h\d)\b[^>]*>/gi, ' ')
      .replace(/<[^>]+>/g, ''),
  ).replace(/\s+/g, ' ').trim();
}

// Visible FAQ (<details class="…faq…"> with a <summary>) -> [{question, answer}], so the JSON-LD
// mirrors what readers see and what syncJsonLd in script.js would write.
function extractFaq(html) {
  const out = [];
  const re = /<details\b([^>]*)>([\s\S]*?)<\/details>/gi;
  let m;
  while ((m = re.exec(html))) {
    const cls = /\bclass\s*=\s*(["'])([^"']*)\1/i.exec(m[1]);
    if (!cls || !/faq/i.test(cls[2])) continue;
    const sum = /<summary\b[^>]*>([\s\S]*?)<\/summary>/i.exec(m[2]);
    if (!sum) continue;
    const questionHtml = sum[1].replace(/<(\w+)\b[^>]*(?:aria-hidden\s*=\s*["']true["']|class\s*=\s*["'][^"']*\bfaq-arrow\b[^"']*["'])[^>]*>[\s\S]*?<\/\1>/gi, '');
    const question = htmlToText(questionHtml);
    const answer = htmlToText(m[2].slice(sum.index + sum[0].length));
    if (question && answer) out.push({ question, answer });
  }
  return out;
}

function lineIndent(html, index) {
  const lineStart = html.lastIndexOf('\n', index - 1) + 1;
  const m = /^[ \t]*/.exec(html.slice(lineStart, index));
  return m ? m[0] : '';
}

// `<` is escaped so no string in the data can close the script element.
function jsonForScript(obj, indent) {
  const json = JSON.stringify(obj, null, 2).replace(/</g, '\\u003c');
  return '\n' + json.split('\n').map((line) => indent + '  ' + line).join('\n') + '\n' + indent;
}

// ---- slots ------------------------------------------------------------------------------------

const START_TAG_RE = /<([a-zA-Z][a-zA-Z0-9-]*)((?:\s+[^\s"'>\/=]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'=<>`]+))?)*)\s*\/?>/g;
const PRERENDER_ATTR_RE = /(?:^|\s)data-prerender\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/i;

// Same text with comments, <script> and <style> bodies blanked (length and newlines kept), so a
// data-prerender mentioned in a comment or in JSON-LD is never taken for an element.
function maskInert(html) {
  const blank = (s) => s.replace(/[^\n]/g, ' ');
  return html
    .replace(/<!--[\s\S]*?-->/g, blank)
    .replace(/(<(script|style)\b[^>]*>)([\s\S]*?)(<\/\2\s*>)/gi, (_a, open, _t, body, close) => open + blank(body) + close);
}

function replaceInline(html, values, knownKeys, found, invalid, unknown) {
  const masked = maskInert(html);
  let out = '';
  let cursor = 0;
  START_TAG_RE.lastIndex = 0;
  let m;
  while ((m = START_TAG_RE.exec(masked))) {
    const attr = PRERENDER_ATTR_RE.exec(m[2] || '');
    if (!attr) continue;
    const key = attr[1] ?? attr[2] ?? attr[3];
    if (!knownKeys.has(key)) {
      unknown.add(key);
      continue;
    }
    const contentStart = m.index + m[0].length;
    const lt = masked.indexOf('<', contentStart);
    const closeRe = new RegExp('^</' + m[1] + '\\s*>', 'i');
    if (lt === -1 || !closeRe.test(masked.slice(lt, lt + m[1].length + 16))) {
      invalid.add(key);
      continue;
    }
    if (!Object.prototype.hasOwnProperty.call(values, key)) continue;
    out += html.slice(cursor, contentStart) + escapeHtml(values[key]);
    cursor = lt;
    START_TAG_RE.lastIndex = lt;
    found.add(key);
  }
  return out + html.slice(cursor);
}

function replaceBlock(html, key, lines) {
  const re = new RegExp(`(<!--\\s*prerender:${key}\\s*-->)([\\s\\S]*?)(<!--\\s*/prerender:${key}\\s*-->)`, 'g');
  let hit = false;
  const result = html.replace(re, (_all, open, _inner, close, offset) => {
    hit = true;
    const indent = lineIndent(html, offset);
    const body = lines.length ? '\n' + lines.map((l) => indent + l).join('\n') + '\n' + indent : '';
    return open + body + close;
  });
  return { html: result, hit };
}

// prerenderIndex(html, rows, {generatedAt?, ui?}) -> {html, replaced, missing, invalid, unknown}
// `rows` is the historicalData array. Never throws on missing keys, a missing script.js or an
// empty archive: whatever cannot be filled is left as it was and listed in `missing`.
function prerenderIndex(html, rows, options = {}) {
  const source = String(html);
  const ui = 'ui' in options ? options.ui : loadUi();
  if (!validRows(rows).length) {
    // An empty or unreadable archive must not wipe a good page with dashes.
    return { html: source, replaced: [], missing: [...INLINE_KEYS, ...BLOCK_KEYS, STAMP_KEY, JSONLD_KEY], invalid: [], unknown: [] };
  }
  const found = new Set();
  const invalid = new Set();
  const unknown = new Set();

  const generatedIso = resolveGenerated(source, rows, options.generatedAt);
  const values = { ...computeValues(rows, ui) };
  if (generatedIso) values[GENERATED_KEY] = fmt.formatUtcStamp(generatedIso);
  const knownKeys = new Set([...INLINE_KEYS, ...Object.keys(values)]);

  let out = replaceInline(source, values, knownKeys, found, invalid, unknown);

  const blocks = renderBlocks(rows, ui);
  for (const key of BLOCK_KEYS) {
    if (!blocks[key]) continue;
    const r = replaceBlock(out, key, blocks[key]);
    out = r.html;
    if (r.hit) found.add(key);
  }

  const stamp = compactStamp(generatedIso);
  if (stamp) {
    const stampRe = /(<script\b[^>]*\bsrc\s*=\s*["'](?:\.\/)?historicalData\.js\?v=)[^"'#&]*/gi;
    out = out.replace(stampRe, (_all, prefix) => {
      found.add(STAMP_KEY);
      return prefix + stamp;
    });
  }

  const ldRe = /(<script\b[^>]*\bid\s*=\s*["']jsonld["'][^>]*>)([\s\S]*?)(<\/script\s*>)/i;
  const ld = ldRe.exec(out);
  if (ld && validRows(rows).length) {
    const json = jsonForScript(buildJsonLd(rows, { faq: extractFaq(out), generatedAt: generatedIso }), lineIndent(out, ld.index));
    out = out.slice(0, ld.index) + ld[1] + json + ld[3] + out.slice(ld.index + ld[0].length);
    found.add(JSONLD_KEY);
  }

  const all = [...new Set([...INLINE_KEYS, ...Object.keys(values)]), ...BLOCK_KEYS, STAMP_KEY, JSONLD_KEY];
  return {
    html: out,
    replaced: all.filter((k) => found.has(k)),
    missing: all.filter((k) => !found.has(k)),
    invalid: [...invalid],
    unknown: [...unknown],
  };
}

// <lastmod> = the last complete day in the archive (the updater never stores today).
function updateSitemap(xml, rows) {
  const day = lastDay(rows);
  if (!day) return xml;
  if (/<lastmod>[^<]*<\/lastmod>/.test(xml)) return xml.replace(/<lastmod>[^<]*<\/lastmod>/g, `<lastmod>${day}</lastmod>`);
  return xml.replace(/([ \t]*)(<loc>[^<]*<\/loc>)/g, (_all, indent, loc) => `${indent}${loc}\n${indent}<lastmod>${day}</lastmod>`);
}

// historicalData.js is `const historicalData = [ ... ];`
function parseDataFile(src) {
  const eq = src.indexOf('=');
  if (eq === -1) throw new Error('data file has no assignment');
  const rows = JSON.parse(src.slice(eq + 1).trim().replace(/;\s*$/, ''));
  if (!Array.isArray(rows)) throw new Error('data file is not an array');
  return rows;
}

function main(argv) {
  const fs = require('fs');
  const path = require('path');
  const root = path.resolve(__dirname, '..');
  const opts = { data: 'historicalData.js', index: 'index.html', sitemap: 'sitemap.xml', generated: null, dryRun: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--dry-run') opts.dryRun = true;
    else if (a === '--data' || a === '--index' || a === '--sitemap' || a === '--generated') opts[a.slice(2)] = argv[++i];
    else if (a === '-h' || a === '--help') {
      console.log('Usage: node lib/prerender.js [--dry-run] [--data FILE] [--index FILE] [--sitemap FILE] [--generated ISO]');
      return 0;
    } else {
      console.error(`Unknown argument: ${a}`);
      return 2;
    }
  }
  const resolve = (p) => path.resolve(root, p);
  for (const key of ['data', 'index']) {
    if (!fs.existsSync(resolve(opts[key]))) {
      console.error(`${key} file not found: ${resolve(opts[key])}`);
      return 2;
    }
  }
  const rows = parseDataFile(fs.readFileSync(resolve(opts.data), 'utf8'));
  const html = fs.readFileSync(resolve(opts.index), 'utf8');
  const result = prerenderIndex(html, rows, { generatedAt: opts.generated });
  console.log(`replaced: ${result.replaced.join(', ') || '(none)'}`);
  if (result.missing.length) console.warn(`missing: ${result.missing.join(', ')}`);
  if (result.invalid.length) console.warn(`invalid (element has child nodes or no closing tag): ${result.invalid.join(', ')}`);
  if (result.unknown.length) console.warn(`unknown keys left untouched: ${result.unknown.join(', ')}`);
  const sitemapPath = resolve(opts.sitemap);
  const sitemap = fs.existsSync(sitemapPath) ? fs.readFileSync(sitemapPath, 'utf8') : null;
  const nextSitemap = sitemap === null ? null : updateSitemap(sitemap, rows);
  if (opts.dryRun) {
    const stale = [result.html !== html && opts.index, nextSitemap !== null && nextSitemap !== sitemap && opts.sitemap].filter(Boolean);
    if (stale.length) console.warn(`stale (differs from a fresh render): ${stale.join(', ')}`);
    console.log('dry run: nothing written');
  } else {
    if (result.html !== html) fs.writeFileSync(resolve(opts.index), result.html);
    if (nextSitemap !== null && nextSitemap !== sitemap) fs.writeFileSync(sitemapPath, nextSitemap);
    console.log(`wrote ${opts.index}${sitemap !== null ? ` and ${opts.sitemap}` : ''}`);
  }
  return result.missing.length || result.invalid.length || result.unknown.length ? 1 : 0;
}

module.exports = {
  SITE_URL,
  CSV_URL,
  INLINE_KEYS,
  BLOCK_KEYS,
  computeValues,
  prerenderIndex,
  buildJsonLd,
  updateSitemap,
  extractFaq,
  renderBlocks,
  parseDataFile,
  resolveGenerated,
  escapeHtml,
};

if (require.main === module) process.exitCode = main(process.argv.slice(2));
