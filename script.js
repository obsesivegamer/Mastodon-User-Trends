// Historical data is loaded from historicalData.js

// Configuration & Global State
const API_URL = "https://api.joinmastodon.org/statistics";
let totalChartInstance = null;
let activeChartInstance = null;
let velocityChartInstance = null;
let showMovingAverage = false;
let showComparison = false;
let showVelocityChart = false;
let selectedRange = 'ALL';

const parseArchiveDate = (value) => {
    const dateOnlyMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (dateOnlyMatch) {
        const [, year, month, day] = dateOnlyMatch;
        return new Date(Number(year), Number(month) - 1, Number(day));
    }
    return new Date(value);
};

// Format numbers
const formatNumber = (num) => {
    if (num === null || num === undefined || isNaN(num)) return '--';
    const abs = Math.abs(num);
    const sign = num < 0 ? '-' : '';
    if (abs >= 1000000) return sign + (abs / 1000000).toFixed(2) + 'M';
    if (abs >= 1000) return sign + (abs / 1000).toFixed(1) + 'K';
    return num.toLocaleString();
};

// Calculate 7-day moving average
const calculateMovingAverage = (dataArray, key, window = 7) => {
    return dataArray.map((_, index) => {
        if (index < window - 1) return null;
        const slice = dataArray.slice(index - window + 1, index + 1);
        const sum = slice.reduce((acc, item) => acc + item[key], 0);
        return Math.round(sum / window);
    });
};

// Quantitative Financial & Terminal Analytics Helpers
const calculateEngagementRatio = (total, active) => {
    if (!total || total <= 0 || !active || active < 0) return '0.00%';
    const pct = (active / total) * 100;
    return pct.toFixed(2) + '%';
};

const calculateGrowthVelocity = (dataArray) => {
    if (!dataArray || dataArray.length < 2) {
        return { diff: 0, days: 1, ratePerDay: 0, formatted: '0 / day' };
    }
    const first = dataArray[0];
    const last = dataArray[dataArray.length - 1];
    const diff = last.total - first.total;

    const startDate = parseArchiveDate(first.date);
    const endDate = parseArchiveDate(last.date);
    const diffMs = Math.max(0, endDate - startDate);
    const days = Math.max(1, Math.round(diffMs / (1000 * 60 * 60 * 24)));

    const ratePerDay = Math.round(diff / days);
    const sign = ratePerDay >= 0 ? '+' : '';
    const formatted = `${sign}${formatNumber(ratePerDay)} / day`;

    return { diff, days, ratePerDay, formatted };
};

const calculateDailyDeltas = (dataArray, key = 'total') => {
    if (!dataArray || dataArray.length === 0) return [];
    return dataArray.map((item, index) => {
        if (index === 0) return 0;
        return item[key] - dataArray[index - 1][key];
    });
};

const generateSparklineSVG = (values, width = 120, height = 28) => {
    if (!values || values.length < 2) return '';
    const valid = values.filter(v => typeof v === 'number' && !isNaN(v));
    if (valid.length < 2) return '';

    const min = Math.min(...valid);
    const max = Math.max(...valid);
    const range = max - min || 1;
    const padding = 2;
    const innerHeight = height - padding * 2;
    const step = (width - padding * 2) / (values.length - 1);

    const points = values.map((val, idx) => {
        const x = (padding + idx * step).toFixed(1);
        const y = (height - padding - ((val - min) / range) * innerHeight).toFixed(1);
        return `${x},${y}`;
    });

    return `M ${points.join(' L ')}`;
};

