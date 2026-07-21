const test = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const {
    buildChartCSV,
    calculateMovingAverage,
    calculatePeriodComparison,
    filterDataByRange,
    parseArchiveDate,
    processData,
    resetChartZoom
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

test('data updater skips records matching today UTC date', () => {
    const todayUTC = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    const apiRecords = [
        { period: yesterday, user_count: '10000000', active_user_count: '700000' },
        { period: todayUTC, user_count: '50000', active_user_count: '1000' }
    ];
    const tmpFile = path.join(__dirname, '_test_hist_skip.js');
    try {
        fs.writeFileSync(tmpFile, 'const historicalData = [];');
        const script = `
            global.fetch = async () => ({ ok: true, json: async () => ${JSON.stringify(apiRecords)} });
            process.env.HIST_FILE_OVERRIDE = ${JSON.stringify(tmpFile)};
            require('./updateData.js');
        `;
        const result = spawnSync(process.execPath, ['-e', script], {
            cwd: __dirname,
            encoding: 'utf8'
        });
        assert.match(result.stdout, /Skipped 1 record/);
        const content = fs.readFileSync(tmpFile, 'utf8');
        assert.ok(!content.includes(todayUTC), 'Today\'s partial data should not be in the archive');
        assert.ok(content.includes(yesterday), 'Yesterday\'s data should be in the archive');
    } finally {
        if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile);
    }
});

test('data updater rejects outlier records with >20% drop', () => {
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    const twoDaysAgo = new Date(Date.now() - 2 * 86400000).toISOString().split('T')[0];
    const archive = [
        { date: twoDaysAgo, total: 10000000, active: 700000 }
    ];
    const apiRecords = [
        { period: yesterday, user_count: '100000', active_user_count: '5000' }
    ];
    const tmpFile = path.join(__dirname, '_test_hist_outlier.js');
    try {
        fs.writeFileSync(tmpFile, `const historicalData = ${JSON.stringify(archive)};`);
        const script = `
            global.fetch = async () => ({ ok: true, json: async () => ${JSON.stringify(apiRecords)} });
            process.env.HIST_FILE_OVERRIDE = ${JSON.stringify(tmpFile)};
            require('./updateData.js');
        `;
        const result = spawnSync(process.execPath, ['-e', script], {
            cwd: __dirname,
            encoding: 'utf8'
        });
        assert.match(result.stderr, /Rejected outlier/);
        assert.equal(result.status, 1, 'Should exit nonzero when all records are rejected');
        assert.ok(!result.stdout.includes('Successfully merged'), 'Should not log success when all records are rejected');
        const content = fs.readFileSync(tmpFile, 'utf8');
        assert.ok(!content.includes(yesterday), 'Outlier data should have been rejected');
    } finally {
        if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile);
    }
});

test('data updater preserves archived records over new API data for same date', () => {
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    const archive = [
        { date: yesterday, total: 10000000, active: 700000 }
    ];
    // API returns slightly different (but valid) numbers for the same date
    const apiRecords = [
        { period: yesterday, user_count: '10000100', active_user_count: '700050' }
    ];
    const tmpFile = path.join(__dirname, '_test_hist_dedup.js');
    try {
        fs.writeFileSync(tmpFile, `const historicalData = ${JSON.stringify(archive)};`);
        const script = `
            global.fetch = async () => ({ ok: true, json: async () => ${JSON.stringify(apiRecords)} });
            process.env.HIST_FILE_OVERRIDE = ${JSON.stringify(tmpFile)};
            require('./updateData.js');
        `;
        spawnSync(process.execPath, ['-e', script], {
            cwd: __dirname,
            encoding: 'utf8'
        });
        const content = fs.readFileSync(tmpFile, 'utf8');
        // Archive value (10000000) should win over the API value (10000100)
        assert.ok(content.includes('10000000'), 'Archived total should be preserved');
        assert.ok(!content.includes('10000100'), 'API total should not overwrite archive');
    } finally {
        if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile);
    }
});

test('resetChartZoom resets totalChart and never touches activeChart', () => {
    let totalResetCount = 0;
    let activeResetCount = 0;
    const instances = {
        totalChart: { resetZoom: () => { totalResetCount += 1; } },
        activeChart: { resetZoom: () => { activeResetCount += 1; } }
    };
    resetChartZoom('totalChart', instances);
    assert.equal(totalResetCount, 1);
    assert.equal(activeResetCount, 0);
});

test('resetChartZoom resets activeChart and never touches totalChart', () => {
    let totalResetCount = 0;
    let activeResetCount = 0;
    const instances = {
        totalChart: { resetZoom: () => { totalResetCount += 1; } },
        activeChart: { resetZoom: () => { activeResetCount += 1; } }
    };
    resetChartZoom('activeChart', instances);
    assert.equal(activeResetCount, 1);
    assert.equal(totalResetCount, 0);
});

test('resetChartZoom does not throw for unknown chart ID or missing resetZoom', () => {
    assert.doesNotThrow(() => resetChartZoom('unknownChart', {}));
    assert.doesNotThrow(() => resetChartZoom('totalChart', { totalChart: {} }));
    assert.doesNotThrow(() => resetChartZoom('totalChart', { totalChart: null }));
});
