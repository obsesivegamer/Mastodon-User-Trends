// Number and date formatting shared by the browser (window.MastodonFormat) and Node (require).
// Pre-rendered numbers in index.html and the page's own numbers must be the same strings, so the
// rules below are the contract. Missing or non-finite input always gives an em dash.
//
//   formatInteger(10503903)        '10,503,903'
//   formatCompact(742)             '742'
//   formatCompact(728205)          '728.2K'       (1 decimal K below 1M)
//   formatCompact(10503903)        '10.50M'       (2 decimals M below 1B)
//   formatCompact(1017648892)      '1.018B'       (3 decimals B)
//   formatCompact(-48452)          '-48.5K'
//   formatCompact(999966)          '1.00M'        (rounded first, then the unit: never '1000.0K')
//   formatCompact(-0.3)            '0'
//   formatSigned(2415)             '+2.4K'        (always signed; 0 gives '+0')
//   formatSigned(-2415, false)     '-2,415'       (second argument false: full integer)
//   formatPct(1.234)               '1.23%'        (input is already a percentage; digits = 2)
//   formatSignedPct(-0.5)          '-0.50%'
//   formatDay('2026-10-11')        'Oct 11, 2026' (no local-time parsing)
//   formatUtcStamp('2026-10-12T03:17:44Z')  '2026-10-12 03:17 UTC'
(function (root) {
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
    else if (Number((a / 1e3).toFixed(1)) < 1e3) body = (a / 1e3).toFixed(1) + 'K';
    else if (Number((a / 1e6).toFixed(2)) < 1e3) body = (a / 1e6).toFixed(2) + 'M';
    else body = (a / 1e9).toFixed(3) + 'B';
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

  function formatDay(isoDate) {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(isoDate || '');
    if (!m) return '—';
    return `${MONTHS[Number(m[2]) - 1]} ${Number(m[3])}, ${m[1]}`;
  }

  function formatUtcStamp(iso) {
    const t = Date.parse(iso);
    if (Number.isNaN(t)) return '—';
    return new Date(t).toISOString().slice(0, 16).replace('T', ' ') + ' UTC';
  }

  const api = { formatInteger, formatCompact, formatSigned, formatPct, formatSignedPct, formatDay, formatUtcStamp };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.MastodonFormat = api;
})(typeof window !== 'undefined' ? window : globalThis);
