'use strict';
// Flags the days on which a metric in historicalData.js is not a trustworthy reading. Pure
// functions: no I/O, no clock. Consumers treat a flagged metric as missing (a gap in charts,
// skipped by averages, peaks, YoY and comparisons, no net change for that day); the raw value
// stays in the archive.
//
// What the 1471-row archive (2022-09-30 .. 2026-10-11, Wayback-filled) shows. joinmastodon's user_count is the sum
// over the servers its crawler reaches, so its failures are blocks of accounts entering or leaving
// that sum, not registrations:
//   1. A block of 0.1M..1.8M accounts enters or leaves and the level reverts a few days later
//      (2023-01-15..19, 2023-10-03..07 at -22%, 2023-10-16, 2023-11-16..21, 2024-02-08..11,
//      2024-12-11..21, 2026-02-10..13, 2026-05-16; the ~0.9M block also sat in the sum
//      2024-09-04..10-12). Active users barely move on most of those days.
//   2. A ~100K block is dropped in two equal daily steps and snaps back in one day (or the
//      reverse): 2024-02-29..03-03, 2024-03-09..13, 2024-05-08..09, 2025-02-20..23 (four equal
//      -70,731 steps, +277,714 back).
//   3. A block enters or leaves for good: one-day steps of 1.6..5.5% of the total with no ramp
//      before or after (KNOWN_STEPS). Two equal steps can bracket a long plateau (-411,287 on
//      2025-10-18, +412,280 on 2026-04-29): only the step days are flagged, the plateau between
//      them is valid data at a different level. A 30-day measure such as MAU cannot move 5..35%
//      in a day.
//   4. Real surges look different: many consecutive same-sign days that keep growing (Nov 2022
//      Musk wave, Jul 2023 Threads wave). They never return to the old level inside 14 days and
//      are never a single-day jump, so neither rule below touches them.
// The SURGE_DEFINITIONS peaks for Feb 2024 (2024-02-08) and Sep 2024 (2024-09-04) are items 1
// above, not growth: +934,029 and +917,435 total in one day with active +38,783 and +2,212,
// reverted by -1,032,485 on 2024-02-12 and -907,418 on 2024-10-13.

const METRICS = ['total', 'active', 'servers', 'statuses'];