// Process Data
const processData = (fullDataArray, range = 'ALL') => {
    // Sort chronologically
    const sortedData = [...fullDataArray].sort((a, b) => parseArchiveDate(a.date) - parseArchiveDate(b.date));

    // Calculate 7-day moving averages on FULL dataset
    const totalMA = calculateMovingAverage(sortedData, 'total');
    const activeMA = calculateMovingAverage(sortedData, 'active');

    // Filter to selected range
    const filteredData = filterDataByRange(range, sortedData);

    // Slice the MAs to match the filtered range
    const startIndex = filteredData.length > 0 ? sortedData.indexOf(filteredData[0]) : 0;
    const endIndex = filteredData.length > 0 ? startIndex + filteredData.length : 0;

    const filteredTotalMA = totalMA.slice(startIndex, endIndex);
    const filteredActiveMA = activeMA.slice(startIndex, endIndex);

    const labels = filteredData.map(d => {
        const dateObj = parseArchiveDate(d.date);
        return dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' });
    });
    const totalUsers = filteredData.map(d => d.total);
    const activeUsers = filteredData.map(d => d.active);
    const dailyTotalDeltas = calculateDailyDeltas(filteredData, 'total');

    return {
        labels,
        totalUsers,
        activeUsers,
        dailyTotalDeltas,
        totalMA: filteredTotalMA,
        activeMA: filteredActiveMA,
        raw: filteredData
    };
};

// Period Comparison
const calculatePeriodComparison = (range, dataArray) => {
    if (range === 'ALL') return null;

    const current = filterDataByRange(range, dataArray);
    if (current.length < 2) return null;

    const currentStartIndex = dataArray.findIndex(item => item === current[0]);
    if (currentStartIndex <= 0) return null;

    const previous = dataArray.slice(
        Math.max(0, currentStartIndex - current.length),
        currentStartIndex
    );
    return previous.length >= 2 ? processData(previous) : null;
};

