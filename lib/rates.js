// Posts per day from FediDB's cumulative post counts, normalised by the time that really passed
// between two readings. Used from Node (require) for the CSV column `posts_per_day`; script.js
// carries an inline copy of the same arithmetic (keep them identical) for the page's REC chart.
//
// A row's reading is `statuses`, taken at `statuses_at` ("2026-10-12T10:41Z", UTC to the minute).
// GitHub starts scheduled runs hours late, so readings are not at a fixed hour. A row with a
// `statuses` but no `statuses_at` (hand-edited or older rows) is taken to have been read at
// 03:00 UTC on the next day.
//
//   postsPerDay(rows) -> [{ date, value }]            value in posts per day, not rounded
//
//   value[d] = (statuses[d] - statuses[prev]) / ((t[d] - t[prev]) in days)
//
// where prev is the nearest earlier row that has a reading. The value belongs to day d only (it
// is the average rate since the previous reading, so a missing day makes it a two-day average).
// A day gets no entry when its reading or the previous one is missing or flagged, when fewer than
// 6 hours separate the two readings, or when the count fell.
(function (root) {
  const FALLBACK_HOUR_UTC = 3;
  const MIN_ELAPSED_HOURS = 6;
  const HOUR_MS = 3600e3;
  const DAY_MS = 24 * HOUR_MS;
  const AT_RE = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})Z$/;

  const isCount = (n) => typeof n === 'number' && Number.isFinite(n) && n > 0;

  // Milliseconds since the epoch at which the row's `statuses` was read, or null without a date.
  function readingTime(row) {
    if (!row) return null;
    const m = AT_RE.exec(row.statuses_at || '');
    if (m) {
      const t = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]);
      if (Number.isFinite(t)) return t;
    }
    const d = /^(\d{4})-(\d{2})-(\d{2})$/.exec(row.date || '');
    if (!d) return null;
    return Date.UTC(+d[1], +d[2] - 1, +d[3]) + DAY_MS + FALLBACK_HOUR_UTC * HOUR_MS;
  }

  const isFlagged = (row) => Array.isArray(row.flags) && row.flags.includes('statuses');

  function postsPerDay(rows) {
    const out = [];
    let prev = null;
    for (const row of rows || []) {
      if (!row || !isCount(row.statuses)) continue;
      if (prev && !isFlagged(prev) && !isFlagged(row)) {
        const t = readingTime(row);
        const tPrev = readingTime(prev);
        const hours = t === null || tPrev === null ? 0 : (t - tPrev) / HOUR_MS;
        const delta = row.statuses - prev.statuses;
        if (hours >= MIN_ELAPSED_HOURS && delta >= 0) out.push({ date: row.date, value: delta / (hours / 24) });
      }
      prev = row;
    }
    return out;
  }

  const api = { postsPerDay, readingTime, FALLBACK_HOUR_UTC, MIN_ELAPSED_HOURS };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.MastodonRates = api;
})(typeof window !== 'undefined' ? window : globalThis);