// Hand-checked. `step`: a persistent level shift; only that day is flagged, because its net
// change is not growth (the new level is the baseline for everything after it, and no rolling
// excursion may start on or span it). `plateau`: every day from..to is displaced and the series
// returns afterwards, but later than the rolling rule's window.
const KNOWN_STEPS = [
  { from: '2023-01-26', to: '2023-01-26', kind: 'step', metrics: ['total', 'active'],
    note: 'total +304,830 (+5.1%), MAU +65,549 (+4.6%) in one day, 40-75x the days around it; the same ~300K size as the 15 Jan up / 20 Jan down block and the level stays: that block re-entered the sum for good' },
  { from: '2023-05-29', to: '2023-05-29', kind: 'step', metrics: ['total', 'active'],
    note: 'total +104,962 (+1.6%) and MAU +39,846 (+3.6%) in one day, 35x the days before it; the days after stay elevated (total +5K..+19K, MAU +11K..+15K a day for four days, then back to ~+2K), so a block entered the sum and some growth may follow it. Only this day\'s net change is dropped; the smallest step in this table' },
  { from: '2023-10-03', to: '2023-10-07', kind: 'plateau', metrics: ['total', 'active'],
    note: 'five days of undercount: total 6.355M..6.359M against 8.163M on 2 Oct and 8.768M on 8 Oct (-1.81M, -22%), MAU about 1.40M against 1.72M, while servers move only 8,807 -> 8,664; 8 Oct rebounds +2,409,614 / +421,416. The 8 Oct level is also 605K above 2 Oct (servers 8,664 -> 10,233), a new level, so that day itself is not flagged' },
  { from: '2024-01-18', to: '2024-01-18', kind: 'step', metrics: ['total', 'active'],
    note: 'total -476,749 (-5.5%) and MAU -478,914 (-32%) in one day: the two drop by the same count, a block of accounts left both figures; never fully returned' },
  { from: '2024-01-25', to: '2024-01-25', kind: 'step', metrics: ['total', 'active'],
    note: 'total +239,500 (+2.9%), MAU +24,898 (+2.5%) in one day, about 90x its neighbours; first of the +106K/+101K/+232K block jumps that run to 2024-02-13' },
  { from: '2024-03-22', to: '2024-04-09', kind: 'plateau', metrics: ['total'],
    note: 'a ~100K block drops out in two equal -48,452 steps on 22-23 Mar and returns +103,155 on 10 Apr: 19 days low, past the 14-day rolling window; growth either side is the normal ~2K a day' },
  { from: '2024-09-04', to: '2024-10-12', kind: 'plateau', metrics: ['total'],
    note: 'total +917,435 (+10.4%) on 4 Sep and -907,418 (-9.2%) on 13 Oct with MAU +2,212 / +2,950 and ordinary +3K days between: a ~0.9M block in the sum for 39 days, not a Brazil wave' },
  { from: '2025-01-30', to: '2025-02-08', kind: 'plateau', metrics: ['active'],
    note: 'MAU -355,131 (-35%) in one day while total moved +10,988, then a recovery that decays: +79,174, +28,691, +26,455, +14,877, +17,251, +15,679, +9,733, +12,903, +10,852 to 871,399 on 8 Feb, back at the ~+10K a day it ran at before. Total never moved. Ten days flagged; MAU is still ~14% under the 29 Jan level on 8 Feb and within ~3% of it only by 27 Feb, which the data cannot separate from real churn' },
  { from: '2025-10-18', to: '2025-10-18', kind: 'step', metrics: ['total', 'active'],
    note: 'total -411,287 (-4.2%) in one day with MAU -12,805 (about 5x its ~-2.5K a day slide); the level then stays 193 days until the equal and opposite +412,280 step on 2026-04-29. Only the two step days are flagged: the plateau between them is a valid reading at a different level' },
  { from: '2026-04-29', to: '2026-04-29', kind: 'step', metrics: ['total', 'active'],
    note: 'total +412,280 (+4.2%) and MAU +8,109 in one day, 170x its neighbours; undoes the -411,287 step of 2025-10-18, so the same ~0.41M block returns after a 193-day plateau' },
  { from: '2026-07-22', to: '2026-07-22', kind: 'step', metrics: ['total', 'active'],
    note: 'total -270,146 (-2.6%) and MAU -37,495 (-5.2%) in one day, 11x the ~+/-25K days around it, no ramp; level persists until the 2026-09-14 step' },
  { from: '2026-08-05', to: '2026-08-05', kind: 'step', metrics: ['active'],
    note: 'MAU -15,782 (-2.3%) in one day, about 12x its ordinary move, and it stays at 666K; total -31,468 sits inside its own +/-25K daily noise so only MAU is flagged. The smaller companion of the 2026-07-22 step' },
  { from: '2026-09-14', to: '2026-09-14', kind: 'step', metrics: ['total', 'active'],
    note: 'total +302,179 (+3.0%), MAU +40,240 (+5.9%) in one day with +2K days either side and no ramp; the mirror of the 2026-07-22 step (-270,146 / -37,495), so a block returning to the sum, not a real surge' },
];

// Rolling rule, per metric: find a day that leaves the level it followed by `enter`, then check
// the series comes back to that level (its own slope extrapolated, `ret` = how close counts as
// back) within `window` days and does not head back out the day after (nothing is flagged until
// the return is confirmed), that the move is at least `peakMin` large, and that it has sharp
// edges (a jump of at least `edge` x the displacement on both sides; `ramps` also accepts two or
// more same-direction steps on one side, the dropped-in-steps pattern). Fractions are of the
// level. Skipped where the series itself is moving faster than `maxSlope` of its level a day (a
// surge), and where the displacement is not at least 4x the ordinary daily move.
const ROLLING = {
  total: { enter: 0.0025, peakMin: 0.0075, ret: 0.4, edge: 0.6, ramps: true, window: 14, maxSlope: 0.002 },
  active: { enter: 0.01, peakMin: 0.04, ret: 0.4, edge: 0.75, ramps: true, window: 14, maxSlope: 0.02 },
  servers: { enter: 0.01, peakMin: 0.03, ret: 0.4, edge: 0.6, ramps: true, window: 14, maxSlope: 0.01 },
  statuses: { enter: 0.005, peakMin: 0.01, ret: 0.4, edge: 0.6, ramps: true, window: 14, maxSlope: 0.01 },
};
const SLOPE_SPAN = 15;
// A total excursion this large (percent of the level) is a block of accounts entering or leaving
// the sum. Active users are then flagged on the same days when their own entry and exit steps
// each exceed COMPANION_USUAL x the ordinary daily move and COMPANION_MIN of the level and point
// the same way as the total's (MAU is too noisy for the rolling rule to see these alone).
const COMPANION_MIN_PCT = 5;
const COMPANION_USUAL = 3;
const COMPANION_MIN = 0.01;