// Update DOM Metrics
const updateMetrics = (data, periodLabel = 'All Time', comparisonData = null) => {
    if (data.raw.length === 0) return;

    const latest = data.raw[data.raw.length - 1];
    const previous = data.raw[0];

    const calcTrend = (current, past) => {
        const diff = current - past;
        let pct = 0;
        if (past > 0) {
            pct = (diff / past) * 100;
        }
        return { diff, pct };
    };

    const formatTrendText = (trend) => {
        const sign = trend.diff >= 0 ? '+' : '';
        const arrow = trend.diff >= 0 ? '▲' : '▼';
        return `${arrow} ${sign}${trend.pct.toFixed(2)}% (${sign}${formatNumber(trend.diff)}) ${periodLabel}`;
    };

    // 1. Total Users Card
    const totalEl = document.getElementById('val-total-users');
    if (totalEl) totalEl.textContent = formatNumber(latest.total);
    const totalTrend = calcTrend(latest.total, previous.total);
    const totalTrendEl = document.getElementById('trend-total');
    if (totalTrendEl) {
        totalTrendEl.textContent = formatTrendText(totalTrend);
        totalTrendEl.className = totalTrend.diff >= 0 ? 'trend up' : 'trend down';
    }

    // 2. Active Users Card
    const activeEl = document.getElementById('val-active-users');
    if (activeEl) activeEl.textContent = formatNumber(latest.active);
    const activeTrend = calcTrend(latest.active, previous.active);
    const activeTrendEl = document.getElementById('trend-active');
    if (activeTrendEl) {
        activeTrendEl.textContent = formatTrendText(activeTrend);
        activeTrendEl.className = activeTrend.diff >= 0 ? 'trend up' : 'trend down';
    }

    // 3. Engagement Ratio Card
    const engagementRatioEl = document.getElementById('val-engagement-ratio');
    if (engagementRatioEl) {
        engagementRatioEl.textContent = calculateEngagementRatio(latest.total, latest.active);
    }
    const latestEngagePct = latest.total > 0 ? (latest.active / latest.total) * 100 : 0;
    const prevEngagePct = previous.total > 0 ? (previous.active / previous.total) * 100 : 0;
    const engageDiff = latestEngagePct - prevEngagePct;
    const engageTrendEl = document.getElementById('trend-engagement');
    if (engageTrendEl) {
        const engageArrow = engageDiff >= 0 ? '▲' : '▼';
        const engageSign = engageDiff >= 0 ? '+' : '';
        engageTrendEl.textContent = `${engageArrow} ${engageSign}${engageDiff.toFixed(2)}% ${periodLabel}`;
        engageTrendEl.className = engageDiff >= 0 ? 'trend up' : 'trend down';
    }

    // 4. Net User Growth & Velocity Card
    const netGrowthDiff = latest.total - previous.total;
    const netGrowthPct = previous.total > 0 ? (netGrowthDiff / previous.total) * 100 : 0;
    const netGrowthTrend = { diff: netGrowthDiff, pct: netGrowthPct };
    const netGrowthEl = document.getElementById('val-net-growth');
    if (netGrowthEl) {
        const sign = netGrowthDiff > 0 ? '+' : '';
        netGrowthEl.textContent = `${sign}${formatNumber(netGrowthDiff)}`;
    }
    const netGrowthTrendEl = document.getElementById('trend-net-growth');
    if (netGrowthTrendEl) {
        netGrowthTrendEl.textContent = formatTrendText(netGrowthTrend);
        netGrowthTrendEl.className = netGrowthTrend.diff >= 0 ? 'trend up' : 'trend down';
    }

    const velocity = calculateGrowthVelocity(data.raw);
    const velocityEl = document.getElementById('val-growth-velocity');
    if (velocityEl) {
        velocityEl.textContent = velocity.formatted;
    }

    // Render Sparklines
    const setSparkline = (id, points) => {
        const path = document.querySelector(`#${id} path`);
        if (path) {
            path.setAttribute('d', generateSparklineSVG(points));
        }
    };

    setSparkline('sparkline-total', data.totalUsers);
    setSparkline('sparkline-active', data.activeUsers);
    setSparkline('sparkline-engagement', data.raw.map(d => d.total > 0 ? (d.active / d.total) * 100 : 0));
    setSparkline('sparkline-velocity', data.dailyTotalDeltas);

    // Comparison Subtitles
    const comparisonElements = {
        total: document.getElementById('comparison-total'),
        active: document.getElementById('comparison-active'),
        engagement: document.getElementById('comparison-engagement'),
        net: document.getElementById('comparison-net-growth')
    };

    Object.values(comparisonElements).forEach(element => {
        if (element) element.hidden = !showComparison;
    });

    if (!showComparison) return;
    if (!comparisonData || comparisonData.raw.length < 2) {
        Object.values(comparisonElements).forEach(element => {
            if (element) element.textContent = 'Previous period unavailable';
        });
        return;
    }

    const priorFirst = comparisonData.raw[0];
    const priorLast = comparisonData.raw[comparisonData.raw.length - 1];
    const priorTotalTrend = calcTrend(priorLast.total, priorFirst.total);
    const priorActiveTrend = calcTrend(priorLast.active, priorFirst.active);

    const priorStartEngage = priorFirst.total > 0 ? (priorFirst.active / priorFirst.total) * 100 : 0;
    const priorEndEngage = priorLast.total > 0 ? (priorLast.active / priorLast.total) * 100 : 0;
    const priorEngageDiff = priorEndEngage - priorStartEngage;

    if (comparisonElements.total) comparisonElements.total.textContent = `Prev period: ${formatTrendText(priorTotalTrend)}`;
    if (comparisonElements.active) comparisonElements.active.textContent = `Prev period: ${formatTrendText(priorActiveTrend)}`;
    if (comparisonElements.engagement) {
        const sign = priorEngageDiff >= 0 ? '+' : '';
        comparisonElements.engagement.textContent = `Prev period: ${sign}${priorEngageDiff.toFixed(2)}% engagement`;
    }
    if (comparisonElements.net) {
        const netSign = priorTotalTrend.diff >= 0 ? '+' : '';
        comparisonElements.net.textContent = `Prev period net: ${netSign}${formatNumber(priorTotalTrend.diff)}`;
    }
};

