const test = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');

const {
    buildChartCSV,
    calculateMovingAverage,
    calculatePeriodComparison,
    filterDataByRange,
    parseArchiveDate,
    processData
} = require('./script.js');

test('date-only archive values remain on the same local calendar date', () => {
    const date = parseArchiveDate('2026-07-19');
    assert.equal(date.getFullYear(), 2026);
    assert.equal(date.getMonth(), 6);
    assert.equal(date.getDate(), 19);
});

test('moving average is trailing and starts after seven records', () => {
    const data = Array.from({ length: 8 }, (_, index) => ({ date: `2026-07-${String(index + 1).padStart(2, '0')}`, total: index + 1, active: index + 1 }));
    assert.deepEqual(
        calculateMovingAverage(data, 'total'),
        [null, null, null, null, null, null, 4, 5]
    );
});

test('moving average retains context outside visual range when filtered', () => {
    const data = Array.from({ length: 14 }, (_, index) => ({
        date: `2026-07-${String(index + 1).padStart(2, '0')}`,
        total: 10,
        active: 10
    }));

    // Test 1W filter (last 7 days of the 14). It should have MA context from the first 7.
    const processed = processData(data, '1W');
    assert.equal(processed.raw.length, 8);

    // The MA for the first item in the filtered range should NOT be null, since it has 7 prior days in the full dataset
    assert.equal(processed.totalMA[0], 10);
});

test('formatTimestamp distinguishes date-only and relative phrasing', () => {
    const { formatTimestamp, formatTooltip } = require('./script.js');
    // Date only
    assert.match(formatTimestamp('2026-07-19'), /Jul 19, 2026/);
    assert.equal(formatTooltip('2026-07-19'), 'Newest archive record: Jul 19, 2026');

    // Relative (will be 'just now' since diff is ~0 ms)
    const nowStr = new Date().toISOString();
    assert.equal(formatTimestamp(nowStr), 'just now');
    assert.match(formatTooltip(nowStr), /Newest archive record:.*(AM|PM|:\d{2})/); // Contains time components
});

test('range filtering returns only the selected period', () => {
    const data = [
        { date: '2025-01-01', total: 1, active: 1 },
        { date: '2026-06-20', total: 2, active: 2 },
        { date: '2026-07-19', total: 3, active: 3 }
    ];
    assert.deepEqual(filterDataByRange('1M', data), data.slice(1));
});

test('period comparison uses observations immediately before the current range', () => {
    const data = Array.from({ length: 22 }, (_, index) => ({
        date: `2026-07-${String(index + 1).padStart(2, '0')}`,
        total: 100 + index,
        active: 50 + index
    }));
    const comparison = calculatePeriodComparison('1W', data);
    assert.ok(comparison);
    assert.equal(comparison.raw.at(-1).date, '2026-07-14');
    assert.equal(processData(filterDataByRange('1W', data)).raw[0].date, '2026-07-15');
});

test('CSV generation contains only the supplied filtered rows', () => {
    const csv = buildChartCSV([
        { date: '2026-07-18', total: 100, active: 50 },
        { date: '2026-07-19', total: 110, active: 55 }
    ], true);
    assert.equal(
        csv,
        'Date,Total Users\n2026-07-18,100\n2026-07-19,110'
    );
});

test('data updater exits unsuccessfully when the API returns no usable records', () => {
    const result = spawnSync(process.execPath, [
        '-e',
        "global.fetch=async()=>({ok:true,json:async()=>[]});require('./updateData.js')"
    ], {
        cwd: __dirname,
        encoding: 'utf8'
    });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /No valid data received from API/);
});