const DAY_MS = 86400e3;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const dayNum = (d) => Date.parse(d + 'T00:00:00Z') / DAY_MS;
const isNum = (n) => typeof n === 'number' && Number.isFinite(n);

function median(values) {
  if (!values.length) return 0;
  const s = [...values].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

// Median daily change around index i: the pace an ordinary day follows here.
function localSlope(s, i) {
  const ds = [];
  for (let k = Math.max(1, i - SLOPE_SPAN); k <= Math.min(s.length - 1, i + SLOPE_SPAN); k++) {
    const gap = s[k].day - s[k - 1].day;
    if (gap >= 1 && gap <= 3) ds.push((s[k].v - s[k - 1].v) / gap);
  }
  return median(ds);
}

// s: ascending [{date, day, v}]. barriers: dates no excursion may start on or cross.
function findExcursions(s, p, barriers) {
  const out = [];
  const flagged = new Set();
  const stepOf = (k) => s[k].v - s[k - 1].v;
  for (let i = 1; i < s.length; i++) {
    if (flagged.has(i) || barriers.has(s[i].date)) continue;
    let b = i - 1;
    while (b >= 0 && flagged.has(b)) b--;
    if (b < 0 || s[i].day - s[b].day > p.window) continue;
    const level = s[b].v;
    const g = localSlope(s, i);
    if (!(level > 0) || Math.abs(g) > p.maxSlope * level) continue;
    // At the head of the series the slope above only sees the left side, so a surge that has
    // run for a few days is also recognised from the median of the last five steps.
    const lastSteps = [];
    for (let k = i - 1; k >= 1 && lastSteps.length < 5; k--) {
      const gap = s[k].day - s[k - 1].day;
      if (gap >= 1 && gap <= 3) lastSteps.push((s[k].v - s[k - 1].v) / gap);
    }
    if (lastSteps.length >= 3 && Math.abs(median(lastSteps)) > p.maxSlope * level) continue;
    const usual = lastSteps.length >= 3 ? median(lastSteps.map(Math.abs)) : 0;
    const dev = (k) => s[k].v - (level + g * (s[k].day - s[b].day));
    const first = dev(i);
    if (Math.abs(first) < p.enter * level) continue;
    const sign = Math.sign(first);
    let peak = Math.abs(first);
    let found = -1;
    for (let j = i + 1; j < s.length && s[j].day - s[b].day <= p.window; j++) {
      if (barriers.has(s[j].date)) break;
      const d = dev(j);
      if (Math.sign(d) === sign && Math.abs(d) > p.ret * peak) {
        peak = Math.max(peak, Math.abs(d));
        continue;
      }
      if (Math.abs(d) <= p.ret * peak) found = j;
      break;
    }
    if (found < 0 || peak < p.peakMin * level) continue;
    // A glitch towers over the ordinary daily movement; in a surge it is just another big day.
    if (peak < 4 * usual) continue;
    // Confirmed only: the row after the return must not climb back toward the excursion. A dip
    // inside a rising surge returns for one day and then resumes climbing; and the newest day
    // alone can never confirm itself, so nothing at the head of the series is flagged on a hunch.
    if (found + 1 >= s.length || barriers.has(s[found + 1].date)) continue;
    const after = dev(found + 1);
    if (Math.sign(after) === sign && Math.abs(after) > p.ret * peak) continue;

    const move = (k) => Math.abs(stepOf(k) - g * (s[k].day - s[k - 1].day));
    const edge = p.edge * peak;
    const entry = move(i);
    const exit = move(found);
    // A ramp: two or more same-direction steps, each at least a fifth of the displacement.
    let entryRamp = 0;
    let exitRamp = 0;
    if (p.ramps) {
      let n = 0;
      let sum = 0;
      for (let k = i; k < found && Math.sign(stepOf(k)) === sign && move(k) >= 0.2 * peak; k++) {
        n++;
        sum += move(k);
      }
      if (n >= 2) entryRamp = sum;
      n = 0;
      sum = 0;
      for (let k = found; k >= i && Math.sign(stepOf(k)) === -sign && move(k) >= 0.2 * peak; k--) {
        n++;
        sum += move(k);
      }
      if (n >= 2) exitRamp = sum;
    }
    const sharp = (entry >= edge && exit >= edge) ||
      (entry >= edge && exitRamp >= edge) ||
      (exit >= edge && entryRamp >= edge);
    if (!sharp) continue;

    const days = [];
    for (let k = i; k < found; k++) {
      flagged.add(k);
      days.push(s[k].date);
    }
    out.push({ days, peak: Math.round(peak), peakPct: (peak / level) * 100, returned: s[found].date });
    i = found - 1;
  }
  return out;
}

// rows: ascending by date, unique dates. Returns [{rule, metric, from, to, days, note?, ...}].
function detect(rows) {
  const events = [];
  for (const metric of METRICS) {
    const has = rows.filter((r) => r && DATE_RE.test(r.date) && isNum(r[metric]));
    const known = KNOWN_STEPS.filter((e) => e.metrics.includes(metric));
    const barriers = new Set();
    const skipped = new Set();
    for (const e of known) {
      const days = has.filter((r) => r.date >= e.from && r.date <= e.to).map((r) => r.date);
      if (!days.length) continue;
      for (const d of days) (e.kind === 'step' ? barriers : skipped).add(d);
      events.push({ rule: 'known-step', metric, from: days[0], to: days[days.length - 1], days, kind: e.kind, note: e.note });
    }
    const series = has
      .filter((r) => !skipped.has(r.date))
      .map((r) => ({ date: r.date, day: dayNum(r.date), v: r[metric] }));
    for (const x of findExcursions(series, ROLLING[metric], barriers)) {
      events.push({ rule: 'rolling-excursion', metric, from: x.days[0], to: x.days[x.days.length - 1], days: x.days, peak: x.peak, peakPct: x.peakPct, returned: x.returned });
    }
  }
  // Companion rule: block-scale total excursions also mark active users.
  const act = rows.filter((r) => r && DATE_RE.test(r.date) && isNum(r.active));
  const at = new Map(act.map((r, i) => [r.date, i]));
  for (const e of events.filter((x) => x.rule === 'rolling-excursion' && x.metric === 'total' && x.peakPct >= COMPANION_MIN_PCT)) {
    const i = at.get(e.from);
    const j = at.get(e.returned);
    if (i === undefined || j === undefined || i < 6) continue;
    const stepIn = act[i].active - act[i - 1].active;
    const stepOut = act[j].active - act[j - 1].active;
    const usual = median(act.slice(i - 5, i).map((r, k) => Math.abs(r.active - act[i - 5 + k - 1].active)));
    const need = Math.max(COMPANION_USUAL * usual, COMPANION_MIN * act[i - 1].active);
    const totalIn = rows.find((r) => r.date === e.from).total - rows[rows.findIndex((r) => r.date === e.from) - 1].total;
    if (Math.abs(stepIn) >= need && Math.abs(stepOut) >= need && Math.sign(stepIn) === Math.sign(totalIn) && Math.sign(stepOut) === -Math.sign(stepIn)) {
      const days = e.days.filter((d) => at.has(d));
      events.push({ rule: 'companion-excursion', metric: 'active', from: days[0], to: days[days.length - 1], days, peak: Math.max(Math.abs(stepIn), Math.abs(stepOut)), peakPct: 0, returned: e.returned });
    }
  }
  return events.sort((a, b) => (a.from < b.from ? -1 : a.from > b.from ? 1 : METRICS.indexOf(a.metric) - METRICS.indexOf(b.metric)));
}

// Copies of rows with `flags` (metric keys in METRICS order) on days that have any; the key is
// absent otherwise. Deterministic: the same rows always give the same flags.
function flagRows(rows) {
  const byDate = new Map();
  for (const e of detect(rows)) {
    for (const d of e.days) {
      if (!byDate.has(d)) byDate.set(d, new Set());
      byDate.get(d).add(e.metric);
    }
  }
  return rows.map((r) => {
    const { flags, ...rest } = r;
    const set = byDate.get(r.date);
    return set ? { ...rest, flags: METRICS.filter((m) => set.has(m)) } : rest;
  });
}

const isFlagged = (row, metric) => Boolean(row && Array.isArray(row.flags) && row.flags.includes(metric));

module.exports = { METRICS, KNOWN_STEPS, ROLLING, detect, flagRows, isFlagged };