// Render Charts
const renderChart = (data) => {
    const canvasTotal = document.getElementById('totalChart');
    const canvasActive = document.getElementById('activeChart');
    const canvasVelocity = document.getElementById('velocityChart');

    if (!canvasTotal || !canvasActive) return;

    const ctxTotal = canvasTotal.getContext('2d');
    const ctxActive = canvasActive.getContext('2d');

    // Destroy existing chart instances
    if (totalChartInstance) totalChartInstance.destroy();
    if (activeChartInstance) activeChartInstance.destroy();
    if (velocityChartInstance) velocityChartInstance.destroy();

    // Institutional Terminal Palette
    const colorTotal = '#A78BFA';      // Violet
    const colorActive = '#38BDF8';     // Sky Cyan
    const colorGain = '#10B981';       // Emerald Green
    const colorLoss = '#F43F5E';       // Rose Red
    const gridColor = 'rgba(255, 255, 255, 0.04)';
    const textColor = '#94A3B8';

    // Gradients for area fills
    const gradientTotal = ctxTotal.createLinearGradient(0, 0, 0, 420);
    gradientTotal.addColorStop(0, 'rgba(167, 139, 250, 0.22)');
    gradientTotal.addColorStop(1, 'rgba(167, 139, 250, 0)');

    const gradientActive = ctxActive.createLinearGradient(0, 0, 0, 420);
    gradientActive.addColorStop(0, 'rgba(56, 189, 248, 0.22)');
    gradientActive.addColorStop(1, 'rgba(56, 189, 248, 0)');

    Chart.defaults.color = textColor;
    Chart.defaults.font.family = "'JetBrains Mono', 'Outfit', monospace";

    const commonOptions = {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
            mode: 'index',
            intersect: false,
        },
        plugins: {
            legend: { display: false },
            tooltip: {
                backgroundColor: 'rgba(15, 20, 31, 0.95)',
                titleColor: '#F8FAFC',
                bodyColor: '#94A3B8',
                borderColor: 'rgba(255, 255, 255, 0.12)',
                borderWidth: 1,
                padding: 12,
                cornerRadius: 8,
                titleFont: { family: "'Outfit', sans-serif", weight: '600', size: 13 },
                bodyFont: { family: "'JetBrains Mono', monospace", size: 12 },
                callbacks: {
                    label: function(context) {
                        const val = context.parsed.y;
                        const label = context.dataset.label || '';
                        return ` ${label}: ${val.toLocaleString()}`;
                    }
                }
            },
            zoom: {
                zoom: {
                    wheel: { enabled: true, speed: 0.1 },
                    pinch: { enabled: true },
                    mode: 'x',
                },
                pan: {
                    enabled: true,
                    mode: 'x',
                }
            }
        },
        scales: {
            x: {
                grid: { color: gridColor, drawBorder: false },
                ticks: {
                    maxTicksLimit: 10,
                    maxRotation: 0,
                    minRotation: 0,
                    color: textColor,
                    font: { size: 11 }
                }
            },
            y: {
                grid: { color: gridColor, drawBorder: false },
                ticks: {
                    callback: function(value) { return formatNumber(value); },
                    color: textColor,
                    font: { size: 11 }
                }
            }
        }
    };

    // 1. Total Users Chart
    totalChartInstance = new Chart(ctxTotal, {
        type: 'line',
        data: {
            labels: data.labels,
            datasets: [
                {
                    label: 'Total Users',
                    data: data.totalUsers,
                    borderColor: colorTotal,
                    backgroundColor: gradientTotal,
                    borderWidth: 2.5,
                    pointBackgroundColor: '#0B0F17',
                    pointBorderColor: colorTotal,
                    pointBorderWidth: 1.5,
                    pointRadius: data.labels.length > 90 ? 0 : 3,
                    pointHoverRadius: 5,
                    fill: true,
                    tension: 0.25
                },
                ...(showMovingAverage ? [{
                    label: '7-Day MA',
                    data: data.totalMA,
                    borderColor: 'rgba(167, 139, 250, 0.65)',
                    backgroundColor: 'transparent',
                    borderWidth: 1.75,
                    borderDash: [4, 4],
                    pointRadius: 0,
                    pointHoverRadius: 0,
                    fill: false,
                    tension: 0.25
                }] : [])
            ]
        },
        options: commonOptions
    });

    // 2. Active Users Chart
    activeChartInstance = new Chart(ctxActive, {
        type: 'line',
        data: {
            labels: data.labels,
            datasets: [
                {
                    label: 'Active Users',
                    data: data.activeUsers,
                    borderColor: colorActive,
                    backgroundColor: gradientActive,
                    borderWidth: 2.5,
                    pointBackgroundColor: '#0B0F17',
                    pointBorderColor: colorActive,
                    pointBorderWidth: 1.5,
                    pointRadius: data.labels.length > 90 ? 0 : 3,
                    pointHoverRadius: 5,
                    fill: true,
                    tension: 0.25
                },
                ...(showMovingAverage ? [{
                    label: '7-Day MA',
                    data: data.activeMA,
                    borderColor: 'rgba(56, 189, 248, 0.65)',
                    backgroundColor: 'transparent',
                    borderWidth: 1.75,
                    borderDash: [4, 4],
                    pointRadius: 0,
                    pointHoverRadius: 0,
                    fill: false,
                    tension: 0.25
                }] : [])
            ]
        },
        options: commonOptions
    });

    // 3. Optional Daily Net Change Velocity Histogram Chart
    const velocitySection = document.getElementById('section-velocity-chart');
    if (velocitySection && canvasVelocity) {
        if (showVelocityChart) {
            velocitySection.hidden = false;
            const ctxVelocity = canvasVelocity.getContext('2d');
            const deltas = data.dailyTotalDeltas;
            const barColors = deltas.map(val => val >= 0 ? colorGain : colorLoss);

            velocityChartInstance = new Chart(ctxVelocity, {
                type: 'bar',
                data: {
                    labels: data.labels,
                    datasets: [{
                        label: 'Net Daily Change',
                        data: deltas,
                        backgroundColor: barColors,
                        borderRadius: 3,
                        borderSkipped: false
                    }]
                },
                options: {
                    ...commonOptions,
                    scales: {
                        ...commonOptions.scales,
                        y: {
                            grid: { color: gridColor, drawBorder: false },
                            ticks: {
                                callback: function(value) {
                                    const sign = value > 0 ? '+' : '';
                                    return sign + formatNumber(value);
                                },
                                color: textColor,
                                font: { size: 11 }
                            }
                        }
                    }
                }
            });
        } else {
            velocitySection.hidden = true;
        }
    }
};

