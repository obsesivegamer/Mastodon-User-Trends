(function (root) {
  'use strict';

  // ---------------------------------------------------------------------------
  // Formatting. Same strings as lib/format.js (the pre-render uses that file), kept inline so the
  // page needs one script and script.js loads in Node without it.
  // ---------------------------------------------------------------------------
  const LOCALE = 'en-US';
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const isNum = (n) => typeof n === 'number' && Number.isFinite(n);

  function formatInteger(n) {
    return isNum(n) ? (Math.round(n) + 0).toLocaleString(LOCALE) : '—';
  }

  // Round first, then choose the unit, so a value that rounds up to 1000 of one unit is printed
  // in the next one: 999966 -> '1.00M' (not '1000.0K'), 999995000 -> '1.000B', 999.5 -> '1.0K'.
  function formatCompact(n) {
    if (!isNum(n)) return '—';
    const a = Math.abs(n);
    let body;
    if (Math.round(a) < 1e3) body = Math.round(a).toLocaleString(LOCALE);
    else if (Number((a / 1e3).toFixed(1)) < 1e3) body = `${(a / 1e3).toFixed(1)}K`;
    else if (Number((a / 1e6).toFixed(2)) < 1e3) body = `${(a / 1e6).toFixed(2)}M`;
    else body = `${(a / 1e9).toFixed(3)}B`;
    return (n < 0 && body !== '0' ? '-' : '') + body;
  }

  // Always signed; a value that rounds to 0 is '+0', never '-0'.
  function formatSigned(n, compact = true) {
    if (!isNum(n)) return '—';
    const body = compact ? formatCompact(Math.abs(n)) : formatInteger(Math.abs(n));
    return (n < 0 && body !== '0' ? '-' : '+') + body;
  }

  function formatPct(x, digits = 2) {
    return isNum(x) ? x.toFixed(digits) + '%' : '—';
  }

  function formatSignedPct(x, digits = 2) {
    if (!isNum(x)) return '—';
    return (x < 0 ? '-' : '+') + Math.abs(x).toFixed(digits) + '%';
  }

  // 'YYYY-MM-DD' -> 'Oct 7, 2026' without going through local-time Date parsing.
  function formatDay(isoDate) {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(isoDate || '');
    if (!m) return '—';
    return `${MONTHS[Number(m[2]) - 1]} ${Number(m[3])}, ${m[1]}`;
  }

  // ISO timestamp -> '2026-10-08 03:17 UTC'.
  function formatUtcStamp(iso) {
    const t = Date.parse(iso);
    if (Number.isNaN(t)) return '—';
    return `${new Date(t).toISOString().slice(0, 16).replace('T', ' ')} UTC`;
  }

  // ---------------------------------------------------------------------------
  // Constants
  // ---------------------------------------------------------------------------
  const DAY_MS = 86400000;
  const ISO_DAY = /^(\d{4})-(\d{2})-(\d{2})$/;
  const SITE_URL = 'https://obsesivegamer.github.io/Mastodon-User-Trends/';
  const LIVE_URL = 'https://api.joinmastodon.org/statistics';
  const RANGES = ['1W', '1M', '3M', '6M', 'YTD', '1Y', '2Y', 'ALL'];
  const VELOCITY_MODES = ['mau', 'signups', 'pct'];
  const BASE_MODES = ['mau', 'signups'];
  const RATIO_MODES = ['engagement', 'posts_per_mau', 'users_per_server'];
  const RATIO_HASH = { engagement: 'en', posts_per_mau: 'pm', users_per_server: 'us' };
  const SERVER_MODES = ['servers', 'users_per_server'];
  const SERVER_HASH = { servers: 'sv', users_per_server: 'ups' };
  const DEFAULT_STATE = Object.freeze({ range: '1Y', ma: true, log: false, cmp: false, vm: 'mau', vb: 'mau', rm: 'engagement', sm: 'servers' });
  // Metrics a row can flag as unreliable. The FediDB reading (statuses, fedi_users, fedi_instances)
  // is one observation, so the `statuses` flag covers all three.
  const FLAG_OF = { total: 'total', active: 'active', servers: 'servers', statuses: 'statuses', fedi_users: 'statuses', fedi_instances: 'statuses' };
  const FIELDS = ['total', 'active', 'servers', 'statuses', 'fedi_users', 'fedi_instances'];

  const RANGE_LABELS = {
    '1W': 'Past Week', '1M': 'Past Month', '3M': 'Past 3 Months', '6M': 'Past 6 Months',
    'YTD': 'Year to Date', '1Y': 'Past Year', '2Y': 'Past 2 Years', 'ALL': 'All Time'
  };
  const RANGE_TREND_TAGS = { '1W': 'WoW', '1M': 'MoM', '3M': '3M', '6M': '6M', 'YTD': 'YTD', '1Y': 'YoY', '2Y': '2Y', 'ALL': 'ALL' };

  // Editorial windows. The chips on the page show what the data says about each window. The two
  // windows marked `artifact` hold a one-day step in joinmastodon's crawler sum that reversed
  // later (lib/flags.js flags the displaced days); they are kept as windows so the shaded gaps
  // can be inspected, but their chips show FLAGGED instead of a signup figure.
  const SURGE_DEFINITIONS = {
    SURGE_NOV_2022: {
      id: 'SURGE_NOV_2022',
      title: 'Nov 2022 Musk Wave',
      startDate: '2022-10-20',
      endDate: '2022-12-15',
      label: 'Nov 2022 Musk Wave (Oct 20 – Dec 15, 2022)',
      description: 'The Twitter takeover closed on Oct 27, 2022 and users moved to Mastodon; monthly active users peaked on Nov 30.'
    },
    SURGE_JUL_2023: {
      id: 'SURGE_JUL_2023',
      title: 'Jul 2023 Threads Wave',
      startDate: '2023-06-25',
      endDate: '2023-08-15',
      label: 'Jul 2023 Threads Wave (Jun 25 – Aug 15, 2023)',
      description: 'Twitter limited how many posts people could read on Jul 1, 2023 and Meta launched Threads on Jul 5; monthly active users rose in the same weeks.'
    },
    SURGE_FEB_2024: {
      id: 'SURGE_FEB_2024',
      title: 'Feb 2024 Crawler Step',
      startDate: '2024-01-20',
      endDate: '2024-03-05',
      label: 'Feb 2024 Crawler Step, flagged (Jan 20 – Mar 5, 2024)',
      artifact: true,
      description: 'The user count jumped in a single day and fell back days later while monthly active users did not follow it: an artifact of joinmastodon’s crawler sum, not sign-ups. The displaced days are flagged and treated as missing.'
    },
    SURGE_SEP_2024: {
      id: 'SURGE_SEP_2024',
      title: 'Sep 2024 Crawler Step',
      startDate: '2024-08-20',
      endDate: '2024-10-10',
      label: 'Sep 2024 Crawler Step, flagged (Aug 20 – Oct 10, 2024)',
      artifact: true,
      description: 'The user count jumped in a single day and was reversed weeks later while monthly active users did not follow it: an artifact of joinmastodon’s crawler sum, not sign-ups. The displaced days are flagged and treated as missing.'
    }
  };
  const SURGE_IDS = Object.keys(SURGE_DEFINITIONS);

  const MILESTONES = [
    { date: '2022-09-30', context: 'Archive begins (first day in the statistics archive kept here)' },
    { date: '2022-11-30', context: 'Monthly active users reach their all-time peak during the Twitter/X migration', highlight: true },
    { date: '2023-07-31', context: 'The month of the Twitter reading limits and the Threads launch', highlight: true },
    { date: '2024-07-31', context: 'Mid-year checkpoint, a year after the Threads wave' },
    { date: '2025-07-31', context: 'Mid-year checkpoint, two years after the Threads wave' }
  ];

  const METRIC_LABELS = {
    total: 'Total users', active: 'Monthly active users', servers: 'Servers', posts: 'Posts per day',
    net_active: 'MAU change', net_total: 'Net signups', growth_mau: 'MAU growth', growth_signups: 'Signup growth',
    fedi_users: 'FediDB users', fedi_instances: 'FediDB servers',
    engagement: 'MAU ÷ total users', posts_per_mau: 'Posts per MAU', users_per_server: 'Users per server'
  };

  // ---------------------------------------------------------------------------
  // Pure helpers (exported for node:test and for the pre-render)
  // ---------------------------------------------------------------------------
  const num = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : null);

  function isoToDayNum(iso) {
    const m = ISO_DAY.exec(iso || '');
    return m ? Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])) / DAY_MS : NaN;
  }

  function dayNumToIso(n) {
    return new Date(n * DAY_MS).toISOString().slice(0, 10);
  }

  function addDays(iso, n) {
    return dayNumToIso(isoToDayNum(iso) + n);
  }

  function addMonths(iso, n) {
    const m = ISO_DAY.exec(iso);
    const day = Number(m[3]);
    let month = Number(m[2]) - 1 + n;
    const year = Number(m[1]) + Math.floor(month / 12);
    month = ((month % 12) + 12) % 12;
    const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
    return dayNumToIso(Date.UTC(year, month, Math.min(day, daysInMonth)) / DAY_MS);
  }

  function daysBetween(a, b) {
    return isoToDayNum(b) - isoToDayNum(a);
  }

  const parseArchiveDate = (value) => {
    const m = ISO_DAY.exec(value);
    if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    return new Date(value);
  };

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  function mean(values) {
    let sum = 0;
    let count = 0;
    for (const v of values) {
      if (v != null && Number.isFinite(v)) { sum += v; count += 1; }
    }
    return count ? sum / count : null;
  }

  function lastIndexWhere(arr, pred) {
    for (let i = arr.length - 1; i >= 0; i -= 1) if (pred(arr[i], i)) return i;
    return -1;
  }

  function argMax(values) {
    let best = -1;
    for (let i = 0; i < values.length; i += 1) {
      if (values[i] != null && (best < 0 || values[i] > values[best])) best = i;
    }
    return best;
  }

  function pctChange(from, to) {
    if (from == null || to == null || from === 0) return null;
    return ((to - from) / Math.abs(from)) * 100;
  }

  function isFlagged(row, key) {
    return Array.isArray(row && row.flags) && row.flags.includes(key);
  }

  // A flagged metric is missing: null everywhere (gaps, averages, deltas, peaks, ratios).
  function metricValue(row, key) {
    if (!row) return null;
    const flag = FLAG_OF[key];
    if (flag && isFlagged(row, flag)) return null;
    return num(row[key]);
  }

  function emptyRow(date) {
    return { date, flags: [], missing: true };
  }

  // Sorts by date, drops malformed rows, and inserts a placeholder row for every missing
  // calendar day so each index step is exactly one UTC day. Nothing is interpolated.
  function normalizeDays(days) {
    const byDate = new Map();
    for (const row of days || []) {
      if (row && ISO_DAY.test(row.date)) byDate.set(row.date, row);
    }
    const dates = [...byDate.keys()].sort();
    if (!dates.length) return [];
    const out = [];
    const end = isoToDayNum(dates[dates.length - 1]);
    for (let n = isoToDayNum(dates[0]); n <= end; n += 1) {
      const iso = dayNumToIso(n);
      out.push(byDate.get(iso) || emptyRow(iso));
    }
    return out;
  }

  function ratioSeries(a, b, scale) {
    return a.map((v, i) => (v != null && b[i] != null && b[i] > 0 ? (v / b[i]) * scale : null));
  }

  function dailyDeltas(values) {
    return values.map((v, i) => (i > 0 && v != null && values[i - 1] != null ? v - values[i - 1] : null));
  }

  // FediDB's status counter is cumulative and read once per row, when the update runs, which is
  // not a fixed hour. Posts per day is therefore a rate: the change since the previous reading
  // divided by the time between the two readings, assigned to the day of the later one.
  // A reading's time is `statuses_at` (ISO UTC) or, for rows without it, 03:00 UTC on the next day.
  // No value when either reading is absent or flagged, when the readings are less than 6 hours
  // apart, or when the counter moved backwards (a bad reading, not negative posting).
  const MIN_READING_GAP_MS = 6 * 3600e3;
  const FALLBACK_READING_MS = DAY_MS + 3 * 3600e3;

  const READING_AT = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})Z$/;

  function readingTime(row) {
    const m = READING_AT.exec(row && row.statuses_at || '');
    if (m) return Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]);
    const d = row && ISO_DAY.test(row.date) ? Date.parse(`${row.date}T00:00:00Z`) : NaN;
    return Number.isFinite(d) ? d + FALLBACK_READING_MS : NaN;
  }

  // `rows` ascending by date (rows without a reading are skipped); result aligned with `rows`.
  function postsPerDay(rows) {
    const out = (rows || []).map(() => null);
    let prev = -1;
    (rows || []).forEach((row, i) => {
      if (!row || row.missing === true || !(num(row.statuses) > 0)) return;
      if (prev >= 0) {
        const before = rows[prev];
        const elapsed = readingTime(row) - readingTime(before);
        if (!isFlagged(row, 'statuses') && !isFlagged(before, 'statuses') && elapsed >= MIN_READING_GAP_MS) {
          const rate = (row.statuses - before.statuses) / (elapsed / DAY_MS);
          if (rate >= 0) out[i] = rate;
        }
      }
      prev = i;
    });
    return out;
  }

  // Everything the page plots, one entry per UTC calendar day from the first archive row to the last.
  function buildSeries(rawDays) {
    const rows = normalizeDays(rawDays);
    const s = { rows, dates: rows.map((r) => r.date), length: rows.length };
    FIELDS.forEach((k) => { s[k] = rows.map((r) => metricValue(r, k)); });
    s.net_total = dailyDeltas(s.total);
    s.net_active = dailyDeltas(s.active);
    s.statuses_at = rows.map((r) => (READING_AT.test(r.statuses_at || '') && !isFlagged(r, 'statuses') && !r.missing ? r.statuses_at : null));
    s.posts = postsPerDay(rows);
    s.growth_signups = s.net_total.map((v, i) => (v != null && i > 0 && s.total[i - 1] > 0 ? (v / s.total[i - 1]) * 100 : null));
    s.growth_mau = s.net_active.map((v, i) => (v != null && i > 0 && s.active[i - 1] > 0 ? (v / s.active[i - 1]) * 100 : null));
    s.engagement = ratioSeries(s.active, s.total, 100);
    s.posts_per_mau = ratioSeries(s.posts, s.active, 1);
    s.users_per_server = ratioSeries(s.total, s.servers, 1);
    s.flags = rows.map((r) => (Array.isArray(r.flags) ? r.flags.filter((f) => typeof f === 'string') : []));
    s.missing = rows.map((r) => r.missing === true);
    return s;
  }

  function seriesIndexOf(series, iso) {
    if (!series.length) return -1;
    const i = isoToDayNum(iso) - isoToDayNum(series.dates[0]);
    return i >= 0 && i < series.length ? i : -1;
  }

  // Trailing calendar-day moving average over a contiguous daily array. Missing values are
  // skipped; a point is emitted only once a full window exists and at least `minValid` of its
  // days have data, so gaps never drag the average toward zero.
  function movingAverage(values, window = 7, minValid = Math.min(window, 4)) {
    const out = new Array(values.length).fill(null);
    for (let i = window - 1; i < values.length; i += 1) {
      let sum = 0;
      let count = 0;
      for (let j = i - window + 1; j <= i; j += 1) {
        const v = values[j];
        if (v != null && Number.isFinite(v)) { sum += v; count += 1; }
      }
      if (count >= minValid) out[i] = sum / count;
    }
    return out;
  }

  function rowsHaveDates(rows) {
    return rows.length > 0 && rows.every((r) => r && ISO_DAY.test(r.date));
  }

  function calculateMovingAverage(rows, key, window = 7) {
    if (!Array.isArray(rows) || rows.length === 0) return [];
    if (!rowsHaveDates(rows)) return movingAverage(rows.map((r) => metricValue(r, key)), window);
    const norm = normalizeDays(rows);
    const ma = movingAverage(norm.map((r) => metricValue(r, key)), window);
    const first = isoToDayNum(norm[0].date);
    return rows.map((r) => ma[isoToDayNum(r.date) - first]);
  }

  // Day-over-day change per row; the first row has no predecessor and reads 0. A row whose
  // previous calendar day is missing or flagged is null, never a multi-day jump.
  function calculateDailyDeltas(rows, key = 'total') {
    if (!Array.isArray(rows) || rows.length === 0) return [];
    const byDate = rowsHaveDates(rows) ? new Map(rows.map((r) => [r.date, r])) : null;
    return rows.map((r, i) => {
      if (i === 0) return 0;
      const prev = byDate ? byDate.get(addDays(r.date, -1)) : rows[i - 1];
      const a = metricValue(prev, key);
      const b = metricValue(r, key);
      return a != null && b != null ? b - a : null;
    });
  }

  function calculateGrowthVelocity(rows, key = 'total') {
    const valid = (rows || []).filter((r) => metricValue(r, key) != null && ISO_DAY.test(r.date));
    if (valid.length < 2) return { diff: 0, days: 1, ratePerDay: 0, formatted: '0 / day' };
    const first = valid[0];
    const last = valid[valid.length - 1];
    const diff = metricValue(last, key) - metricValue(first, key);
    const days = Math.max(1, daysBetween(first.date, last.date));
    const ratePerDay = Math.round(diff / days);
    return { diff, days, ratePerDay, formatted: `${formatSigned(ratePerDay)} / day` };
  }

  function calculateEngagementRatio(total, active) {
    if (!total || total <= 0 || !active || active < 0) return '0.00%';
    return `${((active / total) * 100).toFixed(2)}%`;
  }

  function generateSparklineSVG(values, width = 120, height = 28) {
    if (!Array.isArray(values) || values.length < 2) return '';
    const valid = values.filter((v) => typeof v === 'number' && Number.isFinite(v));
    if (valid.length < 2) return '';
    const min = Math.min(...valid);
    const max = Math.max(...valid);
    const range = max - min || 1;
    const pad = 2;
    const step = (width - pad * 2) / (values.length - 1);
    let path = '';
    let pen = false;
    values.forEach((v, i) => {
      if (typeof v !== 'number' || !Number.isFinite(v)) { pen = false; return; }
      const x = (pad + i * step).toFixed(1);
      const y = (height - pad - ((v - min) / range) * (height - pad * 2)).toFixed(1);
      path += `${path ? ' ' : ''}${pen ? 'L' : 'M'} ${x},${y}`;
      pen = true;
    });
    return path;
  }

  function downsample(values, maxPoints = 120) {
    if (values.length <= maxPoints) return values.slice();
    const out = [];
    const step = values.length / maxPoints;
    for (let i = 0; i < maxPoints; i += 1) {
      const a = Math.floor(i * step);
      const b = Math.max(a + 1, Math.floor((i + 1) * step));
      out.push(mean(values.slice(a, b)));
    }
    return out;
  }

  function findSurge(id) {
    return Object.prototype.hasOwnProperty.call(SURGE_DEFINITIONS, id) ? SURGE_DEFINITIONS[id] : null;
  }

  // `years` is the list of year ranges the archive spans (yearRanges); without it only the fixed ranges are valid.
  function isValidRange(range, years) {
    return RANGES.includes(range) || (Array.isArray(years) && years.includes(range)) || Boolean(findSurge(range));
  }

  // Ranges end on the latest row and include their baseline day, so 1W spans 8 points and its
  // change is week over week. YTD's baseline is Dec 31 of the previous year (the year's opening
  // value); a surge's is the day before it starts, so the cards' net change and the chip agree.
  function getRangeBounds(range, firstDate, lastDate) {
    if (!firstDate || !lastDate) return null;
    const surge = findSurge(range);
    if (surge) {
      const base = addDays(surge.startDate, -1);
      const start = base > firstDate ? base : firstDate;
      const end = surge.endDate < lastDate ? surge.endDate : lastDate;
      return start <= end ? { start, end } : null;
    }
    let start;
    switch (range) {
      case '1W': start = addDays(lastDate, -7); break;
      case '1M': start = addMonths(lastDate, -1); break;
      case '3M': start = addMonths(lastDate, -3); break;
      case '6M': start = addMonths(lastDate, -6); break;
      case 'YTD': start = `${Number(lastDate.slice(0, 4)) - 1}-12-31`; break;
      case 'ALL': start = firstDate; break;
      default: {
        const m = /^(\d+)Y$/.exec(range || '');
        start = m ? addMonths(lastDate, -12 * Number(m[1])) : firstDate;
      }
    }
    if (start < firstDate) start = firstDate;
    return { start, end: lastDate };
  }

  // Prior period = an equal number of calendar days ending on the current window's baseline
  // day. Point i of the prior window is aligned with point i of the current one.
  function getPriorBounds(range, firstDate, lastDate) {
    if (range === 'ALL') return null;
    const cur = getRangeBounds(range, firstDate, lastDate);
    if (!cur) return null;
    const span = daysBetween(cur.start, cur.end);
    if (span < 1) return null;
    const end = cur.start;
    if (end <= firstDate) return null;
    const start = addDays(end, -span);
    return { start, end, span, truncated: start < firstDate };
  }

  function filterDataByRange(range, rows) {
    if (!Array.isArray(rows) || rows.length === 0) return [];
    const bounds = getRangeBounds(range, rows[0].date, rows[rows.length - 1].date);
    if (!bounds) return [];
    return rows.filter((r) => r.date >= bounds.start && r.date <= bounds.end);
  }

  function calculatePeriodComparison(range, rows) {
    if (!Array.isArray(rows) || rows.length === 0 || !rowsHaveDates(rows)) return null;
    const first = rows[0].date;
    const last = rows[rows.length - 1].date;
    const prior = getPriorBounds(range, first, last);
    if (!prior) return null;
    const current = getRangeBounds(range, first, last);
    const raw = rows.filter((r) => r.date >= prior.start && r.date <= prior.end);
    if (raw.length < 2) return null;
    const byDate = new Map(rows.map((r) => [r.date, r]));
    const dates = [];
    for (let n = isoToDayNum(current.start); n <= isoToDayNum(current.end); n += 1) {
      const p = dayNumToIso(n - prior.span);
      dates.push(p >= first ? p : null);
    }
    const valuesFor = (key) => dates.map((d) => (d ? metricValue(byDate.get(d), key) : null));
    return { start: prior.start, end: prior.end, span: prior.span, truncated: prior.truncated, current, dates, raw, valuesFor };
  }

  // Legacy shape (labels, series arrays, moving averages computed on the full archive then
  // cut to the range). The page itself runs on buildSeries; script.test.js exercises this.
  function processData(rows, range = 'ALL') {
    const sorted = [...(rows || [])].sort((a, b) => parseArchiveDate(a.date) - parseArchiveDate(b.date));
    const raw = filterDataByRange(range, sorted);
    const start = raw.length ? sorted.indexOf(raw[0]) : 0;
    const cut = (arr) => arr.slice(start, start + raw.length);
    return {
      labels: raw.map((d) => parseArchiveDate(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })),
      totalUsers: raw.map((d) => d.total),
      activeUsers: raw.map((d) => d.active),
      dailyTotalDeltas: calculateDailyDeltas(raw, 'total'),
      dailyActiveDeltas: calculateDailyDeltas(raw, 'active'),
      totalMA: cut(calculateMovingAverage(sorted, 'total')),
      activeMA: cut(calculateMovingAverage(sorted, 'active')),
      raw
    };
  }

  function getRangeLabel(range) {
    const surge = findSurge(range);
    if (surge) return surge.label;
    if (/^\d+Y$/.test(range) && !RANGE_LABELS[range]) {
      const years = Number(range.slice(0, -1));
      return years === 1 ? 'Past Year' : `Past ${years} Years`;
    }
    return RANGE_LABELS[range] || 'All Time';
  }

  function getTrendTag(range) {
    return findSurge(range) ? 'WINDOW' : (RANGE_TREND_TAGS[range] || range);
  }

  // The newest range-button years the archive spans: 1Y..nY while the cutoff is still inside the data.
  function yearRanges(firstDate, lastDate) {
    const out = [];
    if (!firstDate || !lastDate) return out;
    for (let y = 1; y <= 40; y += 1) {
      if (addMonths(lastDate, -12 * y) > firstDate) out.push(`${y}Y`);
      else break;
    }
    return out;
  }

  function parseHashState(hash, years) {
    const out = { ...DEFAULT_STATE };
    const params = new URLSearchParams(String(hash || '').replace(/^#/, ''));
    const r = (params.get('r') || '').toUpperCase();
    if (isValidRange(r, years)) out.range = r;
    [['ma', 'ma'], ['log', 'log'], ['cmp', 'cmp']].forEach(([param, key]) => {
      const v = params.get(param);
      if (v === '1' || v === '0') out[key] = v === '1';
    });
    const vm = params.get('vm');
    if (VELOCITY_MODES.includes(vm)) out.vm = vm;
    const vb = params.get('vb');
    if (BASE_MODES.includes(vb)) out.vb = vb;
    const rm = Object.keys(RATIO_HASH).find((k) => RATIO_HASH[k] === params.get('rm'));
    if (rm) out.rm = rm;
    const sm = Object.keys(SERVER_HASH).find((k) => SERVER_HASH[k] === params.get('sm'));
    if (sm) out.sm = sm;
    if (out.range === 'ALL') out.cmp = false;
    return out;
  }

  function serializeHashState(st) {
    const parts = [`r=${st.range}`, `ma=${st.ma ? 1 : 0}`, `log=${st.log ? 1 : 0}`, `cmp=${st.cmp ? 1 : 0}`];
    if (st.vm && st.vm !== DEFAULT_STATE.vm) parts.push(`vm=${st.vm}`);
    if (st.vm === 'pct' && st.vb && st.vb !== DEFAULT_STATE.vb) parts.push(`vb=${st.vb}`);
    if (st.rm && st.rm !== DEFAULT_STATE.rm) parts.push(`rm=${RATIO_HASH[st.rm]}`);
    if (st.sm && st.sm !== DEFAULT_STATE.sm) parts.push(`sm=${SERVER_HASH[st.sm]}`);
    return `#${parts.join('&')}`;
  }

  function csvCell(v) {
    if (v == null || (typeof v === 'number' && !Number.isFinite(v))) return '';
    let s;
    if (typeof v === 'number') s = Number.isInteger(v) ? String(v) : String(Number(v.toFixed(6)));
    else if (Array.isArray(v)) s = v.join('|');
    else s = String(v);
    return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  }

  function buildCSV(columns, rows) {
    const lines = [columns.map((c) => csvCell(c.header)).join(',')];
    rows.forEach((r) => { lines.push(columns.map((c) => csvCell(c.value(r))).join(',')); });
    return `${lines.join('\n')}\n`;
  }

  // One column per key, named like the dataset CSV (data/mastodon-daily.csv); flagged values are
  // blank. `statuses_at` is the reading time and `posts_per_day` the rate between readings
  // (computed over the rows given, so pass whole days).
  function buildChartCSV(rows, keys) {
    let rates = null;
    if (keys.includes('posts_per_day')) {
      const list = postsPerDay(rows);
      rates = new Map(rows.map((r, i) => [r, list[i]]));
    }
    const value = (r, k) => {
      if (k === 'flags') return r.flags || [];
      if (k === 'statuses_at') return READING_AT.test(r.statuses_at || '') && !isFlagged(r, 'statuses') ? r.statuses_at : null;
      if (k === 'posts_per_day') return rates.get(r);
      return metricValue(r, k);
    };
    const columns = [{ header: 'date', value: (r) => r.date }].concat(keys.map((k) => ({ header: k, value: (r) => value(r, k) })));
    return buildCSV(columns, rows);
  }

  // Percentage change of an average of a net-change series. Only meaningful while both averages
  // are positive and within a factor of 3 of each other; across zero, or from a tiny base, a
  // percentage says nothing (+743% from +12 to +743 a day), so callers show the absolute change.
  function netPctChange(from, to) {
    if (!(from > 0 && to > 0)) return null;
    const r = to / from;
    return r > 3 || r < 1 / 3 ? null : (r - 1) * 100;
  }

  // Index of the nearest usable value within `radius` days of idx (earlier day first on a tie), or -1.
  function nearestValidIndex(arr, idx, radius) {
    for (let d = 0; d <= radius; d += 1) {
      if (idx - d >= 0 && arr[idx - d] != null) return idx - d;
      if (idx + d < arr.length && arr[idx + d] != null) return idx + d;
    }
    return -1;
  }

  // Sum of the day-over-day changes that involve a flagged day between index i and j: a run of
  // flagged days contributes (value after the run) - (value before it) when both neighbours are
  // usable. A flagged step that stays is thereby taken out of a net change, while a flagged
  // excursion that reverts nets to about nothing either way.
  function flaggedStepSum(series, key, i, j) {
    const vals = series[key];
    const flag = FLAG_OF[key];
    const isFlaggedDay = (d) => vals[d] == null && !series.missing[d] && series.flags[d].includes(flag);
    let sum = 0;
    let d = i + 1;
    while (d < j) {
      if (isFlaggedDay(d)) {
        let e = d;
        while (e + 1 < j && isFlaggedDay(e + 1)) e += 1;
        const p = d - 1;
        const q = e + 1;
        if (p >= i && q <= j && vals[p] != null && vals[q] != null) sum += vals[q] - vals[p];
        d = e + 1;
      } else {
        d += 1;
      }
    }
    return sum;
  }

  // Net change of a level between two usable days with flagged steps excluded.
  function steppedChange(series, key, i, j) {
    return series[key][j] - series[key][i] - flaggedStepSum(series, key, i, j);
  }

  // Runs of calendar days with no archive row, longer than minDays: [{from, to, days}] where from
  // and to are the last reading before and the first after.
  function archiveGaps(series, minDays = 30) {
    const out = [];
    let i = 0;
    while (i < series.length) {
      if (series.missing[i]) {
        let j = i;
        while (j + 1 < series.length && series.missing[j + 1]) j += 1;
        if (j - i + 1 > minDays && i > 0 && j + 1 < series.length) out.push({ from: series.dates[i - 1], to: series.dates[j + 1], days: j - i + 1 });
        i = j + 1;
      } else {
        i += 1;
      }
    }
    return out;
  }

  const app = {
    data: null,
    s: null,
    pre: null,
    state: { ...DEFAULT_STATE },
    lastStdRange: DEFAULT_STATE.range,
    charts: {},
    colors: {},
    maCache: {},
    view: null,
    hover: { index: null, source: null },
    years: [],
    live: { reading: null, status: 'archive', timer: null, lastFetch: 0 }
  };

  function resetChartZoom(chartId, instances) {
    const chart = (instances || app.charts || {})[chartId];
    if (chart && typeof chart.resetZoom === 'function') chart.resetZoom();
  }

  function formatTimestamp(dateStr) {
    const isDateOnly = ISO_DAY.test(dateStr);
    const date = parseArchiveDate(dateStr);
    if (isDateOnly) return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const diffMs = Date.now() - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 30) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function formatTooltip(dateStr) {
    const date = parseArchiveDate(dateStr);
    if (ISO_DAY.test(dateStr)) {
      return `Newest archive record: ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
    }
    return `Newest archive record: ${date.toLocaleString()}`;
  }

  // ----- pre-render values: the text the page paints in its default view ------

  function latestIndex(arr) {
    return lastIndexWhere(arr, (x) => x != null);
  }

  function sentenceOfLatest(s, key, make, none) {
    const i = latestIndex(s[key]);
    return i >= 0 ? make(s[key][i], s.dates[i], i) : none;
  }

  // Keys for `data-prerender="KEY"` elements. `generated` (the build stamp) cannot be derived
  // from the archive, so the pre-render writes it and the page leaves it alone.
  function computePrerenderValues(rows, series) {
    const s = series || buildSeries(rows);
    const v = {};
    const last = s.length - 1;
    v['last-day'] = formatDay(last >= 0 ? s.dates[last] : null);
    const iT = latestIndex(s.total);
    v['total-users'] = formatInteger(iT >= 0 ? s.total[iT] : null);
    v['total-users-compact'] = formatCompact(iT >= 0 ? s.total[iT] : null);
    const iA = latestIndex(s.active);
    v.mau = formatCompact(iA >= 0 ? s.active[iA] : null);
    v['mau-full'] = formatInteger(iA >= 0 ? s.active[iA] : null);
    v['mau-day'] = iA >= 0 ? formatDay(s.dates[iA]) : '—';
    const iE = latestIndex(s.engagement);
    v.engagement = iE >= 0 ? calculateEngagementRatio(s.total[iE], s.active[iE]) : '—';
    const pA = argMax(s.active);
    v['mau-peak'] = formatCompact(pA >= 0 ? s.active[pA] : null);
    v['mau-peak-date'] = pA >= 0 ? formatDay(s.dates[pA]) : '—';
    const perDay = (arr) => {
      const m = mean(arr.slice(-7));
      return m == null ? '—' : `${formatSigned(m)}/day`;
    };
    v['mau-velocity-7d'] = perDay(s.net_active);
    v['mau-velocity-last'] = formatSigned(last >= 0 ? s.net_active[last] : null);
    const pV = argMax(s.net_active);
    v['mau-velocity-peak'] = formatSigned(pV >= 0 ? s.net_active[pV] : null);
    v['mau-velocity-peak-date'] = pV >= 0 ? formatDay(s.dates[pV]) : '—';
    v['signups-7d'] = perDay(s.net_total);
    v['signups-last'] = formatSigned(last >= 0 ? s.net_total[last] : null);
    const pS = argMax(s.net_total);
    v['signups-peak'] = formatSigned(pS >= 0 ? s.net_total[pS] : null);
    v['signups-peak-date'] = pS >= 0 ? formatDay(s.dates[pS]) : '—';
    const iS = latestIndex(s.servers);
    v.servers = formatInteger(iS >= 0 ? s.servers[iS] : null);
    v['servers-sentence'] = sentenceOfLatest(s, 'servers',
      (n, d) => `joinmastodon.org counted ${formatInteger(n)} servers on ${formatDay(d)}.`,
      'Server counts start with the next daily update.');
    v['posts-sentence'] = sentenceOfLatest(s, 'posts',
      (n, d) => `The latest rate is about ${formatCompact(n)} posts a day, from the reading stored for ${formatDay(d)}.`,
      'The first figure appears once two daily readings exist.');
    const iSv = s.servers.findIndex((x) => x != null);
    v['servers-history-sentence'] = iSv >= 0
      ? `The server series starts on ${formatDay(s.dates[iSv])}.`
      : 'The server series starts with the next daily update.';
    v['fedidb-sentence'] = sentenceOfLatest(s, 'fedi_users',
      (n, d, i) => `FediDB crawls Mastodon-software servers on its own and counted ${formatCompact(n)} accounts in its reading for ${formatDay(d)}${s.statuses_at[i] ? ` (taken ${formatUtcStamp(s.statuses_at[i])})` : ''}; the two totals are different bases and are never mixed on this page.`,
      'FediDB also counts Mastodon-software servers on its own; its totals are a different base and are never mixed with these figures.');
    v['first-day'] = formatDay(s.length ? s.dates[0] : null);
    const bounds = s.length ? getRangeBounds(DEFAULT_STATE.range, s.dates[0], s.dates[last]) : null;
    v['range-dates'] = bounds ? `${formatDay(bounds.start)} → ${formatDay(bounds.end)} · ${daysBetween(bounds.start, bounds.end) + 1} pts` : '—';
    const gaps = archiveGaps(s).sort((a, b) => b.days - a.days).slice(0, 3);
    const span = (g) => `${formatDay(g.from)} and ${formatDay(g.to)}`;
    v['gaps-sentence'] = !gaps.length ? ''
      : (gaps.length === 1
        ? `The longest stretch without readings lies between ${span(gaps[0])}.`
        : `The longest stretches without readings lie between ${gaps.map(span).join('; ')}.`);
    SURGE_IDS.forEach((id) => { v[surgeKey(id)] = surgeChipValue(SURGE_DEFINITIONS[id], s); });
    return v;
  }

  function computeTickerItems(rows, series) {
    const s = series || buildSeries(rows);
    const pre = computePrerenderValues(rows, s);
    // Week over week change of the 7-day average. Net-change series (`net`) show a percentage only
    // where it means something (netPctChange) and the absolute change per day otherwise.
    const item = (key, sym, value, metric, net) => {
      const ma = movingAverage(s[metric]);
      const idx = lastIndexWhere(ma, (x) => x != null);
      const base = idx >= 7 ? ma[idx - 7] : null;
      const cur = idx >= 0 ? ma[idx] : null;
      if (base == null || cur == null) return { key, sym, value, chg: null };
      if (!net) return { key, sym, value, chg: pctChange(base, cur) };
      const chg = netPctChange(base, cur);
      return chg != null ? { key, sym, value, chg } : { key, sym, value, chg: null, delta: cur - base, base, cur };
    };
    const iP = latestIndex(s.posts);
    return [
      item('mau', 'MAU', pre.mau, 'active'),
      item('users', 'USERS', pre['total-users'], 'total'),
      item('mauvel', 'MAU/DAY 7D', pre['mau-velocity-7d'], 'net_active', true),
      item('signups', 'NET/DAY 7D', pre['signups-7d'], 'net_total', true),
      item('engagement', 'ENGAGEMENT', pre.engagement, 'engagement'),
      item('servers', 'SERVERS', pre.servers, 'servers'),
      item('posts', 'POSTS/DAY', formatCompact(iP >= 0 ? s.posts[iP] : null), 'posts')
    ].filter((it) => it.value !== '—' && it.value !== '—/day');
  }

  function trendClass(x) {
    if (x == null) return 'flat';
    if (x > 0) return 'up';
    if (x < 0) return 'down';
    return 'flat';
  }

  // A change of 1,000% or more reads better as a multiple (×12.3, ×4,432), e.g. ALL-range
  // trends that start from a small 2022 base.
  function formatChange(pct, digits = 2) {
    if (typeof pct !== 'number' || !Number.isFinite(pct)) return '—';
    if (pct < 1000) return formatSignedPct(pct, digits);
    const m = 1 + pct / 100;
    return `×${m >= 100 ? formatInteger(m) : m.toFixed(1)}`;
  }

  function trendArrow(x) {
    if (x == null || x === 0) return '■';
    return x > 0 ? '▲' : '▼';
  }

  function buildTickerHTML(items) {
    return items.map((it) => {
      const absolute = it.chg == null && isNum(it.delta);
      const basis = absolute ? it.delta : it.chg;
      const text = absolute ? `${formatSigned(it.delta)}/day` : formatSignedPct(it.chg);
      const title = absolute && isNum(it.cur) && isNum(it.base)
        ? ` title="${escapeHtml(`7-day average ${formatSigned(it.cur)}/day against ${formatSigned(it.base)}/day a week earlier`)}"` : '';
      return `<li class="tick" data-tick="${escapeHtml(it.key)}"><span class="tick-sym">${escapeHtml(it.sym)}</span>`
        + `<span class="tick-val">${escapeHtml(it.value)}</span>`
        + `<span class="tick-chg ${trendClass(basis)}"${title}><span aria-hidden="true">${trendArrow(basis)}</span> ${escapeHtml(text)}</span></li>`;
    }).join('\n');
  }

  function buildMilestoneRows(rows, series) {
    const s = series || buildSeries(rows);
    const ma = movingAverage(s.net_total);
    const lastDate = s.dates[s.length - 1];
    const list = MILESTONES.filter((m) => m.date <= lastDate).map((m) => ({ ...m, current: false }));
    list.push({ date: lastDate, context: 'Latest day in the archive', current: true });
    return list.map((m) => {
      const i = seriesIndexOf(s, m.date);
      return {
        date: m.date,
        dateLabel: formatDay(m.date),
        total: formatInteger(i >= 0 ? s.total[i] : null),
        mau: formatInteger(i >= 0 ? s.active[i] : null),
        net: formatSigned(i >= 0 ? ma[i] : null),
        engagement: formatPct(i >= 0 ? s.engagement[i] : null, 2),
        context: m.context,
        highlight: Boolean(m.highlight),
        current: m.current
      };
    });
  }

  function buildMilestoneRowsHTML(rows, series) {
    return buildMilestoneRows(rows, series).map((r) => {
      const cls = r.current ? ' class="current-row"' : (r.highlight ? ' class="highlight-row"' : '');
      return `<tr${cls}><td><strong>${escapeHtml(r.dateLabel)}</strong></td>`
        + `<td class="num">${escapeHtml(r.total)}</td><td class="num">${escapeHtml(r.mau)}</td>`
        + `<td class="num">${escapeHtml(r.net)}</td><td class="num">${escapeHtml(r.engagement)}</td>`
        + `<td>${escapeHtml(r.context)}</td></tr>`;
    }).join('\n');
  }

  // FediDB totals strip: the newest reading of each figure, parts without data left out.
  function buildIndexStripHTML(rows, series) {
    const s = series || buildSeries(rows);
    const parts = [
      ['SERVERS', 'fedi_instances', formatInteger, 'Mastodon-software servers FediDB knows about'],
      ['POSTS', 'statuses', formatCompact, 'All-time posts (statuses) on those servers'],
      ['USERS', 'fedi_users', formatCompact, 'Accounts on those servers']
    ];
    const out = [];
    parts.forEach(([label, key, fmt, what]) => {
      const i = latestIndex(s[key]);
      if (i < 0) return;
      const taken = s.statuses_at[i] ? `, taken ${formatUtcStamp(s.statuses_at[i])}` : '';
      const title = `${what}: ${formatInteger(s[key][i])} (FediDB reading stored for ${formatDay(s.dates[i])}${taken})`;
      out.push(`<div class="index-stat"><dt>${label}</dt><dd class="tabular-stat" title="${escapeHtml(title)}">${escapeHtml(fmt(s[key][i]))}</dd></div>`);
    });
    if (!out.length) {
      return '<div class="index-stat index-empty"><dt>STATUS</dt><dd>Collecting — first FediDB reading after the next daily run.</dd></div>';
    }
    return out.join('\n');
  }

  function surgeKey(id) {
    return `surge-${id.replace(/^SURGE_/, '').toLowerCase().replace(/_/g, '-')}`;
  }

  function computeSurgeStats(surge, series) {
    const bounds = getRangeBounds(surge.id, series.dates[0], series.dates[series.length - 1]);
    if (!bounds) return null;
    const startIdx = seriesIndexOf(series, bounds.start);
    const end = seriesIndexOf(series, bounds.end);
    if (startIdx < 0 || end < 0 || end <= startIdx) return null;
    // Net change between the baseline (the nearest usable day within a week of the window start)
    // and the last usable day, with flagged steps excluded.
    const change = (key) => {
      const arr = series[key];
      let i = nearestValidIndex(arr, startIdx, 7);
      if (i < 0) for (let k = startIdx + 1; k <= end; k += 1) if (arr[k] != null) { i = k; break; }
      let j = -1;
      for (let k = end; k > startIdx; k -= 1) if (arr[k] != null) { j = k; break; }
      return i >= 0 && j > i ? steppedChange(series, key, i, j) : null;
    };
    let flaggedDays = 0;
    for (let i = startIdx; i <= end; i += 1) if (series.flags[i].includes('total') || series.flags[i].includes('active')) flaggedDays += 1;
    let peak = -1;
    for (let i = startIdx + 1; i <= end; i += 1) {
      if (series.net_total[i] != null && (peak < 0 || series.net_total[i] > series.net_total[peak])) peak = i;
    }
    // The largest one-day rise and fall in the raw rows, flagged or not: what the flags are about.
    let rawRise = null;
    let rawFall = null;
    for (let i = startIdx + 1; i <= end; i += 1) {
      const cur = num(series.rows[i].total);
      const prev = num(series.rows[i - 1].total);
      if (cur == null || prev == null) continue;
      const ca = num(series.rows[i].active);
      const pa = num(series.rows[i - 1].active);
      const move = { date: series.dates[i], total: cur - prev, active: ca != null && pa != null ? ca - pa : null };
      if (move.total > 0 && (!rawRise || move.total > rawRise.total)) rawRise = move;
    }
    // The reversal: the biggest one-day fall in the 60 days after that rise (it can land after the window).
    if (rawRise) {
      const r0 = seriesIndexOf(series, rawRise.date);
      for (let i = r0 + 1; i <= Math.min(series.length - 1, r0 + 60); i += 1) {
        const cur = num(series.rows[i].total);
        const prev = num(series.rows[i - 1].total);
        if (cur == null || prev == null || cur - prev >= 0) continue;
        if (!rawFall || cur - prev < rawFall.total) {
          const ca = num(series.rows[i].active);
          const pa = num(series.rows[i - 1].active);
          rawFall = { date: series.dates[i], total: cur - prev, active: ca != null && pa != null ? ca - pa : null };
        }
      }
    }
    return {
      net: change('total'),
      netMau: change('active'),
      flaggedDays,
      rawRise,
      rawFall,
      peakDate: peak >= 0 ? series.dates[peak] : null,
      peakValue: peak >= 0 ? series.net_total[peak] : null
    };
  }

  // Chip text: the net change in total users, or FLAGGED for a window that is a reporting step.
  function surgeChipValue(surge, series) {
    if (surge.artifact) return 'FLAGGED';
    const st = series.length ? computeSurgeStats(surge, series) : null;
    return st && st.net != null ? formatSigned(st.net) : '—';
  }

  // The joinmastodon statistics API returns the last ~30 days as strings. Returns the entries
  // with usable numbers (plain digit strings only), newest first.
  function parseLiveStats(json) {
    if (!Array.isArray(json)) return [];
    const digits = (v) => (typeof v === 'string' || typeof v === 'number') && /^\d{1,15}$/.test(String(v)) ? Number(v) : null;
    const out = [];
    for (const e of json) {
      if (!e || typeof e.period !== 'string' || !ISO_DAY.test(e.period)) continue;
      const users = digits(e.user_count);
      const mau = digits(e.active_user_count);
      const servers = digits(e.server_count);
      if (users == null || users <= 0 || mau == null || mau <= 0) continue;
      out.push({ period: e.period, users, mau, servers: servers != null && servers > 0 ? servers : null });
    }
    return out.sort((a, b) => (a.period < b.period ? 1 : -1));
  }

  function latestUsable(rows, key) {
    for (let i = rows.length - 1; i >= 0; i -= 1) {
      const v = metricValue(rows[i], key);
      if (v != null && ISO_DAY.test(rows[i].date)) return { value: v, date: rows[i].date };
    }
    return null;
  }

  // A live reading must never read as a drop that is only a partial day. An entry for a complete
  // UTC day (before `today`) and no older than the archive must be within a band of the archive's
  // newest total; the entry for the day in progress is accepted only if it is not below the
  // archive's total or (within 3%) MAU. MAU of any entry is range-checked against the archive's.
  function acceptLiveStats(reading, rows, today) {
    if (!reading || !Array.isArray(rows) || !rows.length) return false;
    const day = today || new Date().toISOString().slice(0, 10);
    const t = latestUsable(rows, 'total');
    const m = latestUsable(rows, 'active');
    if (!t || !m) return false;
    if (reading.period < t.date || reading.period > day) return false;
    if (!(reading.mau >= m.value * 0.5 && reading.mau <= m.value * 2)) return false;
    if (reading.period < day) return reading.users >= t.value * 0.97 && reading.users <= t.value * 1.1;
    return reading.users >= t.value && reading.users <= t.value * 1.1 && reading.mau >= m.value * 0.97;
  }

  // The newest entry is usually the UTC day in progress, whose partial aggregate is tiny (52
  // users early in the day): take the newest entry that passes.
  function pickLiveReading(entries, rows, today) {
    return (entries || []).find((e) => acceptLiveStats(e, rows, today)) || null;
  }

  // Rewrites the FAQPage answers of a JSON-LD object from the visible FAQ ([{question, answer}]).
  // Returns true when the object changed.
  function syncFaqJsonLd(ld, faq) {
    if (!ld || !Array.isArray(faq) || !faq.length) return false;
    const graph = Array.isArray(ld['@graph']) ? ld['@graph'] : [ld];
    const node = graph.find((n) => n && n['@type'] === 'FAQPage');
    if (!node) return false;
    const next = faq.map((f) => ({ '@type': 'Question', name: f.question, acceptedAnswer: { '@type': 'Answer', text: f.answer } }));
    if (JSON.stringify(node.mainEntity) === JSON.stringify(next)) return false;
    node.mainEntity = next;
    return true;
  }

  function formatAxisCompact(v) {
    if (typeof v !== 'number' || !Number.isFinite(v)) return '';
    const a = Math.abs(v);
    const sign = v < 0 ? '-' : '';
    const trim = (x) => String(Number(x.toFixed(2)));
    if (a >= 1e9) return `${sign}${trim(a / 1e9)}B`;
    if (a >= 1e6) return `${sign}${trim(a / 1e6)}M`;
    if (a >= 1e3) return `${sign}${trim(a / 1e3)}K`;
    return `${sign}${trim(a)}`;
  }

  const TICK_LEVELS = [
    { kind: 'week', test: (d) => new Date(`${d}T00:00:00Z`).getUTCDay() === 1 },
    { kind: 'semimonth', test: (d) => d.endsWith('-01') || d.endsWith('-15') },
    { kind: 'month', test: (d) => d.endsWith('-01') },
    { kind: 'quarter', test: (d) => /-(01|04|07|10)-01$/.test(d) },
    { kind: 'half', test: (d) => /-(01|07)-01$/.test(d) },
    { kind: 'year', test: (d) => d.endsWith('-01-01') }
  ];

  // Picks x-axis ticks on calendar boundaries (days, Mondays, month starts, quarters,
  // years) so labels never repeat, using the finest level that fits `maxLabels`.
  function pickDateTicks(dates, lo, hi, maxLabels) {
    const n = hi - lo + 1;
    const max = Math.max(2, maxLabels);
    if (n <= 0) return { kind: 'day', indices: [] };
    const step = Math.ceil(n / max);
    if (step < 7) {
      const indices = [];
      for (let i = hi; i >= lo; i -= step) indices.unshift(i);
      return { kind: 'day', indices };
    }
    for (const level of TICK_LEVELS) {
      const indices = [];
      for (let i = lo; i <= hi; i += 1) if (level.test(dates[i])) indices.push(i);
      if (indices.length <= max && (indices.length >= 2 || level.kind === 'year')) return { kind: level.kind, indices };
    }
    const years = [];
    for (let i = lo; i <= hi; i += 1) if (dates[i].endsWith('-01-01')) years.push(i);
    const k = Math.ceil(years.length / max);
    return { kind: 'year', indices: years.filter((_, j) => j % k === 0) };
  }

  function formatDateTick(iso, kind) {
    const m = ISO_DAY.exec(iso || '');
    if (!m) return '';
    const mon = MONTHS[Number(m[2]) - 1];
    if (kind === 'year') return m[1];
    if (kind === 'month' || kind === 'quarter' || kind === 'half') return `${mon} ’${m[1].slice(2)}`;
    return `${mon} ${Number(m[3])}`;
  }

  // Round, evenly spaced values in [min, max]: 1-2-2.5-5 steps, at most maxTicks of them.
  function linearTicks(min, max, maxTicks = 5) {
    if (!(max > min)) return [];
    const raw = (max - min) / Math.max(1, maxTicks - 1);
    const mag = 10 ** Math.floor(Math.log10(raw));
    const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((x) => x >= raw * (1 - 1e-9));
    const out = [];
    for (let k = Math.ceil(min / step - 1e-9); k * step <= max * (1 + 1e-12); k += 1) out.push(Number((k * step).toPrecision(12)));
    return out;
  }

  // Log-axis ticks on a 1-2-5 ladder; falls back to every integer mantissa when the data
  // spans less than about half a decade. Below a 3x span a log axis is nearly linear, so it
  // gets evenly spaced round values instead.
  function logTicks(min, max, maxTicks = 7) {
    if (!(min > 0) || !(max > min)) return [];
    if (max / min < 3) return linearTicks(min, max, Math.min(maxTicks, 5));
    const lo = Math.floor(Math.log10(min));
    const hi = Math.ceil(Math.log10(max));
    const pick = (mantissas) => {
      const out = [];
      for (let e = lo; e <= hi; e += 1) mantissas.forEach((m) => { const v = m * 10 ** e; if (v >= min * 0.999 && v <= max * 1.001) out.push(Number(v.toPrecision(12))); });
      return out;
    };
    for (const set of [[1], [1, 3], [1, 2, 5], [1, 2, 3, 5, 7], [1, 2, 3, 4, 5, 6, 7, 8, 9]]) {
      const t = pick(set);
      if (t.length >= 3 && t.length <= maxTicks) return t;
      if (t.length > maxTicks) {
        const k = Math.ceil(t.length / maxTicks);
        return t.filter((_, i) => i % k === 0);
      }
    }
    const fine = pick([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    if (fine.length >= 2) return fine;
    const spread = [min, Math.sqrt(min * max), max].map((v) => Number(v.toPrecision(2))).filter((v) => v >= min * 0.999 && v <= max * 1.001);
    return [...new Set(spread)];
  }

  // Message for a metric with fewer than two usable points in view.
  function collectingText(values, dates) {
    const first = values.findIndex((x) => x != null);
    if (first < 0) return 'Collecting — first data after the next daily run.';
    const count = values.reduce((n, x) => n + (x != null ? 1 : 0), 0);
    if (count < 2) return `Collecting — history starts ${formatDay(dates[first])}.`;
    return `No usable points in this range — history starts ${formatDay(dates[first])}.`;
  }

  // Enables or disables the COMPARE button for the selected range (no-op without a DOM).
  function updateComparisonButtonState() {
    const doc = root.document;
    const btn = doc && doc.getElementById('toggle-compare-btn');
    if (!btn) return;
    const st = app.state;
    const unavailable = st.range === 'ALL';
    btn.classList.toggle('active', st.cmp);
    btn.setAttribute('aria-pressed', String(st.cmp));
    btn.classList.toggle('range-unsupported', unavailable);
    btn.title = unavailable
      ? 'Compare needs an earlier window: pressing it switches ALL to 1Y (C)'
      : 'Overlay the prior period: the same number of days immediately before this range (C)';
  }

  const pure = {
    RANGES, SURGE_DEFINITIONS, SURGE_IDS, MILESTONES, DEFAULT_STATE, VELOCITY_MODES, RATIO_MODES, SERVER_MODES,
    formatInteger, formatCompact, formatSigned, formatPct, formatSignedPct, formatDay, formatUtcStamp,
    isoToDayNum, dayNumToIso, addDays, addMonths, daysBetween, parseArchiveDate, escapeHtml,
    mean, pctChange, metricValue, normalizeDays, buildSeries, seriesIndexOf, movingAverage, dailyDeltas,
    calculateMovingAverage, calculateDailyDeltas, calculateGrowthVelocity, calculateEngagementRatio,
    generateSparklineSVG, downsample, findSurge, isValidRange, getRangeBounds, getPriorBounds, yearRanges,
    filterDataByRange, calculatePeriodComparison, processData, getRangeLabel, getTrendTag, parseHashState,
    serializeHashState, csvCell, buildCSV, buildChartCSV, resetChartZoom, formatTimestamp, formatTooltip,
    postsPerDay, readingTime, computePrerenderValues, computeTickerItems, buildTickerHTML, buildMilestoneRows, buildMilestoneRowsHTML,
    buildIndexStripHTML, computeSurgeStats, parseLiveStats, acceptLiveStats, pickLiveReading, syncFaqJsonLd, trendClass,
    formatChange, formatAxisCompact, pickDateTicks, formatDateTick, logTicks, linearTicks, collectingText,
    netPctChange, nearestValidIndex, flaggedStepSum, steppedChange, archiveGaps, surgeChipValue, surgeKey,
    updateComparisonButtonState
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = pure;
    return;
  }

  // ---------------------------------------------------------------------------
  // Browser layer
  // ---------------------------------------------------------------------------
  const doc = root.document;
  const $ = (sel, ctx) => (ctx || doc).querySelector(sel);
  const $$ = (sel, ctx) => Array.from((ctx || doc).querySelectorAll(sel));
  const reducedMotion = () => Boolean(root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches);

  function ma(key) {
    if (!app.maCache[key]) app.maCache[key] = movingAverage(app.s[key]);
    return app.maCache[key];
  }

  function cssVar(name, fallback) {
    const v = root.getComputedStyle(doc.documentElement).getPropertyValue(name).trim();
    return v || fallback;
  }

  function hexToRgba(hex, alpha) {
    const m = /^#?([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(hex.trim());
    if (!m) return hex;
    return `rgba(${parseInt(m[1], 16)}, ${parseInt(m[2], 16)}, ${parseInt(m[3], 16)}, ${alpha})`;
  }

  function setText(el, text) {
    if (el && el.textContent !== text) el.textContent = text;
  }

  function readColors() {
    app.colors = {
      total: cssVar('--series-total', '#FFB000'),
      active: cssVar('--series-active', '#0D97FF'),
      servers: cssVar('--series-servers', '#17A8A9'),
      posts: cssVar('--series-posts', '#D00ACA'),
      perserver: cssVar('--series-perserver', '#9F73FF'),
      fedi: cssVar('--series-fedi', '#E86904'),
      ma: cssVar('--series-ma', '#F0F4F8'),
      prior: cssVar('--series-prior', '#D97706'),
      gain: cssVar('--color-gain', '#00D26A'),
      loss: cssVar('--color-loss', '#F83F55'),
      grid: cssVar('--chart-grid', 'rgba(255,255,255,0.06)'),
      text: cssVar('--text-secondary', '#9BA3AF'),
      muted: cssVar('--text-muted', '#838D9C'),
      primary: cssVar('--text-primary', '#F0F4F8'),
      surface: cssVar('--bg-surface', '#0F131A'),
      canvas: cssVar('--bg-canvas', '#080A0E'),
      band: cssVar('--chart-outage-band', 'rgba(248, 63, 85, 0.10)'),
      ink: cssVar('--text-inverse', '#080A0E')
    };
    const c = app.colors;
    Object.assign(c, {
      net_active: c.active, net_total: c.total, growth_mau: c.active, growth_signups: c.total,
      fedi_users: c.fedi, fedi_instances: c.fedi,
      engagement: c.active, posts_per_mau: c.posts, users_per_server: c.perserver
    });
  }

  // ---------------- view model ----------------

  function computeView() {
    const s = app.s;
    const first = s.dates[0];
    const last = s.dates[s.length - 1];
    let bounds = getRangeBounds(app.state.range, first, last);
    if (!bounds) {
      app.state.range = DEFAULT_STATE.range;
      bounds = getRangeBounds(app.state.range, first, last);
    }
    const startIdx = seriesIndexOf(s, bounds.start);
    const endIdx = seriesIndexOf(s, bounds.end);
    const prior = app.state.cmp ? getPriorBounds(app.state.range, first, last) : null;
    app.view = { bounds, startIdx, endIdx, length: endIdx - startIdx + 1, prior, surge: findSurge(app.state.range) };
    return app.view;
  }

  function slice(arr) {
    return arr.slice(app.view.startIdx, app.view.endIdx + 1);
  }

  function priorSlice(arr) {
    const v = app.view;
    if (!v.prior) return null;
    const out = [];
    for (let i = v.startIdx; i <= v.endIdx; i += 1) {
      const j = i - v.prior.span;
      out.push(j >= 0 ? arr[j] : null);
    }
    return out;
  }

  function firstValidIn(arr, a, b) {
    for (let i = a; i <= b; i += 1) if (arr[i] != null) return i;
    return -1;
  }

  function lastValidIn(arr, a, b) {
    for (let i = b; i >= a; i -= 1) if (arr[i] != null) return i;
    return -1;
  }

  function countValid(arr) {
    let n = 0;
    for (const v of arr) if (v != null) n += 1;
    return n;
  }

  const LEVEL_KEYS = ['total', 'active', 'servers'];

  // Trend of a 7-day average between the first and last usable points in a range. Level series
  // (users, MAU, servers) exclude flagged steps that sit between the two points (`steps`). For
  // net-change series a percentage is only shown where it means something (netPctChange); the
  // absolute change per day is returned as `abs` otherwise.
  function maTrend(key, a, b, mode) {
    const series = ma(key);
    const i = firstValidIn(series, a, b);
    const j = lastValidIn(series, a, b);
    if (i < 0 || j < 0 || i === j) return null;
    const net = key.startsWith('net_');
    const steps = LEVEL_KEYS.includes(key) ? flaggedStepSum(app.s, key, i, j) : 0;
    let value;
    if (mode === 'pp') value = series[j] - series[i];
    else if (net) value = netPctChange(series[i], series[j]);
    else value = pctChange(series[i], series[j] - steps);
    return {
      value, steps, abs: net && value == null ? series[j] - series[i] : null,
      from: series[i], to: series[j], fromDate: app.s.dates[i], toDate: app.s.dates[j]
    };
  }

  function windowMean(key, a, b) {
    return mean(app.s[key].slice(Math.max(0, a), b + 1));
  }

  // The velocity panel shows one metric: MAU change, net signups, or the percentage growth of either.
  function velocityMetric() {
    const st = app.state;
    if (st.vm === 'pct') return st.vb === 'signups' ? 'growth_signups' : 'growth_mau';
    return st.vm === 'signups' ? 'net_total' : 'net_active';
  }

  // ---------------- prerender + static blocks ----------------

  function paintPrerender() {
    $$('[data-prerender]').forEach((el) => {
      const key = el.getAttribute('data-prerender');
      if (Object.prototype.hasOwnProperty.call(app.pre, key) && el.childElementCount === 0) setText(el, app.pre[key]);
    });
  }

  // Block ends and <br> become spaces; aria-hidden decorations are dropped from the question
  // (same rules as the pre-render's FAQ extraction).
  function faqText(nodes, skipDecor) {
    let out = '';
    const walk = (n) => {
      if (n.nodeType === 3) { out += n.data; return; }
      if (n.nodeType !== 1 || /^(SCRIPT|STYLE)$/.test(n.tagName)) return;
      if (skipDecor && (n.getAttribute('aria-hidden') === 'true' || n.classList.contains('faq-arrow'))) return;
      if (n.tagName === 'BR') { out += ' '; return; }
      n.childNodes.forEach(walk);
      if (/^(P|LI|DIV|H[1-6])$/.test(n.tagName)) out += ' ';
    };
    nodes.forEach(walk);
    return out.replace(/\s+/g, ' ').trim();
  }

  // The JSON-LD is written by the pre-render; the visible FAQ numbers are repainted here from
  // the archive. When index.html and the archive come from different builds, mirror the painted
  // FAQ back into it so crawlers that run JavaScript see matching text.
  function syncJsonLd() {
    const el = $('#jsonld');
    if (!el) return;
    let ld;
    try { ld = JSON.parse(el.textContent); } catch (e) { return; }
    const faq = $$('details[class*="faq"]').map((d) => {
      const sum = $('summary', d);
      if (!sum) return null;
      return {
        question: faqText([...sum.childNodes], true),
        answer: faqText([...d.childNodes].filter((n) => n !== sum), false)
      };
    }).filter((f) => f && f.question && f.answer);
    if (syncFaqJsonLd(ld, faq)) el.textContent = JSON.stringify(ld, null, 2);
  }

  function renderTicker() {
    const list = $('#ticker-items');
    if (!list) return;
    const html = buildTickerHTML(computeTickerItems(app.data, app.s));
    renderBlock('#ticker-items', html);
    const clone = $('#ticker-clone');
    if (clone) clone.innerHTML = html;
  }

  function renderBlock(selector, html) {
    const body = $(selector);
    if (!body) return;
    const norm = (x) => x.replace(/\s+/g, ' ').replace(/> </g, '><').trim();
    const current = body.innerHTML.replace(/<!--[\s\S]*?-->/g, '');
    if (norm(current) !== norm(html)) body.innerHTML = html;
  }

  function renderMilestones() {
    renderBlock('#milestones-body', buildMilestoneRowsHTML(app.data, app.s));
  }

  function renderStrip() {
    renderBlock('#strip-stats', buildIndexStripHTML(app.data, app.s));
  }

  // 'largest one-day rise +934.0K users on Feb 8, 2024 (MAU +38.8K), largest fall -1.03M on Feb 12, 2024 (MAU -40.8K)'
  function rawMoves(st) {
    const one = (label, m) => (m ? `${label} ${formatSigned(m.total)} users on ${formatDay(m.date)}${m.active != null ? ` (monthly active users ${formatSigned(m.active)})` : ''}` : null);
    return [one('largest one-day rise', st.rawRise), one('largest one-day fall after it', st.rawFall)].filter(Boolean).join(', ');
  }

  function renderSurgeChips() {
    SURGE_IDS.forEach((id) => {
      const surge = SURGE_DEFINITIONS[id];
      const chip = $(`.surge-chip[data-surge="${id}"]`);
      if (!chip) return;
      const st = computeSurgeStats(surge, app.s);
      const val = $('.chip-val', chip);
      chip.classList.toggle('artifact', Boolean(surge.artifact));
      setText(val, surgeChipValue(surge, app.s));
      if (!st) return;
      const raw = rawMoves(st);
      const rawText = raw ? ` Raw archive: ${raw}.` : '';
      if (surge.artifact) {
        chip.title = `${surge.title}: ${surge.description}${rawText} ${st.flaggedDays} days in this window are flagged.`;
        chip.setAttribute('aria-label', `${surge.title}, flagged reporting step, not sign-ups. Filter all charts to this window.`);
      } else if (st.net != null) {
        const parts = [`${surge.title}: ${formatSigned(st.net)} total users`];
        if (st.netMau != null) parts.push(`${formatSigned(st.netMau)} monthly active users`);
        const peak = st.peakDate ? ` Largest single usable day ${formatSigned(st.peakValue)} on ${formatDay(st.peakDate)}.` : '';
        chip.title = `${parts.join(', ')} from the close of ${formatDay(addDays(surge.startDate, -1))} to ${formatDay(surge.endDate)}, flagged steps excluded.${peak} ${surge.description}`;
        chip.setAttribute('aria-label', `${surge.title}: ${formatSigned(st.net, false)} total users. Filter all charts to this window.`);
      }
    });
  }

  // ---------------- KPI cards ----------------

  // `t` is a maTrend result (or null). A net-change series without a meaningful percentage
  // shows its absolute change per day instead.
  function trendBadge(el, t, unit, tag, title) {
    if (!el) return;
    const value = t ? t.value : null;
    const absolute = value == null && t && t.abs != null;
    const basis = absolute ? t.abs : value;
    el.className = `trend ${trendClass(basis)}`;
    let text = '—';
    if (absolute) text = `${formatSigned(t.abs)}/day`;
    else if (value != null) text = unit === 'pp' ? `${value < 0 ? '-' : '+'}${Math.abs(value).toFixed(2)}pp` : formatChange(value);
    el.innerHTML = `<span aria-hidden="true">${trendArrow(basis)}</span> ${escapeHtml(text)} <span class="trend-tag">${escapeHtml(tag)}</span>`;
    if (title) el.title = title;
  }

  function setSpark(id, values) {
    const path = $(`#${id} path`);
    if (path) path.setAttribute('d', generateSparklineSVG(downsample(values, 120)));
  }

  // `since`: the first date the metric has data. A prior period that starts earlier covers
  // fewer days than the current one, so it is labelled PARTIAL.
  function priorLine(el, text, value, unit, title, since) {
    if (!el) return;
    el.hidden = !app.state.cmp;
    if (!app.state.cmp) return;
    if (!app.view.prior) {
      el.className = 'comparison prior-line';
      el.textContent = app.state.range === 'ALL' ? 'Prior period unavailable for ALL' : 'Prior period unavailable (no earlier data)';
      el.removeAttribute('title');
      return;
    }
    const partial = app.view.prior.start < (since || app.s.dates[0]);
    el.className = `comparison prior-line ${value == null ? '' : (value >= 0 ? 'comp-up' : 'comp-down')}`;
    const fmt = { pp: (x) => `${x < 0 ? '-' : '+'}${Math.abs(x).toFixed(2)}pp`, abs: (x) => formatSigned(x), day: (x) => `${formatSigned(x)}/day` }[unit] || ((x) => formatChange(x, 1));
    const delta = value == null ? '' : ` ${trendArrow(value)} ${fmt(value)}`;
    el.textContent = `${text}${partial ? ' (PARTIAL)' : ''}${delta}`;
    if (title) el.title = partial ? `${title}. The prior period starts before this data begins (${formatDay(since || app.s.dates[0])}), so it covers fewer days.` : title;
  }

  function firstDateOf(key) {
    const i = app.s[key].findIndex((x) => x != null);
    return i >= 0 ? app.s.dates[i] : null;
  }

  function updateCards() {
    const s = app.s;
    const v = app.view;
    const a = v.startIdx;
    const b = v.endIdx;
    const tag = getTrendTag(app.state.range);
    const rangeTxt = `${formatDay(v.bounds.start)} → ${formatDay(v.bounds.end)}`;
    const pr = v.prior;
    const pa = pr ? Math.max(0, a - pr.span) : 0;
    const pb = pr ? a : 0;
    const priorTxt = pr ? `${formatDay(pr.start)} → ${formatDay(pr.end)}` : '';
    const trendTitle = (t, fmt, label) => {
      if (!t) return 'Not enough data in this range';
      let text = `${label} 7-day average ${fmt(t.from)} on ${formatDay(t.fromDate)} → ${fmt(t.to)} on ${formatDay(t.toDate)}`;
      if (t.steps) text += `; the percentage excludes flagged steps (${formatSigned(t.steps)})`;
      if (t.value == null && t.abs != null) text += '; a percentage is shown only while both averages are positive and within a factor of 3, so the absolute change is shown';
      return text;
    };
    const enough = (key) => countValid(slice(s[key])) >= 2;
    // Step-adjusted net change of a level: from the nearest usable day within a week of the start
    // (the baseline day) to the last usable day, flagged steps excluded.
    const netOver = (key, from, to) => {
      const i = nearestValidIndex(s[key], from, 7);
      const j = to === 'end' ? lastValidIn(s[key], a, b) : nearestValidIndex(s[key], to, 7);
      if (i < 0 || j <= i) return null;
      return { net: steppedChange(s, key, i, j), raw: s[key][j] - s[key][i], i, j };
    };
    // Prior-period line for a net-change metric: a percentage only where it means something.
    const priorNet = (el, label, now, prev, unit, title, since) => {
      const pct = netPctChange(prev, now);
      if (pct != null) priorLine(el, label, pct, '%', title, since);
      else priorLine(el, label, now != null && prev != null ? now - prev : null, unit, title, since);
    };

    // MAU (level; the 30-day figure is already a rolling window)
    const tm = maTrend('active', a, b);
    trendBadge($('#kpi-mau-trend'), tm, '%', tag, trendTitle(tm, formatInteger, 'Monthly active users,'));
    const mauNow = windowMean('active', a, b);
    const mauPrev = pr ? windowMean('active', pa, pb) : null;
    priorLine($('#kpi-mau-prior'), `PRIOR AVG ${formatCompact(mauPrev)}`, pctChange(mauPrev, mauNow), '%', `Average MAU: ${formatCompact(mauNow)} (${rangeTxt}) vs ${formatCompact(mauPrev)} (${priorTxt})`);
    setSpark('spark-mau', slice(s.active));

    // Total users (level): net change with flagged steps excluded
    const tu = maTrend('total', a, b);
    trendBadge($('#kpi-users-trend'), tu, '%', tag, trendTitle(tu, formatInteger, 'Total users,'));
    const usersComp = $('#kpi-users-comp');
    const nowNet = netOver('total', a, 'end');
    const avgNet = windowMean('net_total', a + 1, b);
    if (nowNet) {
      const excluded = Math.round(nowNet.raw - nowNet.net) !== 0;
      setText(usersComp, `${formatSigned(nowNet.net)} in range${avgNet == null ? '' : ` · ${formatSigned(avgNet)}/day avg`}${excluded ? ' (ex. flagged steps)' : ''}`);
      if (usersComp) {
        usersComp.title = `Net change in total users, ${rangeTxt}${excluded ? `: ${formatSigned(nowNet.raw, false)} between the two end days, less ${formatSigned(nowNet.raw - nowNet.net, false)} from flagged steps that stay in the count` : ''}. The /day figure is the mean of the usable daily changes, as on the NET SIGNUPS card.`;
      }
    } else {
      setText(usersComp, '—');
      if (usersComp) usersComp.title = `Net change in total users, ${rangeTxt}`;
    }
    const prevNet = pr ? netOver('total', pa, pb) : null;
    priorNet($('#kpi-users-prior'), `PRIOR ${formatSigned(prevNet ? prevNet.net : null)}`, nowNet ? nowNet.net : null, prevNet ? prevNet.net : null, 'abs',
      `Prior period ${priorTxt}: ${formatSigned(prevNet ? prevNet.net : null, false)} net, flagged steps excluded`);
    setSpark('spark-users', slice(s.total));

    // MAU health: net daily change of monthly active users
    const th = maTrend('net_active', a, b);
    trendBadge($('#kpi-mauvel-trend'), th, '%', tag, trendTitle(th, (x) => `${formatSigned(x)}/day`, 'MAU change,'));
    const hNow = windowMean('net_active', a + 1, b);
    const hPrev = pr ? windowMean('net_active', pa + 1, pb) : null;
    priorNet($('#kpi-mauvel-prior'), `PRIOR AVG ${formatSigned(hPrev)}/day`, hNow, hPrev, 'day', `Average MAU change per day: ${formatSigned(hNow)} (${rangeTxt}) vs ${formatSigned(hPrev)} (${priorTxt})`);
    setSpark('spark-mauvel', slice(ma('net_active')));

    // Net signups: net daily change of total users
    const ts = maTrend('net_total', a, b);
    trendBadge($('#kpi-signups-trend'), ts, '%', tag, trendTitle(ts, (x) => `${formatSigned(x)}/day`, 'Net signups,'));
    const sNow = windowMean('net_total', a + 1, b);
    const sPrev = pr ? windowMean('net_total', pa + 1, pb) : null;
    priorNet($('#kpi-signups-prior'), `PRIOR AVG ${formatSigned(sPrev)}/day`, sNow, sPrev, 'day', `Average net change per day: ${formatSigned(sNow)} (${rangeTxt}) vs ${formatSigned(sPrev)} (${priorTxt})`);
    setSpark('spark-signups', slice(ma('net_total')));

    // Servers (joinmastodon server_count; history is short)
    const sv = $('#kpi-servers-comp');
    const tsv = enough('servers') ? maTrend('servers', a, b) : null;
    trendBadge($('#kpi-servers-trend'), tsv, '%', tag, trendTitle(tsv, formatInteger, 'Servers,'));
    const svNet = enough('servers') ? netOver('servers', a, 'end') : null;
    if (svNet) {
      setText(sv, `${formatSigned(svNet.net, false)} in range · users per server ${formatInteger(s.users_per_server[svNet.j])}`);
    } else {
      setText(sv, collectingText(s.servers, s.dates));
    }
    const since = firstDateOf('servers') || undefined;
    const svNow = windowMean('servers', a, b);
    const svPrev = pr ? windowMean('servers', pa, pb) : null;
    priorLine($('#kpi-servers-prior'), `PRIOR AVG ${formatInteger(svPrev)}`, pctChange(svPrev, svNow), '%', `Average servers: ${formatInteger(svNow)} (${rangeTxt}) vs ${formatInteger(svPrev)} (${priorTxt})`, since);
    setSpark('spark-servers', slice(s.servers));
  }

  // ---------------- count-up + live value ----------------

  function animateNumber(el, from, to, duration) {
    if (!el) return;
    if (el._raf) root.cancelAnimationFrame(el._raf);
    if (reducedMotion() || from === to || from == null) { setText(el, formatInteger(to)); return; }
    const t0 = root.performance.now();
    const step = (t) => {
      const p = Math.min(1, (t - t0) / duration);
      const eased = p === 1 ? 1 : 1 - 2 ** (-10 * p);
      setText(el, formatInteger(Math.round(from + (to - from) * eased)));
      if (p < 1) el._raf = root.requestAnimationFrame(step);
      else el._raf = null;
    };
    el._raf = root.requestAnimationFrame(step);
  }

  function setStatus(mode, detail) {
    const wrap = $('#status-indicator');
    const label = $('#data-status');
    if (!wrap || !label) return;
    wrap.classList.remove('live', 'archive', 'error');
    wrap.classList.add(mode);
    setText(label, mode === 'live' ? 'LIVE' : (mode === 'error' ? 'DATA ERROR' : 'ARCHIVE'));
    wrap.title = detail || '';
    const sr = $('#status-detail');
    if (sr) setText(sr, detail || '');
  }

  function livePeriodNote(reading) {
    return reading.period === new Date().toISOString().slice(0, 10) ? ' (UTC day in progress)' : ' (newest complete day)';
  }

  function paintLiveTotal(animate) {
    const reading = app.live.reading;
    const el = $('#kpi-users-value');
    if (!reading || !el) return;
    const prevShown = Number((el.textContent || '').replace(/[^\d]/g, '')) || null;
    if (animate) animateNumber(el, prevShown, reading.users, 900);
    else setText(el, formatInteger(reading.users));
    $$('.tick[data-tick="users"] .tick-val').forEach((t) => setText(t, formatInteger(reading.users)));
    const note = $('#kpi-users-note');
    if (note) {
      setText(note, `LIVE ${formatCompact(reading.mau)} MAU · ${formatTimestamp(reading.period)}${livePeriodNote(reading)}`);
      note.hidden = false;
    }
    el.title = `Live reading from api.joinmastodon.org/statistics for ${formatDay(reading.period)}${livePeriodNote(reading)}: ${formatInteger(reading.users)} users and ${formatInteger(reading.mau)} monthly active users. The charts use the archive's end-of-day values.`;
  }

  // One request on load. Any failure keeps the page in ARCHIVE; the archive is still correct.
  async function fetchLive() {
    if (typeof root.fetch !== 'function') return;
    app.live.lastFetch = Date.now();
    const ctrl = typeof root.AbortController === 'function' ? new root.AbortController() : null;
    const timer = root.setTimeout(() => { if (ctrl) ctrl.abort(); }, 5000);
    try {
      const res = await root.fetch(LIVE_URL, { signal: ctrl ? ctrl.signal : undefined, cache: 'no-store', credentials: 'omit' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const reading = pickLiveReading(parseLiveStats(await res.json()), app.data);
      if (!reading) return;
      app.live.reading = reading;
      app.live.status = 'live';
      setStatus('live', `Live user count ${formatInteger(reading.users)} for ${formatDay(reading.period)}${livePeriodNote(reading)} from api.joinmastodon.org/statistics`);
      const chip = $('#kpi-users-chip');
      if (chip) { setText(chip, 'LIVE'); chip.className = 'metric-chip chip-live'; }
      paintLiveTotal(true);
    } catch (e) {
      // Archive mode stays on silently.
    } finally {
      root.clearTimeout(timer);
    }
  }

  // ---------------- clock ----------------

  function startClock() {
    const utcEl = $('#clock-utc');
    const localEl = $('#clock-local');
    const dateEl = $('#clock-date');
    let tz = '';
    try {
      const parts = new Intl.DateTimeFormat('en-US', { timeZoneName: 'short' }).formatToParts(new Date());
      tz = (parts.find((p) => p.type === 'timeZoneName') || {}).value || '';
    } catch (e) { tz = ''; }
    const pad = (n) => String(n).padStart(2, '0');
    const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
    const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    const tickClock = () => {
      const d = new Date();
      setText(utcEl, `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`);
      setText(localEl, `${pad(d.getHours())}:${pad(d.getMinutes())}${tz ? ` ${tz}` : ''}`);
      setText(dateEl, `${days[d.getUTCDay()]} ${pad(d.getUTCDate())} ${months[d.getUTCMonth()]} ${d.getUTCFullYear()}`);
    };
    tickClock();
    root.setInterval(tickClock, 1000);
  }

  // ---------------- charts ----------------

  const CHART_IDS = { velocity: 'velocityChart', mau: 'mauChart', srv: 'srvChart', rec: 'recChart', rat: 'ratChart', tot: 'totChart' };
  const CHART_NAMES = { velocity: 'velocity', mau: 'monthly-active-users', srv: 'servers', rec: 'posts-per-day', rat: 'ratios', tot: 'total-users' };
  const CHART_TITLES = {
    velocity: 'USR · Velocity', mau: 'MAU · Monthly active users', srv: 'SRV · Servers',
    rec: 'REC · Posts per day', rat: 'RAT · Ratios', tot: 'TOT · Total users'
  };
  const LOG_CHARTS = ['mau', 'srv', 'rec', 'tot'];

  function ratioFormatter(key) {
    if (key === 'engagement') return (x) => formatPct(x, 2);
    return (x) => (x == null ? '—' : x.toFixed(2));
  }

  function areaGradient(color, alphaTop) {
    const cache = {};
    return (context) => {
      const { chart } = context;
      const area = chart.chartArea;
      if (!area) return 'transparent';
      const key = `${area.top}|${area.bottom}`;
      if (!cache[key]) {
        const g = chart.ctx.createLinearGradient(0, area.top, 0, area.bottom);
        g.addColorStop(0, hexToRgba(color, alphaTop));
        g.addColorStop(1, hexToRgba(color, 0));
        cache[key] = g;
      }
      return cache[key];
    };
  }

  // A single reading between two gaps would be invisible on a line chart, so isolated
  // points get a dot.
  function isolatedRadius(r) {
    return (ctx) => {
      const d = ctx.dataset.data;
      const i = ctx.dataIndex;
      return d[i] != null && (i === 0 || d[i - 1] == null) && (i === d.length - 1 || d[i + 1] == null) ? r : 0;
    };
  }

  function lineDataset(label, data, color, extra) {
    return Object.assign({
      type: 'line', label, data, borderColor: color, backgroundColor: color, borderWidth: 2,
      pointRadius: isolatedRadius(2.5), pointBackgroundColor: color, pointHoverRadius: 4, pointHoverBorderWidth: 2, pointHoverBorderColor: app.colors.surface,
      pointHoverBackgroundColor: color, tension: 0, spanGaps: false, fill: false
    }, extra || {});
  }

  function rawLine(key, label, color, opts) {
    const o = opts || {};
    const smooth = app.state.ma;
    return lineDataset(label, slice(app.s[key]), smooth ? hexToRgba(color, 0.4) : color, {
      borderWidth: smooth ? 1.25 : 2,
      pointHoverRadius: smooth ? 0 : 4,
      pointBackgroundColor: color,
      metaKey: key,
      role: 'raw',
      tag: !smooth && o.tag !== false,
      fill: o.fill ? 'origin' : false,
      backgroundColor: o.fill ? areaGradient(color, 0.1) : color,
      order: 3
    });
  }

  function maLine(key, label, color, opts) {
    const o = opts || {};
    return lineDataset(`${label} 7D avg`, slice(ma(key)), color, {
      borderWidth: 2, metaKey: key, role: 'ma', tag: o.tag !== false, order: 2
    });
  }

  function priorLines(keys, labelFor) {
    if (!app.view.prior) return [];
    return keys.map((key) => lineDataset(`Prior period · ${labelFor(key)}`, priorSlice(app.state.ma ? ma(key) : app.s[key]), app.colors.prior, {
      borderWidth: 1.5, borderDash: [5, 4], metaKey: key, role: 'prior', order: 1, pointHoverRadius: 3
    }));
  }

  function seriesSet(keys, extra) {
    const out = [];
    keys.forEach((k) => {
      out.push(rawLine(k, METRIC_LABELS[k], app.colors[k], extra && extra[k]));
      if (app.state.ma) out.push(maLine(k, METRIC_LABELS[k], app.colors[k]));
    });
    return out;
  }

  function dotSeries(key, label) {
    const data = slice(app.s[key]);
    if (!data.some((x) => x != null)) return [];
    return [lineDataset(label, data, app.colors.fedi, {
      metaKey: key, role: 'raw', spanGaps: true, pointRadius: 3, pointBackgroundColor: app.colors.fedi, borderWidth: 1, order: 1
    })];
  }

  function buildDatasets(key) {
    const st = app.state;
    const s = app.s;
    if (key === 'velocity') {
      const metric = velocityMetric();
      const values = slice(s[metric]);
      const c = app.colors[metric];
      const pos = hexToRgba(c, 0.78);
      const neg = hexToRgba(app.colors.loss, 0.85);
      const wide = app.view.length <= 120;
      const sets = [{
        type: 'bar', label: METRIC_LABELS[metric], data: values,
        backgroundColor: values.map((x) => (x != null && x < 0 ? neg : pos)),
        hoverBackgroundColor: values.map((x) => (x != null && x < 0 ? app.colors.loss : c)),
        borderRadius: wide ? { topLeft: 2, topRight: 2 } : 0, borderSkipped: 'start', maxBarThickness: 24,
        barPercentage: wide ? 0.82 : 1, categoryPercentage: 1, metaKey: metric, role: 'raw', order: 3, grouped: false
      }];
      if (st.ma) sets.push(lineDataset('7D avg', slice(ma(metric)), app.colors.ma, { borderWidth: 2, metaKey: metric, role: 'ma', tag: true, order: 1 }));
      if (app.view.prior) {
        sets.push(lineDataset(`Prior period · ${st.ma ? '7D avg' : 'daily'}`, priorSlice(st.ma ? ma(metric) : s[metric]), app.colors.prior, {
          borderWidth: 1.5, borderDash: [5, 4], metaKey: metric, role: 'prior', order: 0, pointHoverRadius: 3
        }));
      }
      return sets;
    }
    if (key === 'mau') {
      return seriesSet(['active'], { active: { fill: zeroBased('mau') } }).concat(priorLines(['active'], () => 'MAU'));
    }
    if (key === 'tot') {
      const sets = [lineDataset('Total users', slice(s.total), app.colors.total, { metaKey: 'total', role: 'raw', tag: true, order: 2 })];
      sets.push(...dotSeries('fedi_users', 'FediDB users (Mastodon software only)'));
      if (app.view.prior) {
        sets.push(lineDataset('Prior period · Total users', priorSlice(s.total), app.colors.prior, {
          borderWidth: 1.5, borderDash: [5, 4], metaKey: 'total', role: 'prior', order: 1, pointHoverRadius: 3
        }));
      }
      return sets;
    }
    if (key === 'srv') {
      if (st.sm === 'users_per_server') {
        return seriesSet(['users_per_server']).concat(priorLines(['users_per_server'], () => 'Users per server'));
      }
      return seriesSet(['servers']).concat(dotSeries('fedi_instances', 'FediDB servers (Mastodon software only)'), priorLines(['servers'], () => 'Servers'));
    }
    if (key === 'rec') {
      return seriesSet(['posts']).concat(priorLines(['posts'], () => 'Posts'));
    }
    if (key === 'rat') {
      const k = st.rm;
      return seriesSet([k]).concat(priorLines([k], (x) => METRIC_LABELS[x]));
    }
    return [];
  }

  // Metrics whose flagged days are shaded on a panel.
  function bandKeysFor(key) {
    const st = app.state;
    if (key === 'velocity') {
      const base = st.vm === 'pct' ? st.vb : st.vm;
      return base === 'signups' ? ['total'] : ['active'];
    }
    if (key === 'mau') return ['active'];
    if (key === 'tot') return ['total'];
    if (key === 'srv') return st.sm === 'users_per_server' ? ['total', 'servers'] : ['servers'];
    if (key === 'rec') return ['statuses'];
    if (key === 'rat') {
      return { engagement: ['total', 'active'], posts_per_mau: ['statuses', 'active'], users_per_server: ['total', 'servers'] }[st.rm];
    }
    return [];
  }

  function outageFlagsAt(key, gi) {
    const keys = bandKeysFor(key);
    if (!keys.length || gi < 0) return [];
    if (app.s.missing[gi]) return keys.slice();
    const flags = app.s.flags[gi];
    return keys.filter((k) => flags.includes(k));
  }

  function xAfterBuildTicks(scale) {
    const labels = scale.chart.data.labels || [];
    if (!labels.length) return;
    const lo = Math.max(0, Math.ceil(scale.min));
    const hi = Math.min(labels.length - 1, Math.floor(scale.max));
    const width = (scale.chart.chartArea && scale.chart.chartArea.width) || scale.chart.width - 80;
    const picked = pickDateTicks(labels, lo, hi, Math.floor(width / 58));
    scale.$tickKind = picked.kind;
    scale.ticks = picked.indices.map((i) => ({ value: i }));
  }

  function xTickFormatter() {
    return function (value) {
      return formatDateTick(this.getLabelForValue(value), this.$tickKind);
    };
  }

  function yTickFormatter(chartKey) {
    return function (value) {
      if (chartKey === 'velocity') {
        if (app.state.vm === 'pct') return value === 0 ? '0%' : `${value > 0 ? '+' : ''}${Number(value.toPrecision(3))}%`;
        return value === 0 ? '0' : `${value > 0 ? '+' : ''}${formatAxisCompact(value)}`;
      }
      if (chartKey === 'rat') {
        if (app.state.rm === 'engagement') return `${Number(value.toPrecision(3))}%`;
        return Number(value.toPrecision(3)).toString();
      }
      return formatAxisCompact(value);
    };
  }

  function wantsLog(key) {
    return app.state.log && LOG_CHARTS.includes(key);
  }

  // Bars always start at zero; line panels do too on long ranges (magnitude), but float on
  // short ones so a week of MAU isn't a flat line.
  function zeroBased(key) {
    if (wantsLog(key)) return false;
    if (key === 'velocity') return true;
    return ['mau', 'rec'].includes(key) && app.view && app.view.length > 100;
  }

  function applyScales(chart, key) {
    const y = chart.options.scales.y;
    y.type = wantsLog(key) ? 'logarithmic' : 'linear';
    y.beginAtZero = zeroBased(key);
  }

  // Shared crosshair: hovering any panel draws the same date's hairline on every panel.
  const crosshairPlugin = {
    id: 'mnCrosshair',
    afterEvent(chart, args) {
      const e = args.event;
      if (e.type === 'mouseout') {
        if (app.hover.source === chart) { app.hover.index = null; app.hover.source = null; hideHud(chart); redrawOthers(chart); }
        return;
      }
      if (e.type !== 'mousemove') return;
      const area = chart.chartArea;
      if (!area || e.x < area.left || e.x > area.right || e.y < area.top || e.y > area.bottom) {
        if (app.hover.source === chart && app.hover.index != null) { app.hover.index = null; app.hover.source = null; hideHud(chart); redrawOthers(chart); }
        return;
      }
      const x = chart.scales.x;
      const lo = Math.max(0, Math.ceil(x.min));
      const hi = Math.min(app.view.length - 1, Math.floor(x.max));
      const idx = Math.min(hi, Math.max(lo, Math.round(x.getValueForPixel(e.x))));
      if (app.hover.source && app.hover.source !== chart) hideHud(app.hover.source);
      if (idx !== app.hover.index || app.hover.source !== chart) {
        app.hover.index = idx;
        app.hover.source = chart;
        redrawOthers(chart);
      }
      paintHud(chart, chart.$mnKey, idx, x.getPixelForValue(idx));
    },
    afterDatasetsDraw(chart) {
      if (app.exporting) return;
      const idx = app.hover.index;
      const active = chart.tooltip && chart.tooltip.getActiveElements().length ? chart.tooltip.getActiveElements()[0].index : null;
      const at = active != null ? active : idx;
      if (at == null) return;
      const x = chart.scales.x;
      if (at < x.min || at > x.max) return;
      const px = x.getPixelForValue(at);
      const area = chart.chartArea;
      const ctx = chart.ctx;
      ctx.save();
      ctx.strokeStyle = hexToRgba(app.colors.primary, 0.35);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(Math.round(px) + 0.5, area.top);
      ctx.lineTo(Math.round(px) + 0.5, area.bottom);
      ctx.stroke();
      ctx.restore();
    }
  };

  // Only charts on screen follow the hairline. A chart that scrolls into view is redrawn, so
  // it never shows a stale hairline.
  const onScreen = new Set();
  function watchVisibility(chart) {
    if (typeof root.IntersectionObserver !== 'function') { onScreen.add(chart); return; }
    if (!app.visibility) {
      app.visibility = new root.IntersectionObserver((entries) => entries.forEach((en) => {
        const c = Object.values(app.charts).find((x) => x.canvas === en.target);
        if (!c) return;
        if (en.isIntersecting) { onScreen.add(c); c.draw(); } else onScreen.delete(c);
      }));
    }
    app.visibility.observe(chart.canvas);
  }

  let redrawQueued = false;
  function redrawOthers(source) {
    if (redrawQueued) return;
    redrawQueued = true;
    root.requestAnimationFrame(() => {
      redrawQueued = false;
      Object.values(app.charts).forEach((c) => { if (c !== source && onScreen.has(c)) c.draw(); });
    });
  }

  // Gap columns: a red wash where a plotted metric is flagged (full height when every plotted
  // series is flagged, a fainter wash plus a baseline strip when only some are) and a neutral
  // one where the archive has no row for the day.
  const gapBandPlugin = {
    id: 'mnGapBands',
    beforeDatasetsDraw(chart) {
      const key = chart.$mnKey;
      if (!key || !app.view) return;
      const total = bandKeysFor(key).length;
      if (!total) return;
      const x = chart.scales.x;
      const area = chart.chartArea;
      const ctx = chart.ctx;
      const half = x.width / Math.max(1, (x.max - x.min + 1)) / 2;
      ctx.save();
      for (let i = Math.max(0, Math.floor(x.min)); i <= Math.min(app.view.length - 1, Math.ceil(x.max)); i += 1) {
        const gi = app.view.startIdx + i;
        const missing = app.s.missing[gi];
        const n = missing ? 0 : outageFlagsAt(key, gi).length;
        if (!missing && !n) continue;
        const px = x.getPixelForValue(i);
        const left = Math.max(area.left, px - half);
        const w = Math.max(1, Math.min(area.right, px + half) - left);
        if (missing) {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.035)';
          ctx.fillRect(left, area.top, w, area.bottom - area.top);
        } else if (n >= total) {
          ctx.fillStyle = app.colors.band;
          ctx.fillRect(left, area.top, w, area.bottom - area.top);
        } else {
          ctx.fillStyle = hexToRgba(app.colors.loss, 0.035);
          ctx.fillRect(left, area.top, w, area.bottom - area.top);
          ctx.fillStyle = hexToRgba(app.colors.loss, 0.55);
          ctx.fillRect(left, area.bottom - 3, w, 3);
        }
      }
      ctx.restore();
    }
  };

  function luminance(hex) {
    const m = /^#?([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(hex || '');
    if (!m) return 0;
    const ch = [m[1], m[2], m[3]].map((h) => {
      const c = parseInt(h, 16) / 255;
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
  }

  function tagText(chartKey, ds, v) {
    if (chartKey === 'velocity') return app.state.vm === 'pct' ? `${v >= 0 ? '+' : ''}${v.toFixed(3)}%` : formatSigned(v);
    if (chartKey === 'rat') return ratioFormatter(app.state.rm)(v);
    if (chartKey === 'srv' && app.state.sm === 'users_per_server') return formatInteger(v);
    return formatCompact(v);
  }

  // Bloomberg-style last-value tags in the right gutter, nudged apart with leader lines.
  const lastValueTagPlugin = {
    id: 'mnLastValueTags',
    afterDatasetsDraw(chart) {
      const key = chart.$mnKey;
      if (!key) return;
      const area = chart.chartArea;
      const x = chart.scales.x;
      const y = chart.scales.y;
      const ctx = chart.ctx;
      const tags = [];
      chart.data.datasets.forEach((ds, di) => {
        if (!ds.tag || !chart.isDatasetVisible(di)) return;
        const hi = Math.min(ds.data.length - 1, Math.floor(x.max));
        let i = hi;
        while (i >= Math.ceil(x.min) && ds.data[i] == null) i -= 1;
        if (i < Math.ceil(x.min) || ds.data[i] == null) return;
        const v = ds.data[i];
        if (y.type === 'logarithmic' && !(v > 0)) return;
        const py = y.getPixelForValue(v);
        if (py < area.top - 1 || py > area.bottom + 1) return;
        const color = ds.metaKey && app.colors[ds.metaKey] && ds.role !== 'ma' ? app.colors[ds.metaKey]
          : (typeof ds.borderColor === 'string' && ds.borderColor.startsWith('#') ? ds.borderColor : app.colors.ma);
        tags.push({ py, y: py, text: tagText(key, ds, v), color });
      });
      if (!tags.length) return;
      tags.sort((a, b) => a.py - b.py);
      const h = 15;
      for (let k = 1; k < tags.length; k += 1) if (tags[k].y - tags[k - 1].y < h + 1) tags[k].y = tags[k - 1].y + h + 1;
      const overflow = tags[tags.length - 1].y + h / 2 - (area.bottom + 6);
      if (overflow > 0) tags.forEach((t) => { t.y -= overflow; });
      ctx.save();
      ctx.font = `600 10px ${cssVar('--font-mono', 'monospace')}`;
      ctx.textBaseline = 'middle';
      tags.forEach((t) => {
        const w = ctx.measureText(t.text).width + 8;
        const left = area.right + 4;
        if (Math.abs(t.y - t.py) > 1) {
          ctx.strokeStyle = hexToRgba(t.color, 0.6);
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(area.right, t.py);
          ctx.lineTo(left, t.y);
          ctx.stroke();
        }
        ctx.fillStyle = t.color;
        ctx.fillRect(left, t.y - h / 2, w, h);
        ctx.fillStyle = luminance(t.color) > 0.18 ? app.colors.ink : '#FFFFFF';
        ctx.fillText(t.text, left + 4, t.y + 0.5);
      });
      ctx.restore();
    }
  };

  // Selective direct label: the extreme bar in view.
  const peakLabelPlugin = {
    id: 'mnPeakLabel',
    afterDatasetsDraw(chart) {
      if (chart.$mnKey !== 'velocity') return;
      const ds = chart.data.datasets[0];
      const meta = chart.getDatasetMeta(0);
      if (!ds || !meta || !meta.data.length) return;
      const x = chart.scales.x;
      let best = -1;
      for (let i = Math.max(0, Math.ceil(x.min)); i <= Math.min(ds.data.length - 1, Math.floor(x.max)); i += 1) {
        if (ds.data[i] != null && (best < 0 || ds.data[i] > ds.data[best])) best = i;
      }
      if (best < 0 || !(ds.data[best] > 0)) return;
      const bar = meta.data[best];
      if (!bar) return;
      const area = chart.chartArea;
      const ctx = chart.ctx;
      const gi = app.view.startIdx + best;
      const val = app.state.vm === 'pct' ? `+${ds.data[best].toFixed(3)}%` : formatSigned(ds.data[best]);
      ctx.save();
      ctx.font = `600 10px ${cssVar('--font-mono', 'monospace')}`;
      // Right of the bar, else left of it; on narrow charts drop the date, then the word PEAK.
      let text = '';
      let w = 0;
      let left = null;
      for (const t of [`PEAK ${val} · ${formatDay(app.s.dates[gi])}`, `PEAK ${val}`, val]) {
        text = t;
        w = ctx.measureText(t).width;
        if (bar.x + 6 + w <= area.right - 2) { left = bar.x + 6; break; }
        if (bar.x - 6 - w >= area.left + 2) { left = bar.x - 6 - w; break; }
      }
      if (left == null) left = Math.max(area.left + 2, Math.min(area.right - 2 - w, bar.x - w / 2));
      const ty = bar.y - 10 > area.top + 7 ? bar.y - 10 : Math.max(area.top + 8, bar.y + 4);
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = hexToRgba(app.colors.surface, 0.85);
      ctx.fillRect(left - 3, ty - 7, w + 6, 14);
      ctx.fillStyle = app.colors.primary;
      ctx.fillText(text, left, ty);
      ctx.restore();
    }
  };

  function hudRowsFor(chartKey, idx) {
    const s = app.s;
    const gi = app.view.startIdx + idx;
    const rows = [];
    const notes = [];
    const fmtDelta = (val, prev, f) => (val != null && prev != null ? `Δ ${f(val - prev)}` : '');
    const priorIdx = app.view.prior ? gi - app.view.prior.span : null;
    const priorRow = (arr, fmt) => {
      const pv = priorIdx != null && priorIdx >= 0 ? arr[priorIdx] : null;
      rows.push({ color: app.colors.prior, dash: true, label: `Prior · ${priorIdx != null && priorIdx >= 0 ? formatDay(s.dates[priorIdx]) : '—'}`, value: pv == null ? '—' : fmt(pv) });
    };
    if (chartKey === 'velocity') {
      const metric = velocityMetric();
      const v = s[metric][gi];
      const m = ma(metric)[gi];
      const isPct = metric.startsWith('growth');
      const base = metric === 'net_active' || metric === 'growth_mau' ? 'active' : 'total';
      if (!isPct) {
        rows.push({ color: app.colors[metric], label: METRIC_LABELS[metric], value: formatSigned(v, false), sub: fmtDelta(v, s[metric][gi - 1], (d) => formatSigned(d)) });
        rows.push({ color: app.colors.ma, line: true, label: '7D avg', value: m == null ? '—' : `${formatSigned(m)}/day` });
      } else {
        rows.push({ color: app.colors[metric], label: METRIC_LABELS[metric], value: v == null ? '—' : `${v >= 0 ? '+' : ''}${v.toFixed(3)}%` });
        rows.push({ color: app.colors.ma, line: true, label: '7D avg', value: m == null ? '—' : `${m >= 0 ? '+' : ''}${m.toFixed(3)}%` });
      }
      rows.push({ label: base === 'active' ? 'Monthly active users' : 'Total users', value: formatInteger(s[base][gi]) });
      if (priorIdx != null) {
        const arr = app.state.ma ? ma(metric) : s[metric];
        priorRow(arr, (pv) => (isPct ? `${pv.toFixed(3)}%` : formatSigned(pv)));
      }
    } else if (chartKey === 'tot') {
      rows.push({ color: app.colors.total, line: true, label: 'Total users', value: formatInteger(s.total[gi]), sub: s.net_total[gi] == null ? '' : `Δ ${formatSigned(s.net_total[gi])}` });
      if (s.fedi_users[gi] != null) rows.push({ color: app.colors.fedi, line: true, label: 'FediDB users', value: formatInteger(s.fedi_users[gi]), sub: 'Mastodon software only' });
      if (priorIdx != null) priorRow(s.total, formatInteger);
    } else {
      const keys = chartKey === 'mau' ? ['active']
        : chartKey === 'rec' ? ['posts']
          : chartKey === 'srv' ? [app.state.sm === 'users_per_server' ? 'users_per_server' : 'servers']
            : [app.state.rm];
      const fmt = chartKey === 'rat' ? ratioFormatter(app.state.rm) : (chartKey === 'srv' ? formatInteger : formatCompact);
      const fmtD = chartKey === 'rat'
        ? (d) => (app.state.rm === 'engagement' ? `${d >= 0 ? '+' : ''}${d.toFixed(2)}pp` : `${d >= 0 ? '+' : ''}${d.toFixed(2)}`)
        : (d) => formatSigned(d);
      keys.forEach((k) => {
        const v = s[k][gi];
        const m = ma(k)[gi];
        const sub = [fmtDelta(v, s[k][gi - 1], fmtD), m == null ? '' : `7D ${fmt(m)}`].filter(Boolean).join(' · ');
        rows.push({ color: app.colors[k], line: true, label: METRIC_LABELS[k], value: v == null ? 'gap' : (k === 'servers' || k === 'active' ? formatInteger(v) : fmt(v)), sub });
        if (priorIdx != null) priorRow(app.state.ma ? ma(k) : s[k], fmt);
      });
      if (chartKey === 'srv' && app.state.sm === 'servers' && s.fedi_instances[gi] != null) {
        rows.push({ color: app.colors.fedi, line: true, label: 'FediDB servers', value: formatInteger(s.fedi_instances[gi]), sub: 'Mastodon software only' });
      }
      if (chartKey === 'rec') {
        notes.push('FediDB status counter: change since the previous reading ÷ time between them');
        if (s.statuses_at[gi]) notes.push(`Reading taken ${formatUtcStamp(s.statuses_at[gi])}`);
        if (s.posts[gi] == null && !s.missing[gi] && !s.flags[gi].includes('statuses')) {
          notes.push(s.statuses[gi] == null ? 'No FediDB reading for this day' : 'No rate: needs a usable reading at least 6 hours earlier');
        }
      }
      if (chartKey === 'rat' && app.state.rm === 'posts_per_mau') notes.push('FediDB posts ÷ joinmastodon MAU: two sources');
    }
    if (priorIdx != null && priorIdx >= 0) notes.push(`Prior period date: ${formatDay(s.dates[priorIdx])}`);
    if (s.missing[gi]) {
      notes.push('No row in the archive for this day');
    } else {
      const flagged = outageFlagsAt(chartKey, gi);
      if (flagged.length) notes.push(`⚠ FLAGGED (${flagged.join(', ')}): treated as missing`);
    }
    return { rows, notes };
  }

  function hudElement(chart) {
    const container = chart.canvas.parentNode;
    let el = container.querySelector('.hud');
    if (!el) {
      el = doc.createElement('div');
      el.className = 'hud';
      el.setAttribute('aria-hidden', 'true');
      container.appendChild(el);
    }
    return el;
  }

  function hideHud(chart) {
    hudElement(chart).classList.remove('visible');
  }

  // Draws the readout for day `idx` of the view, anchored at pixel `caret`. Days with no archive
  // row or a flagged value are painted too, with their note.
  function paintHud(chart, chartKey, idx, caret) {
    const container = chart.canvas.parentNode;
    const el = hudElement(chart);
    const gi = app.view.startIdx + idx;
    const { rows, notes } = hudRowsFor(chartKey, idx);
    el.textContent = '';
    const title = doc.createElement('div');
    title.className = 'hud-title';
    const dt = app.s.dates[gi];
    title.textContent = dt ? `${['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'][new Date(`${dt}T00:00:00Z`).getUTCDay()]} ${formatDay(dt)}` : '';
    el.appendChild(title);
    rows.forEach((r) => {
      const row = doc.createElement('div');
      row.className = 'hud-row';
      const keyEl = doc.createElement('span');
      keyEl.className = `hud-key${r.dash ? ' dash' : ''}${r.color ? '' : ' none'}`;
      if (r.color) keyEl.style.setProperty('--key', r.color);
      const label = doc.createElement('span');
      label.className = 'hud-label';
      label.textContent = r.label;
      const value = doc.createElement('span');
      value.className = 'hud-value';
      value.textContent = r.value;
      row.append(keyEl, label, value);
      if (r.sub) {
        const sub = doc.createElement('span');
        sub.className = 'hud-sub';
        sub.textContent = r.sub;
        row.appendChild(sub);
      }
      el.appendChild(row);
    });
    notes.forEach((n) => {
      const note = doc.createElement('div');
      note.className = 'hud-note';
      note.textContent = n;
      el.appendChild(note);
    });
    el.classList.add('visible');
    const cw = container.clientWidth;
    const w = el.offsetWidth;
    let left = caret + 14;
    if (left + w > cw - 4) left = caret - w - 14;
    if (left < 4) left = Math.max(4, Math.min(cw - w - 4, caret - w / 2));
    el.style.transform = `translate(${Math.round(left)}px, ${Math.round(chart.chartArea.top + 4)}px)`;
  }

  // Keyboard stepping goes through Chart.js's tooltip (this hook). While the pointer is over a
  // chart, the crosshair plugin paints the readout for the hovered day itself, so a day with no
  // plotted point still gets one.
  function externalTooltip(chartKey) {
    return (context) => {
      const { chart, tooltip } = context;
      if (app.hover.source === chart && app.hover.index != null) return;
      if (!tooltip || tooltip.opacity === 0 || !tooltip.dataPoints || !tooltip.dataPoints.length) {
        hideHud(chart);
        return;
      }
      paintHud(chart, chartKey, tooltip.dataPoints[0].dataIndex, tooltip.caretX);
    };
  }

  function chartOptions(key) {
    const c = app.colors;
    const mono = cssVar('--font-mono', 'monospace');
    const rightPad = key === 'velocity' && app.state.vm === 'pct' ? 70 : 62;
    return {
      responsive: true,
      maintainAspectRatio: false,
      animation: reducedMotion() ? false : { duration: 350 },
      normalized: true,
      interaction: { mode: 'index', intersect: false, axis: 'x' },
      layout: { padding: { top: key === 'velocity' ? 16 : 8, right: rightPad, left: 2, bottom: 0 } },
      events: ['mousemove', 'mouseout', 'click', 'touchstart', 'touchmove', 'touchend'],
      plugins: {
        legend: { display: false },
        tooltip: {
          enabled: false,
          external: externalTooltip(key),
          filter: (item) => item.dataset.role !== 'ma' || key === 'velocity'
        },
        zoom: {
          limits: { x: { min: 'original', max: 'original', minRange: 4 } },
          pan: { enabled: true, mode: 'x', threshold: 6 },
          zoom: {
            wheel: { enabled: true, speed: 0.12, modifierKey: 'ctrl' },
            pinch: { enabled: true },
            mode: 'x',
            onZoomComplete: ({ chart }) => onZoomChange(key, chart)
          }
        }
      },
      scales: {
        x: {
          type: 'category',
          offset: key === 'velocity',
          grid: { display: false },
          border: { color: c.grid },
          ticks: {
            color: c.text, autoSkip: false, maxRotation: 0, minRotation: 0,
            font: { family: mono, size: 10.5 }, callback: xTickFormatter(key)
          },
          afterBuildTicks: xAfterBuildTicks
        },
        y: {
          type: 'linear',
          position: 'left',
          grid: { color: c.grid, drawTicks: false },
          border: { display: false },
          ticks: { color: c.text, padding: 6, maxTicksLimit: 6, font: { family: mono, size: 10.5 }, callback: yTickFormatter(key) },
          afterBuildTicks: (scale) => {
            if (scale.type !== 'logarithmic') return;
            const t = logTicks(scale.min, scale.max, Math.max(3, Math.floor(scale.height / 40) || 6));
            if (t.length) scale.ticks = t.map((value) => ({ value, major: false }));
          }
        }
      }
    };
  }

  function onZoomChange(key, chart) {
    const btn = $(`.reset-zoom-btn[data-chart="${key}"]`);
    if (btn) btn.classList.toggle('zoomed', typeof chart.isZoomedOrPanned === 'function' && chart.isZoomedOrPanned());
  }

  // The series a panel is about; fewer than two usable points in view shows the empty state.
  function primaryKeysFor(key) {
    if (key === 'velocity') return [velocityMetric()];
    if (key === 'mau') return ['active'];
    if (key === 'tot') return ['total'];
    if (key === 'srv') return [app.state.sm === 'users_per_server' ? 'users_per_server' : 'servers'];
    if (key === 'rec') return ['posts'];
    return [app.state.rm];
  }

  function syncEmptyState(key) {
    const canvas = doc.getElementById(CHART_IDS[key]);
    if (!canvas) return;
    const box = canvas.parentNode;
    let el = box.querySelector('.chart-empty');
    const k = primaryKeysFor(key)[0];
    const view = slice(app.s[k]);
    const empty = countValid(view) < 2;
    if (!empty) {
      if (el) el.hidden = true;
      return;
    }
    if (!el) {
      el = doc.createElement('p');
      el.className = 'chart-empty';
      el.setAttribute('role', 'status');
      box.appendChild(el);
    }
    el.hidden = false;
    el.textContent = collectingText(app.s[k], app.s.dates);
  }

  function createCharts() {
    if (typeof root.Chart !== 'function') {
      $$('.chart-container').forEach((el) => {
        el.classList.add('chart-unavailable');
        const msg = doc.createElement('p');
        msg.className = 'chart-error';
        msg.textContent = 'Chart library failed to load. The numbers above and the data table below are still current.';
        el.appendChild(msg);
      });
      return;
    }
    const Chart = root.Chart;
    Chart.defaults.color = app.colors.text;
    Chart.defaults.font.family = cssVar('--font-mono', 'monospace');
    Chart.defaults.font.size = 11;
    computeView();
    Object.keys(CHART_IDS).forEach((key) => {
      const canvas = doc.getElementById(CHART_IDS[key]);
      if (!canvas) return;
      const chart = new Chart(canvas.getContext('2d'), {
        type: key === 'velocity' ? 'bar' : 'line',
        data: { labels: slice(app.s.dates), datasets: buildDatasets(key) },
        options: chartOptions(key),
        plugins: [gapBandPlugin, crosshairPlugin, lastValueTagPlugin, peakLabelPlugin]
      });
      chart.$mnKey = key;
      applyScales(chart, key);
      chart.update('none');
      app.charts[key] = chart;
      watchVisibility(chart);
      wireChartKeyboard(canvas, key);
      syncEmptyState(key);
      describeChart(key);
    });
    if (doc.fonts && doc.fonts.ready) doc.fonts.ready.then(() => Object.values(app.charts).forEach((c) => c.update('none')));
  }

  // Animating every point of six charts blocks the main thread for 0.3–1.2 s on ALL, so only
  // short ranges animate.
  const ANIMATE_MAX_POINTS = 200;

  function updateCharts(rangeChanged) {
    const animate = rangeChanged && !reducedMotion() && app.view.length <= ANIMATE_MAX_POINTS;
    // A readout for the old data would be wrong now; the next pointer move paints a fresh one.
    app.hover.index = null;
    app.hover.source = null;
    Object.values(app.charts).forEach(hideHud);
    Object.entries(app.charts).forEach(([key, chart]) => {
      if (rangeChanged && typeof chart.resetZoom === 'function') {
        chart.resetZoom('none');
        onZoomChange(key, chart);
      }
      chart.data.labels = slice(app.s.dates);
      chart.data.datasets = buildDatasets(key);
      chart.options.layout.padding.right = key === 'velocity' && app.state.vm === 'pct' ? 70 : 62;
      applyScales(chart, key);
      chart.update(animate ? undefined : 'none');
      describeChart(key);
      syncEmptyState(key);
    });
  }

  function describeChart(key) {
    const canvas = doc.getElementById(CHART_IDS[key]);
    if (!canvas) return;
    const v = app.view;
    const s = app.s;
    const span = `${formatDay(v.bounds.start)} to ${formatDay(v.bounds.end)}`;
    const lastOf = (k) => { const i = lastValidIn(s[k], v.startIdx, v.endIdx); return i >= 0 ? s[k][i] : null; };
    const maOf = (k) => { const arr = ma(k); const i = lastValidIn(arr, v.startIdx, v.endIdx); return i >= 0 ? arr[i] : null; };
    const primary = primaryKeysFor(key)[0];
    if (countValid(slice(s[primary])) < 2) {
      const note = collectingText(s[primary], s.dates).replace(/^Collecting — /, 'Collecting: ').replace(/^No usable points in this range — /, 'No usable points in this range: ');
      canvas.setAttribute('aria-label', `${CHART_TITLES[key].replace(/^\w+ · /, '')}, ${span}: ${note.replace(/\.$/, '')}. Nothing to step through yet; the data table below lists the daily values.`);
      return;
    }
    let summary = '';
    if (key === 'velocity') {
      const metric = velocityMetric();
      summary = `${METRIC_LABELS[metric]} per day, ${span}: latest 7-day average ${metric.startsWith('growth') ? formatPct(maOf(metric), 3) : formatSigned(maOf(metric))}.`;
    }
    if (key === 'mau') summary = `Monthly active users, ${span}: ${formatInteger(lastOf('active'))} at the end of the range.`;
    if (key === 'tot') summary = `Total users, ${span}: ${formatInteger(lastOf('total'))} at the end of the range.`;
    if (key === 'srv') summary = `${METRIC_LABELS[primaryKeysFor('srv')[0]]}, ${span}: latest ${formatInteger(lastOf(primaryKeysFor('srv')[0]))}.`;
    if (key === 'rec') summary = `Posts per day, ${span}: latest ${formatCompact(lastOf('posts'))}.`;
    if (key === 'rat') summary = `${METRIC_LABELS[app.state.rm]}, ${span}: latest ${ratioFormatter(app.state.rm)(lastOf(app.state.rm))}.`;
    canvas.setAttribute('aria-label', `${summary} Arrow keys step through days. Daily values are in the data table below.`);
  }

  function wireChartKeyboard(canvas, key) {
    canvas.addEventListener('keydown', (e) => {
      const chart = app.charts[key];
      if (!chart) return;
      const x = chart.scales.x;
      const lo = Math.max(0, Math.ceil(x.min));
      const hi = Math.min(app.view.length - 1, Math.floor(x.max));
      const active = chart.tooltip.getActiveElements();
      let idx = active.length ? active[0].index : hi;
      if (e.key === 'ArrowLeft') idx = Math.max(lo, idx - 1);
      else if (e.key === 'ArrowRight') idx = Math.min(hi, idx + 1);
      else if (e.key === 'Home') idx = lo;
      else if (e.key === 'End') idx = hi;
      else return;
      e.preventDefault();
      showIndex(chart, idx);
    });
    canvas.addEventListener('focus', () => {
      const chart = app.charts[key];
      if (chart) showIndex(chart, Math.min(app.view.length - 1, Math.floor(chart.scales.x.max)));
    });
    canvas.addEventListener('blur', () => {
      const chart = app.charts[key];
      if (chart) { chart.tooltip.setActiveElements([], { x: 0, y: 0 }); chart.setActiveElements([]); chart.update('none'); }
    });
  }

  function showIndex(chart, idx) {
    const els = chart.data.datasets
      .map((ds, di) => ({ datasetIndex: di, index: idx }))
      .filter(({ datasetIndex }) => chart.isDatasetVisible(datasetIndex) && chart.getDatasetMeta(datasetIndex).data[idx]);
    if (!els.length) return;
    const pt = chart.getDatasetMeta(els[0].datasetIndex).data[idx];
    chart.setActiveElements(els);
    chart.tooltip.setActiveElements(els, { x: pt.x, y: pt.y });
    chart.update('none');
    announceIndex(chart.$mnKey, idx);
  }

  // The HUD is aria-hidden (it follows the pointer), so keyboard stepping is read out from a
  // polite live region instead, debounced so holding an arrow key doesn't queue every day.
  let announceTimer = null;
  function announceIndex(key, idx) {
    const live = $('#chart-live');
    if (!live || !key) return;
    root.clearTimeout(announceTimer);
    announceTimer = root.setTimeout(() => {
      const { rows, notes } = hudRowsFor(key, idx);
      const parts = rows.map((r) => `${r.label} ${r.value}${r.sub ? ` (${r.sub.replace(/Δ/g, 'change')})` : ''}`);
      const extra = notes.map((n) => n.replace(/^[≈⚠]\s*/, ''));
      setText(live, `${formatDay(app.s.dates[app.view.startIdx + idx])}: ${parts.join(', ')}.${extra.length ? ` ${extra.join('. ')}.` : ''}`);
    }, 150);
  }

  // ---------------- exports ----------------

  function visibleRange(key) {
    const chart = app.charts[key];
    let lo = 0;
    let hi = app.view.length - 1;
    if (chart && chart.scales && chart.scales.x) {
      lo = Math.max(0, Math.ceil(chart.scales.x.min));
      hi = Math.min(app.view.length - 1, Math.floor(chart.scales.x.max));
    }
    return { a: app.view.startIdx + lo, b: app.view.startIdx + hi };
  }

  // Column names follow data/mastodon-daily.csv where the dataset has the same column.
  function chartColumns(key) {
    const s = app.s;
    const col = (header, arr) => ({ header, value: (i) => arr[i] });
    const flagsCol = { header: 'flags', value: (i) => s.flags[i] };
    if (key === 'velocity') {
      return [col('date', s.dates), col('total', s.total), col('active', s.active), col('net_total', s.net_total), col('net_active', s.net_active),
        col('net_total_7d_avg', ma('net_total')), col('net_active_7d_avg', ma('net_active')),
        col('growth_total_pct', s.growth_signups), col('growth_active_pct', s.growth_mau), flagsCol];
    }
    if (key === 'mau') return [col('date', s.dates), col('active', s.active), col('active_7d_avg', ma('active')), flagsCol];
    if (key === 'srv') return [col('date', s.dates), col('servers', s.servers), col('fedi_instances', s.fedi_instances), col('users_per_server', s.users_per_server), flagsCol];
    if (key === 'rec') return [col('date', s.dates), col('statuses', s.statuses), col('statuses_at', s.statuses_at), col('posts_per_day', s.posts), col('posts_per_day_7d_avg', ma('posts')), flagsCol];
    if (key === 'rat') return [col('date', s.dates), col('engagement_pct', s.engagement), col('posts_per_mau', s.posts_per_mau), col('users_per_server', s.users_per_server), flagsCol];
    return [col('date', s.dates), col('total', s.total), col('fedi_users', s.fedi_users), col('net_total', s.net_total), flagsCol];
  }

  function download(name, blob) {
    const url = URL.createObjectURL(blob);
    const a = doc.createElement('a');
    a.href = url;
    a.download = name;
    a.rel = 'noopener';
    doc.body.appendChild(a);
    a.click();
    a.remove();
    root.setTimeout(() => URL.revokeObjectURL(url), 4000);
  }

  function exportCSV(key) {
    const { a, b } = visibleRange(key);
    const idx = [];
    for (let i = a; i <= b; i += 1) idx.push(i);
    const csv = buildCSV(chartColumns(key), idx);
    download(`mastodon-${CHART_NAMES[key]}-${app.s.dates[a]}_${app.s.dates[b]}.csv`, new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  }

  // One line under the PNG title so an exported image explains itself: series colours, mode,
  // scale, smoothing and the prior period.
  function exportLegend(key) {
    const st = app.state;
    const c = app.colors;
    const items = [];
    if (key === 'velocity') {
      items.push({ color: c[velocityMetric()], text: METRIC_LABELS[velocityMetric()] });
      if (st.ma) items.push({ color: c.ma, text: 'line = 7D avg' });
    } else if (key === 'tot') {
      items.push({ color: c.total, text: 'Total users (joinmastodon)' });
      if (app.s.fedi_users.some((v) => v != null)) items.push({ color: c.fedi, text: 'FediDB users (different base)' });
    } else if (key === 'srv') {
      const k = primaryKeysFor('srv')[0];
      items.push({ color: c[k], text: METRIC_LABELS[k] });
      if (st.ma) items.push({ text: 'faint = daily, solid = 7D avg' });
    } else {
      const k = primaryKeysFor(key)[0];
      items.push({ color: c[k], text: METRIC_LABELS[k] });
      if (st.ma) items.push({ text: 'faint = daily, solid = 7D avg' });
    }
    if (key !== 'rat' && key !== 'velocity') items.push({ text: wantsLog(key) ? 'LOG scale' : 'linear scale' });
    items.push({ text: 'gaps = flagged or missing days' });
    const pr = app.view.prior;
    if (pr) {
      items.push({ color: c.prior, text: `dashed = prior period ${formatDay(pr.truncated ? app.s.dates[0] : pr.start)} → ${formatDay(pr.end)}${pr.truncated ? ' (partial)' : ''}` });
    }
    return items;
  }

  function exportPNG(key) {
    const chart = app.charts[key];
    if (!chart) return;
    const src = chart.canvas;
    const ratio = src.width / src.clientWidth || 1;
    const px = (n) => Math.round(n * ratio);
    const mono = cssVar('--font-mono', 'monospace');
    const small = `500 ${px(10)}px ${mono}`;
    // Lay the legend out first (wrapping at the canvas width) so the header fits it.
    const measure = doc.createElement('canvas').getContext('2d');
    measure.font = small;
    const lines = [[]];
    let lx = px(12);
    exportLegend(key).forEach((it) => {
      const w = (it.color ? px(12) : 0) + measure.measureText(it.text).width;
      if (lx + w > src.width - px(12) && lines[lines.length - 1].length) { lines.push([]); lx = px(12); }
      lines[lines.length - 1].push(it);
      lx += w + px(14);
    });
    const head = px(34 + 16 * lines.length);
    const foot = px(24);
    const out = doc.createElement('canvas');
    out.width = src.width;
    out.height = src.height + head + foot;
    const ctx = out.getContext('2d');
    ctx.fillStyle = app.colors.surface;
    ctx.fillRect(0, 0, out.width, out.height);
    ctx.fillStyle = app.colors.total;
    ctx.fillRect(0, 0, out.width, Math.max(1, px(2)));
    ctx.font = `700 ${px(13)}px ${mono}`;
    ctx.textBaseline = 'middle';
    ctx.fillStyle = app.colors.primary;
    const { a, b } = visibleRange(key);
    ctx.fillText(`${CHART_TITLES[key]}  ·  ${formatDay(app.s.dates[a])} → ${formatDay(app.s.dates[b])}`, px(12), px(17));
    ctx.font = small;
    lines.forEach((line, li) => {
      let x = px(12);
      const y = px(38 + 16 * li);
      line.forEach((it) => {
        if (it.color) {
          ctx.fillStyle = it.color;
          ctx.fillRect(x, y - px(4), px(8), px(8));
          x += px(12);
        }
        ctx.fillStyle = app.colors.text;
        ctx.fillText(it.text, x, y);
        x += ctx.measureText(it.text).width + px(14);
      });
    });
    // Copy a clean frame: no shared hairline from a chart the pointer is resting on.
    app.exporting = true;
    try {
      chart.draw();
      ctx.drawImage(src, 0, head);
    } finally {
      app.exporting = false;
      chart.draw();
    }
    ctx.font = small;
    ctx.fillStyle = app.colors.muted;
    ctx.fillText(`Mastodon Network Pulse · ${SITE_URL.replace(/^https:\/\//, '')} · data: joinmastodon.org statistics API, FediDB`, px(12), out.height - foot / 2);
    const name = `mastodon-${CHART_NAMES[key]}-${app.s.dates[a]}_${app.s.dates[b]}.png`;
    if (out.toBlob) out.toBlob((blob) => { if (blob) download(name, blob); }, 'image/png');
    else {
      const link = doc.createElement('a');
      link.href = out.toDataURL('image/png');
      link.download = name;
      link.click();
    }
  }

  // ---------------- data table ----------------

  function renderTable() {
    const body = $('#data-table-body');
    if (!body) return;
    const s = app.s;
    const v = app.view;
    const from = Math.max(v.startIdx, v.endIdx - 29);
    const frag = doc.createDocumentFragment();
    for (let i = v.endIdx; i >= from; i -= 1) {
      const tr = doc.createElement('tr');
      const cell = (text, cls, title) => {
        const td = doc.createElement('td');
        td.textContent = text;
        if (cls) td.className = cls;
        if (title) td.title = title;
        tr.appendChild(td);
      };
      const th = doc.createElement('th');
      th.scope = 'row';
      th.textContent = formatDay(s.dates[i]);
      tr.appendChild(th);
      const missing = s.missing[i];
      // [value, key, signed?]: a null value is "flagged" only when the row says so, otherwise absent.
      [['total', 'total', false], ['net_total', 'total', true], ['active', 'active', false], ['net_active', 'active', true], ['servers', 'servers', false], ['posts', 'statuses', false]].forEach(([k, flagKey, signed]) => {
        const val = s[k][i];
        const flagged = !missing && s.flags[i].includes(flagKey);
        let text = '—';
        if (val != null) text = signed ? formatSigned(val, false) : formatInteger(val);
        else if (flagged) text = 'flagged';
        const cls = ['num'];
        if (signed && val != null) cls.push(trendClass(val));
        if (flagged) cls.push('flagged');
        cell(text, cls.join(' '), flagged ? 'Flagged: treated as missing' : (missing ? 'No row in the archive for this day' : ''));
      });
      frag.appendChild(tr);
    }
    body.textContent = '';
    body.appendChild(frag);
    setText($('#table-range-label'), `${formatDay(s.dates[from])} → ${formatDay(s.dates[v.endIdx])}`);
  }

  // ---------------- guide (generated from the live range list) ----------------

  function renderGuideRanges() {
    const body = $('#guide-ranges-body');
    if (!body) return;
    const s = app.s;
    const first = s.dates[0];
    const last = s.dates[s.length - 1];
    const list = RANGES.slice(0, 7).concat(yearRanges(first, last).filter((y) => !RANGES.includes(y)), ['ALL']);
    body.textContent = '';
    list.forEach((r) => {
      const cur = getRangeBounds(r, first, last);
      const prior = getPriorBounds(r, first, last);
      const tr = doc.createElement('tr');
      const td = (content) => { const el = doc.createElement('td'); if (content instanceof Node) el.appendChild(content); else el.textContent = content; tr.appendChild(el); };
      const chip = doc.createElement('span');
      chip.className = `range-chip${prior ? '' : ' disabled'}`;
      chip.textContent = r;
      const wrap = doc.createElement('span');
      wrap.className = 'range-cell';
      wrap.append(chip);
      const keyIdx = RANGES.indexOf(r);
      if (keyIdx >= 0) {
        const kbd = doc.createElement('kbd');
        kbd.textContent = String(keyIdx + 1);
        wrap.append(' ', kbd);
      }
      td(wrap);
      td(`${formatDay(cur.start)} → ${formatDay(cur.end)} (${daysBetween(cur.start, cur.end)} days)`);
      td(prior ? `${formatDay(prior.truncated ? first : prior.start)} → ${formatDay(prior.end)}${prior.truncated ? ' (partial: the data starts here)' : ''}` : 'Unavailable: no earlier data');
      body.appendChild(tr);
    });
  }

  // ---------------- state + controls ----------------

  // The archive may span more years than the markup lists (a new year of history): add the buttons.
  function syncYearButtons() {
    const holder = $('.range-pill');
    const all = $('.time-btn[data-range="ALL"]', holder);
    if (!holder || !all) return;
    yearRanges(app.s.dates[0], app.s.dates[app.s.length - 1]).forEach((y) => {
      if ($(`.time-btn[data-range="${y}"]`, holder)) return;
      const b = doc.createElement('button');
      b.type = 'button';
      b.className = 'time-btn';
      b.dataset.range = y;
      b.setAttribute('aria-pressed', 'false');
      b.title = `Past ${y.slice(0, -1)} years`;
      b.textContent = y;
      b.addEventListener('click', () => setRange(y));
      holder.insertBefore(b, all);
    });
  }

  function syncControls() {
    const st = app.state;
    $$('.time-btn[data-range]').forEach((b) => {
      const on = b.dataset.range === st.range;
      b.classList.toggle('active', on);
      b.setAttribute('aria-pressed', String(on));
    });
    const maBtn = $('#toggle-ma-btn');
    if (maBtn) { maBtn.classList.toggle('active', st.ma); maBtn.setAttribute('aria-pressed', String(st.ma)); }
    const logBtn = $('#toggle-log-btn');
    if (logBtn) { logBtn.classList.toggle('active', st.log); logBtn.setAttribute('aria-pressed', String(st.log)); }
    updateComparisonButtonState();
    $$('.vel-mode-btn').forEach((b) => {
      const on = b.dataset.mode === st.vm;
      b.classList.toggle('active', on);
      b.setAttribute('aria-pressed', String(on));
    });
    $$('.rat-mode-btn').forEach((b) => {
      const on = b.dataset.mode === st.rm;
      b.classList.toggle('active', on);
      b.setAttribute('aria-pressed', String(on));
    });
    $$('.srv-mode-btn').forEach((b) => {
      const on = b.dataset.mode === st.sm;
      b.classList.toggle('active', on);
      b.setAttribute('aria-pressed', String(on));
    });
    $$('.surge-chip').forEach((c) => {
      const on = c.dataset.surge === st.range;
      c.classList.toggle('active', on);
      c.setAttribute('aria-pressed', String(on));
    });
    const reset = $('#reset-surge-btn');
    if (reset) reset.hidden = !app.view.surge;
    $$('.log-capable').forEach((el) => {
      el.classList.toggle('log-on', st.log);
      setText(el, st.log ? 'LOG' : 'LIN');
      el.title = st.log ? 'Logarithmic y-axis (press L for linear)' : 'Linear y-axis (press L for logarithmic)';
    });
    $$('.chart-comparison-legend').forEach((el) => { el.hidden = !app.view.prior; });
    $$('.ma-legend').forEach((el) => { el.hidden = !st.ma; });

    const v = app.view;
    setText($('#selected-range-label'), getRangeLabel(st.range));
    setText($('#selected-range-dates'), `${formatDay(v.bounds.start)} → ${formatDay(v.bounds.end)} · ${v.length} pts`);

    const metric = velocityMetric();
    const velSwatch = $('#section-velocity-chart');
    if (velSwatch) {
      velSwatch.style.setProperty('--vel-swatch', hexToRgba(app.colors[metric], 0.78));
    }
    const velSub = $('#velocity-chart-subtitle');
    if (velSub) {
      const text = {
        net_active: 'Day-over-day net change of monthly active users (30-day window), joinmastodon.org. Bars are gaps on flagged or missing days.',
        net_total: 'Day-over-day net change of total users: sign-ups minus deletions and servers that stop reporting. Bars are gaps on flagged or missing days.',
        growth_mau: 'Net change of monthly active users as a share of the previous day’s count. Bars are gaps on flagged or missing days.',
        growth_signups: 'Net change of total users as a share of the previous day’s count. Bars are gaps on flagged or missing days.'
      }[metric];
      const surgeStats = v.surge ? computeSurgeStats(v.surge, app.s) : null;
      const rawMove = surgeStats && v.surge.artifact ? rawMoves(surgeStats) : '';
      setText(velSub, v.surge ? `${v.surge.title}: ${v.surge.description}${rawMove ? ` Raw archive: ${rawMove}.` : ''}` : text);
    }
    const velHeading = $('#velocity-chart-heading');
    if (velHeading) {
      const title = { net_active: 'MAU health', net_total: 'Net signups', growth_mau: 'MAU growth', growth_signups: 'Signup growth' }[metric];
      const sub = { net_active: 'net change of active users per day', net_total: 'net change of total users per day', growth_mau: 'MAU change, % per day', growth_signups: 'total users change, % per day' }[metric];
      velHeading.innerHTML = `${escapeHtml(title)} <span class="h-sub">${escapeHtml(sub)}</span>`;
    }
    const pctBtn = $('.vel-mode-btn[data-mode="pct"]');
    if (pctBtn) pctBtn.title = `Percentage growth of ${st.vb === 'signups' ? 'total users' : 'monthly active users'} per day (the metric you picked last)`;
    const ratSub = $('#rat-chart-subtitle');
    if (ratSub) {
      setText(ratSub, {
        engagement: 'Monthly active users ÷ total users: the share of accounts that were active in the last 30 days',
        posts_per_mau: 'FediDB posts per day ÷ joinmastodon monthly active users: two sources, so read the trend, not the level',
        users_per_server: 'Total users ÷ servers (joinmastodon): the average size of a reporting server'
      }[st.rm]);
    }
    const srvSub = $('#srv-chart-subtitle');
    if (srvSub) {
      setText(srvSub, st.sm === 'users_per_server'
        ? 'Total users ÷ servers: the average size of a server that reports to joinmastodon.org.'
        : 'Servers that report to joinmastodon.org. Dots: FediDB’s count of Mastodon-software servers (a different base).');
    }
    const priorRange = $('#prior-range-dates');
    if (priorRange) {
      priorRange.hidden = !v.prior;
      if (v.prior) {
        setText(priorRange, v.prior.truncated
          ? `PRIOR ${formatDay(app.s.dates[0])} → ${formatDay(v.prior.end)} (PARTIAL)`
          : `PRIOR ${formatDay(v.prior.start)} → ${formatDay(v.prior.end)}`);
        priorRange.title = v.prior.truncated
          ? `The prior period would start on ${formatDay(v.prior.start)}, before the data begins, so it covers fewer days than the current range.`
          : '';
      }
    }
  }

  function writeHash() {
    const hash = serializeHashState(app.state);
    if (root.location.hash !== hash) {
      try { root.history.replaceState(null, '', hash); } catch (e) { root.location.hash = hash; }
    }
  }

  function applyState(opts) {
    const o = opts || {};
    if (app.state.range === 'ALL') app.state.cmp = false;
    if (!findSurge(app.state.range)) app.lastStdRange = app.state.range;
    const prevBounds = app.view ? `${app.view.bounds.start}|${app.view.bounds.end}` : '';
    computeView();
    const rangeChanged = prevBounds !== `${app.view.bounds.start}|${app.view.bounds.end}`;
    syncControls();
    updateCards();
    updateCharts(rangeChanged);
    renderTable();
    if (o.writeHash) writeHash();
  }

  // Leaving a surge window (RESET, a range button or key) restores the velocity mode selected before it.
  function restoreVelocityMode() {
    if (!app.vmBeforeSurge) return;
    app.state.vm = app.vmBeforeSurge.vm;
    app.state.vb = app.vmBeforeSurge.vb;
    app.vmBeforeSurge = null;
  }

  function setRange(range, opts) {
    if (!isValidRange(range, app.years)) return;
    if (findSurge(app.state.range) && !findSurge(range)) restoreVelocityMode();
    app.state.range = range;
    applyState({ writeHash: true, ...(opts || {}) });
  }

  function toggleCompare() {
    if (app.state.range === 'ALL') {
      app.state.range = '1Y';
      app.state.cmp = true;
    } else {
      app.state.cmp = !app.state.cmp;
    }
    applyState({ writeHash: true });
  }

  // Picking a surge shows the signups view (what the window is about).
  function enterSurge(id) {
    if (!findSurge(app.state.range)) app.vmBeforeSurge = { vm: app.state.vm, vb: app.state.vb };
    if (app.state.vm === 'mau') app.state.vm = 'signups';
    setRange(id);
    const sec = $('#section-velocity-chart');
    if (sec && sec.getBoundingClientRect().top < 0) sec.scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth', block: 'start' });
  }

  function leaveSurge() {
    setRange(app.lastStdRange || DEFAULT_STATE.range);
  }

  function setVelocityMode(mode) {
    if (mode === app.state.vm) return;
    if (mode === 'pct') {
      app.state.vb = app.state.vm === 'signups' ? 'signups' : 'mau';
    } else {
      app.state.vb = mode;
    }
    app.state.vm = mode;
    applyState({ writeHash: true });
  }

  // The HUD example in the guide is the newest MAU reading, with the date its 1Y prior period aligns to.
  function renderGuideDemo() {
    const s = app.s;
    const i = lastIndexWhere(s.active, (x) => x != null);
    if (i < 0) return;
    const d = s.dates[i];
    const span = daysBetween(addMonths(d, -12), d);
    const pj = i - span;
    const set = (id, text) => setText($(`#${id}`), text);
    set('hud-demo-title', `${['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'][new Date(`${d}T00:00:00Z`).getUTCDay()]} ${formatDay(d)}`);
    set('hud-demo-value', formatInteger(s.active[i]));
    const m = ma('active')[i];
    set('hud-demo-sub', [s.net_active[i] == null ? '' : `Δ ${formatSigned(s.net_active[i])}`, m == null ? '' : `7D ${formatCompact(m)}`].filter(Boolean).join(' · '));
    const pv = pj >= 0 ? ma('active')[pj] : null;
    set('hud-demo-prior-label', `Prior · ${pj >= 0 ? formatDay(s.dates[pj]) : '—'}`);
    set('hud-demo-prior-value', pv == null ? '—' : formatInteger(pv));
    set('hud-demo-note', pj >= 0 ? `Prior period date: ${formatDay(s.dates[pj])}` : 'No earlier data for the prior period');
  }

  function openGuide() {
    const dlg = $('#guide-dialog');
    if (!dlg) return;
    renderGuideRanges();
    renderGuideDemo();
    if (dlg.open) return;
    if (typeof dlg.showModal === 'function') dlg.showModal();
    else dlg.setAttribute('open', '');
  }

  function closeGuide() {
    const dlg = $('#guide-dialog');
    if (!dlg) return;
    if (typeof dlg.close === 'function') dlg.close();
    else dlg.removeAttribute('open');
  }

  function wireControls() {
    $$('.time-btn[data-range]').forEach((b) => b.addEventListener('click', () => setRange(b.dataset.range)));
    const maBtn = $('#toggle-ma-btn');
    if (maBtn) maBtn.addEventListener('click', () => { app.state.ma = !app.state.ma; applyState({ writeHash: true }); });
    const logBtn = $('#toggle-log-btn');
    if (logBtn) logBtn.addEventListener('click', () => { app.state.log = !app.state.log; applyState({ writeHash: true }); });
    const cmpBtn = $('#toggle-compare-btn');
    if (cmpBtn) cmpBtn.addEventListener('click', toggleCompare);
    $$('.vel-mode-btn').forEach((b) => b.addEventListener('click', () => setVelocityMode(b.dataset.mode)));
    $$('.rat-mode-btn').forEach((b) => b.addEventListener('click', () => {
      if (b.dataset.mode === app.state.rm) return;
      app.state.rm = b.dataset.mode;
      applyState({ writeHash: true });
    }));
    $$('.srv-mode-btn').forEach((b) => b.addEventListener('click', () => {
      if (b.dataset.mode === app.state.sm) return;
      app.state.sm = b.dataset.mode;
      applyState({ writeHash: true });
    }));
    $$('.surge-chip').forEach((c) => c.addEventListener('click', () => {
      if (app.state.range === c.dataset.surge) leaveSurge();
      else enterSurge(c.dataset.surge);
    }));
    const reset = $('#reset-surge-btn');
    if (reset) reset.addEventListener('click', leaveSurge);
    $$('.reset-zoom-btn').forEach((b) => b.addEventListener('click', () => {
      const chart = app.charts[b.dataset.chart];
      if (chart && chart.resetZoom) { chart.resetZoom(); onZoomChange(b.dataset.chart, chart); }
    }));
    $$('.export-png-btn').forEach((b) => b.addEventListener('click', () => exportPNG(b.dataset.chart)));
    $$('.export-csv-btn').forEach((b) => b.addEventListener('click', () => exportCSV(b.dataset.chart)));
    const openBtn = $('#open-guide-btn');
    if (openBtn) openBtn.addEventListener('click', openGuide);
    $$('.open-guide-link').forEach((b) => b.addEventListener('click', openGuide));
    const dlg = $('#guide-dialog');
    if (dlg) {
      dlg.addEventListener('click', (e) => { if (e.target === dlg) closeGuide(); });
      $$('[data-close-guide]', dlg).forEach((b) => b.addEventListener('click', closeGuide));
    }
    const pause = $('#ticker-pause');
    if (pause) {
      pause.addEventListener('click', () => {
        const tape = $('#ticker');
        const paused = tape.classList.toggle('paused');
        pause.setAttribute('aria-pressed', String(paused));
        pause.classList.toggle('is-paused', paused);
      });
    }
    const refresh = $('#refresh-data-btn');
    if (refresh) refresh.addEventListener('click', () => { refresh.disabled = true; root.location.reload(); });

    doc.addEventListener('keydown', (e) => {
      if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey) return;
      const t = e.target;
      if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
      const dlgOpen = dlg && dlg.open;
      if (e.key === '?') { e.preventDefault(); if (dlgOpen) closeGuide(); else openGuide(); return; }
      if (dlgOpen) return;
      if (/^[1-8]$/.test(e.key)) { e.preventDefault(); setRange(RANGES[Number(e.key) - 1]); return; }
      const k = e.key.toLowerCase();
      if (k === 'm') { e.preventDefault(); app.state.ma = !app.state.ma; applyState({ writeHash: true }); }
      else if (k === 'l') { e.preventDefault(); app.state.log = !app.state.log; applyState({ writeHash: true }); }
      else if (k === 'c') { e.preventDefault(); toggleCompare(); }
    });

    root.addEventListener('hashchange', () => {
      const next = parseHashState(root.location.hash, app.years);
      const cur = app.state;
      if (!findSurge(next.range)) app.vmBeforeSurge = null;
      if (['range', 'ma', 'log', 'cmp', 'vm', 'vb', 'rm', 'sm'].every((k) => next[k] === cur[k])) return;
      app.state = { ...next };
      applyState();
    });
  }

  function showFatal(message) {
    setStatus('error', message);
    const banner = $('#data-error');
    if (banner) {
      banner.hidden = false;
      setText($('.data-error-msg', banner), message);
    }
  }

  function init() {
    try {
      // historicalData.js declares a top-level const, which classic scripts share but window does not expose.
      const data = typeof historicalData !== 'undefined' ? historicalData : null;
      if (!Array.isArray(data) || data.length < 2) throw new Error('historicalData.js failed to load or is empty.');
      app.data = data;
      app.s = buildSeries(data);
      app.pre = computePrerenderValues(data, app.s);
      app.years = yearRanges(app.s.dates[0], app.s.dates[app.s.length - 1]);
      app.state = parseHashState(root.location.hash, app.years);
      readColors();
      paintPrerender();
      syncJsonLd();
      renderTicker();
      renderMilestones();
      renderStrip();
      renderSurgeChips();
      syncYearButtons();
      const lastDate = app.s.dates[app.s.length - 1];
      const allBtn = $('.time-btn[data-range="ALL"]');
      if (allBtn) allBtn.title = `All history since ${formatDay(app.s.dates[0])} (key 8)`;
      const dataThru = $('#last-updated-time');
      if (dataThru) dataThru.title = formatTooltip(lastDate);
      setStatus('archive', `Archived data through ${formatDay(lastDate)}.`);
      startClock();
      computeView();
      createCharts();
      wireControls();
      applyState();
      const usersEl = $('#kpi-users-value');
      const iT = lastIndexWhere(app.s.total, (x) => x != null);
      if (usersEl && iT >= 0 && !app.live.reading) {
        const lastNet = app.s.net_total[app.s.length - 1];
        animateNumber(usersEl, app.s.total[iT] - Math.max(0, Math.round(lastNet || 0)), app.s.total[iT], 1400);
      }
      root.setTimeout(() => { doc.documentElement.dataset.ready = 'true'; }, reducedMotion() ? 0 : 1500);
      fetchLive();
    } catch (err) {
      if (root.console) root.console.error('Mastodon terminal failed to initialise.', err);
      showFatal(err && err.message ? err.message : 'Unknown error');
      doc.documentElement.dataset.ready = 'error';
    }
  }

  root.MastodonTerminal = Object.assign({}, pure, { app, charts: app.charts, setRange, applyState });
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', init);
  else init();
})(typeof window !== 'undefined' ? window : globalThis);