// UI Status
const setStatus = (mode) => {
    const statusEl = document.getElementById('data-status');
    if (!statusEl) return;
    const container = statusEl.parentElement;

    if (mode === 'live') {
        statusEl.textContent = 'Live Connected';
        container.className = 'status-indicator live';
    } else if (mode === 'fallback') {
        statusEl.textContent = 'Static Fallback';
        container.className = 'status-indicator fallback';
    } else if (mode === 'archive') {
        statusEl.textContent = 'Archive Verified';
        container.className = 'status-indicator archive';
    }
};

const formatTimestamp = (dateStr) => {
    const isDateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.test(dateStr);
    const date = parseArchiveDate(dateStr);

    if (isDateOnly) {
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }

    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 30) return `${diffDays}d ago`;

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const formatTooltip = (dateStr) => {
    const isDateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.test(dateStr);
    const date = parseArchiveDate(dateStr);
    if (isDateOnly) {
        return `Newest archive record: ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
    }
    return `Newest archive record: ${date.toLocaleString()}`;
};

const updateLastUpdatedDisplay = () => {
    const timeEl = document.getElementById('last-updated-time');
    if (!timeEl || !historicalData || historicalData.length === 0) return;

    const newestRecord = [...historicalData]
        .sort((a, b) => parseArchiveDate(a.date) - parseArchiveDate(b.date))
        .at(-1);

    timeEl.textContent = formatTimestamp(newestRecord.date);
    timeEl.title = formatTooltip(newestRecord.date);
};

const resetChartZoom = (chartId, instances) => {
    const map = instances || {
        totalChart: totalChartInstance,
        activeChart: activeChartInstance,
        velocityChart: velocityChartInstance
    };
    const chart = map[chartId];
    if (chart && typeof chart.resetZoom === 'function') {
        chart.resetZoom();
    }
};

const MAX_YEAR_BUTTONS = 6;

const buildYearRangeButtons = () => {
    const container = document.getElementById('year-range-container');
    if (!container || !historicalData || historicalData.length === 0) return;
    container.innerHTML = '';

    const earliest = parseArchiveDate(historicalData[0].date);
    const latest = parseArchiveDate(historicalData[historicalData.length - 1].date);
    const yearRanges = [];
    let year = 1;

    while (true) {
        const cutoff = new Date(latest);
        cutoff.setFullYear(cutoff.getFullYear() - year);
        yearRanges.push(`${year}Y`);
        if (cutoff <= earliest) break;
        year += 1;
    }

    if (yearRanges.length > MAX_YEAR_BUTTONS) {
        const select = document.createElement('select');
        select.className = 'year-range-select';
        select.setAttribute('aria-label', 'Select multi-year range');

        const placeholder = document.createElement('option');
        placeholder.value = '';
        placeholder.disabled = true;
        placeholder.selected = true;
        placeholder.textContent = 'YEARS';
        select.appendChild(placeholder);

        yearRanges.forEach(range => {
            const option = document.createElement('option');
            option.value = range;
            option.textContent = range;
            select.appendChild(option);
        });

        container.appendChild(select);
    } else {
        const buttonWrapper = document.createElement('div');
        buttonWrapper.className = 'year-range-buttons';

        yearRanges.forEach(range => {
            const btn = document.createElement('button');
            btn.className = 'time-btn';
            btn.dataset.range = range;
            btn.textContent = range;
            buttonWrapper.appendChild(btn);
        });

        container.appendChild(buttonWrapper);
    }
};

// Time Scale Filtering
const filterDataByRange = (range, dataArray) => {
    if (range === 'ALL' || dataArray.length === 0) return dataArray;

    const latest = parseArchiveDate(dataArray[dataArray.length - 1].date);
    let cutoff = new Date(latest);

    if (range === '1W') cutoff.setDate(cutoff.getDate() - 7);
    else if (range === '1M') cutoff.setMonth(cutoff.getMonth() - 1);
    else if (range === '6M') cutoff.setMonth(cutoff.getMonth() - 6);
    else if (range === 'YTD') {
        cutoff = new Date(latest.getFullYear(), 0, 1);
    } else if (/^\d+Y$/.test(range)) {
        const years = parseInt(range.replace('Y', ''), 10);
        cutoff.setFullYear(cutoff.getFullYear() - years);
    }

    return dataArray.filter(d => parseArchiveDate(d.date) >= cutoff);
};

const getRangeLabel = (range) => {
    if (/^\d+Y$/.test(range)) {
        const years = parseInt(range.replace('Y', ''), 10);
        return years === 1 ? 'Past Year' : `Past ${years} Years`;
    }

    const labels = {
        '1W': 'Past Week',
        '1M': 'Past Month',
        '6M': 'Past 6 Months',
        'YTD': 'Year to Date',
        'ALL': 'All Time'
    };
    return labels[range] || 'All Time';
};

const updateRangeLabel = (label) => {
    const labelEl = document.getElementById('selected-range-label');
    if (labelEl) {
        labelEl.textContent = label;
    }
};

const exportChartAsPNG = (canvasId, chartName) => {
    const canvas = document.getElementById(canvasId);
    if (!canvas) {
        console.error('Canvas not found:', canvasId);
        return;
    }

    const link = document.createElement('a');
    link.href = canvas.toDataURL('image/png');
    link.download = `${chartName}-${new Date().toISOString().split('T')[0]}.png`;
    link.click();
};

const buildChartCSV = (dataArray, isTotal) => {
    const dataType = isTotal ? 'total' : 'active';
    const header = `Date,${isTotal ? 'Total Users' : 'Active Users'}\n`;
    const rows = dataArray
        .map(d => `${d.date},${d[dataType]}`)
        .join('\n');
    return header + rows;
};

const exportChartAsCSV = (chartName, isTotal) => {
    if (!historicalData || historicalData.length === 0) {
        console.error('No data to export');
        return;
    }

    const filteredData = filterDataByRange(selectedRange, historicalData);
    const csv = buildChartCSV(filteredData, isTotal);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${chartName}-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
};

const applyFilter = (range) => {
    selectedRange = range;
    const processed = processData(historicalData, range);
    const rangeLabel = getRangeLabel(range);
    const comparisonData = showComparison
        ? calculatePeriodComparison(range, historicalData)
        : null;

    updateMetrics(processed, rangeLabel, comparisonData);
    renderChart(processed);
    updateRangeLabel(rangeLabel);
};

// Main Init Function
const initDashboard = () => {
    try {
        if (!historicalData || historicalData.length === 0) {
            throw new Error("No historical data found.");
        }

        updateLastUpdatedDisplay();
        buildYearRangeButtons();
        applyFilter('ALL');
        setStatus('archive');

        // Setup Reset Zoom buttons
        document.querySelectorAll('.reset-zoom-btn').forEach(btn => {
            btn.addEventListener('click', () => resetChartZoom(btn.dataset.chart));
        });

        // Setup refresh button
        const refreshBtn = document.getElementById('refresh-data-btn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                refreshBtn.classList.add('refreshing');
                refreshBtn.disabled = true;
                window.location.reload();
            });
        }

        // Setup export buttons
        document.querySelectorAll('.export-png-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const chartId = e.target.dataset.chart;
                let chartName = 'chart';
                if (chartId === 'totalChart') chartName = 'total-users';
                else if (chartId === 'activeChart') chartName = 'active-users';
                else if (chartId === 'velocityChart') chartName = 'daily-velocity';
                exportChartAsPNG(chartId, chartName);
            });
        });

        document.querySelectorAll('.export-csv-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const chartId = e.target.dataset.chart;
                const isTotal = chartId === 'totalChart';
                const chartName = isTotal ? 'total-users' : 'active-users';
                exportChartAsCSV(chartName, isTotal);
            });
        });

        // Setup moving average toggle
        document.querySelectorAll('.toggle-ma-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                showMovingAverage = !showMovingAverage;
                document.querySelectorAll('.toggle-ma-btn').forEach(toggle => {
                    toggle.classList.toggle('active', showMovingAverage);
                    toggle.setAttribute('aria-pressed', String(showMovingAverage));
                });
                applyFilter(selectedRange);
            });
        });

        // Setup Velocity chart toggle
        const velocityToggleBtn = document.getElementById('toggle-velocity-btn');
        if (velocityToggleBtn) {
            velocityToggleBtn.addEventListener('click', () => {
                showVelocityChart = !showVelocityChart;
                velocityToggleBtn.classList.toggle('active', showVelocityChart);
                velocityToggleBtn.setAttribute('aria-pressed', String(showVelocityChart));
                applyFilter(selectedRange);
            });
        }

        // Setup comparison toggle
        const compareBtn = document.querySelector('.compare-toggle-btn');
        if (compareBtn) {
            compareBtn.addEventListener('click', () => {
                showComparison = !showComparison;
                compareBtn.classList.toggle('active', showComparison);
                compareBtn.setAttribute('aria-pressed', String(showComparison));
                applyFilter(selectedRange);
            });
        }

        // Setup Event Listeners for Time Scale Buttons
        document.querySelectorAll('.time-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.time-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                const yearSelect = document.querySelector('.year-range-select');
                if (yearSelect) yearSelect.selectedIndex = 0;
                applyFilter(e.target.dataset.range);
            });
        });

        const yearSelect = document.querySelector('.year-range-select');
        if (yearSelect) {
            yearSelect.addEventListener('change', (e) => {
                document.querySelectorAll('.time-btn').forEach(b => b.classList.remove('active'));
                applyFilter(e.target.value);
            });
        }

    } catch (error) {
        console.error("Failed to load dashboard data.", error);
        const statusEl = document.getElementById('data-status');
        if (statusEl) {
            statusEl.textContent = 'Data Error';
            if (statusEl.parentElement) {
                statusEl.parentElement.style.backgroundColor = '#ff5555';
            }
        }
    }
};

// Start
if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', initDashboard);
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        buildChartCSV,
        calculateDailyDeltas,
        calculateEngagementRatio,
        calculateGrowthVelocity,
        calculateMovingAverage,
        calculatePeriodComparison,
        filterDataByRange,
        formatTimestamp,
        formatTooltip,
        generateSparklineSVG,
        getRangeLabel,
        parseArchiveDate,
        processData,
        resetChartZoom
    };
}
