// Historical data is loaded from historicalData.js

// Configuration & Global State
const API_URL = "https://api.joinmastodon.org/statistics";
let totalChartInstance = null;
let activeChartInstance = null;
let velocityChartInstance = null;
let showMovingAverage = false;
let showComparison = false;
let showVelocityChart = false;
let velocityMode = 'active'; // 'active' (MAU Health) | 'total' (Signups)
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

const calculateGrowthVelocity = (dataArray, key = 'total') => {
    if (!dataArray || dataArray.length < 2) {
        return { diff: 0, days: 1, ratePerDay: 0, formatted: '0 / day' };
    }
    const first = dataArray[0];
    const last = dataArray[dataArray.length - 1];
    const firstVal = first[key] !== undefined ? first[key] : (first.total !== undefined ? first.total : 0);
    const lastVal = last[key] !== undefined ? last[key] : (last.total !== undefined ? last.total : 0);
    const diff = lastVal - firstVal;

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
    const dailyActiveDeltas = calculateDailyDeltas(filteredData, 'active');

    return {
        labels,
        totalUsers,
        activeUsers,
        dailyTotalDeltas,
        dailyActiveDeltas,
        totalMA: filteredTotalMA,
        activeMA: filteredActiveMA,
        raw: filteredData
    };
};

// Period Comparison
const calculatePeriodComparison = (range, dataArray) => {
    if (range === 'ALL' || !dataArray || dataArray.length === 0) return null;

    const current = filterDataByRange(range, dataArray);
    if (current.length < 2) return null;

    const currentStartIndex = dataArray.findIndex(item => item === current[0]);
    if (currentStartIndex <= 0) return null;

    const previousStartIndex = Math.max(0, currentStartIndex - current.length);
    const previous = dataArray.slice(previousStartIndex, currentStartIndex);
    if (previous.length < 2) return null;

    const processed = processData(previous);
    // Align previous points with current length if previous had fewer points due to dataset boundary
    if (previous.length < current.length) {
        const padCount = current.length - previous.length;
        const nullPad = Array(padCount).fill(null);
        processed.totalUsers = [...nullPad, ...processed.totalUsers];
        processed.activeUsers = [...nullPad, ...processed.activeUsers];
        processed.dailyTotalDeltas = [...nullPad, ...processed.dailyTotalDeltas];
        processed.dailyActiveDeltas = [...nullPad, ...processed.dailyActiveDeltas];
        processed.labels = [...nullPad, ...processed.labels];
    }
    return processed;
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

    // 4. MAU Health & Velocity Card (Active user net change & run rate)
    const netGrowthDiff = latest.active - previous.active;
    const netGrowthPct = previous.active > 0 ? (netGrowthDiff / previous.active) * 100 : 0;
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

    const velocity = calculateGrowthVelocity(data.raw, 'active');
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
    setSparkline('sparkline-velocity', data.dailyActiveDeltas);

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
            if (element) {
                element.textContent = 'Previous period unavailable';
                element.className = 'comparison';
            }
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

    const formatPriorTrend = (trend) => {
        const sign = trend.diff >= 0 ? '+' : '';
        const arrow = trend.diff >= 0 ? '▲' : '▼';
        return `${arrow} ${sign}${trend.pct.toFixed(2)}% (${sign}${formatNumber(trend.diff)})`;
    };

    if (comparisonElements.total) {
        comparisonElements.total.textContent = `Prev: ${formatPriorTrend(priorTotalTrend)}`;
        comparisonElements.total.className = `comparison ${priorTotalTrend.diff >= 0 ? 'comp-up' : 'comp-down'}`;
    }
    if (comparisonElements.active) {
        comparisonElements.active.textContent = `Prev: ${formatPriorTrend(priorActiveTrend)}`;
        comparisonElements.active.className = `comparison ${priorActiveTrend.diff >= 0 ? 'comp-up' : 'comp-down'}`;
    }
    if (comparisonElements.engagement) {
        const sign = priorEngageDiff >= 0 ? '+' : '';
        const arrow = priorEngageDiff >= 0 ? '▲' : '▼';
        comparisonElements.engagement.textContent = `Prev: ${arrow} ${sign}${priorEngageDiff.toFixed(2)}%`;
        comparisonElements.engagement.className = `comparison ${priorEngageDiff >= 0 ? 'comp-up' : 'comp-down'}`;
    }
    if (comparisonElements.net) {
        const netSign = priorActiveTrend.diff >= 0 ? '+' : '';
        const netArrow = priorActiveTrend.diff >= 0 ? '▲' : '▼';
        comparisonElements.net.textContent = `Prev net: ${netArrow} ${netSign}${formatNumber(priorActiveTrend.diff)}`;
        comparisonElements.net.className = `comparison ${priorActiveTrend.diff >= 0 ? 'comp-up' : 'comp-down'}`;
    }
};

// Render Charts
const renderChart = (data, comparisonData = null) => {
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

    // Bloomberg Amber & Obsidian Terminal Palette
    const colorTotal = '#FFB000';      // Bloomberg Amber
    const colorActive = '#00E5FF';     // Electric Cyan
    const colorPrior = '#D97706';      // Muted Ochre for prior period comparison
    const colorGain = '#00D26A';       // Phosphor Green
    const colorLoss = '#F83F55';       // Crimson
    const gridColor = 'rgba(255, 255, 255, 0.035)';
    const textColor = '#9BA3AF';

    // Gradients for area fills - ultra-restrained 2-5% tint
    const gradientTotal = ctxTotal.createLinearGradient(0, 0, 0, 420);
    gradientTotal.addColorStop(0, 'rgba(255, 176, 0, 0.05)');
    gradientTotal.addColorStop(1, 'rgba(255, 176, 0, 0)');

    const gradientActive = ctxActive.createLinearGradient(0, 0, 0, 420);
    gradientActive.addColorStop(0, 'rgba(0, 229, 255, 0.05)');
    gradientActive.addColorStop(1, 'rgba(0, 229, 255, 0)');

    Chart.defaults.color = textColor;
    Chart.defaults.font.family = "'JetBrains Mono', 'IBM Plex Sans', monospace";

    const hasComparison = Boolean(showComparison && comparisonData && comparisonData.totalUsers);

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
                backgroundColor: '#0B0E14',
                titleColor: '#FFB000',
                bodyColor: '#F0F4F8',
                borderColor: '#2D3748',
                borderWidth: 1,
                padding: 10,
                cornerRadius: 2,
                titleFont: { family: "'IBM Plex Sans', sans-serif", weight: '600', size: 12 },
                bodyFont: { family: "'JetBrains Mono', monospace", size: 12 },
                callbacks: {
                    title: function(tooltipItems) {
                        const defaultTitle = tooltipItems && tooltipItems.length > 0 ? tooltipItems[0].label : '';
                        return hasComparison ? `Current Date: ${defaultTitle}` : defaultTitle;
                    },
                    label: function(context) {
                        const val = context.parsed.y;
                        if (val === null || val === undefined) return '';
                        const label = context.dataset.label || '';
                        if (label.includes('Prior Period') && comparisonData && comparisonData.labels) {
                            const priorDate = comparisonData.labels[context.dataIndex];
                            const dateSuffix = priorDate ? ` (${priorDate})` : '';
                            return ` Prior Period${dateSuffix}: ${val.toLocaleString()}`;
                        }
                        return ` ${label}: ${val.toLocaleString()}`;
                    },
                    footer: function() {
                        return hasComparison ? 'Parentheses show equivalent historical date' : '';
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
                    font: { size: 11, family: "'JetBrains Mono', monospace" }
                }
            },
            y: {
                grid: { color: gridColor, drawBorder: false },
                ticks: {
                    callback: function(value) { return formatNumber(value); },
                    color: textColor,
                    font: { size: 11, family: "'JetBrains Mono', monospace" }
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
                    borderWidth: 2,
                    pointBackgroundColor: '#080A0E',
                    pointBorderColor: colorTotal,
                    pointBorderWidth: 1.5,
                    pointRadius: data.labels.length > 90 ? 0 : 3,
                    pointHoverRadius: 5,
                    fill: true,
                    tension: 0.2
                },
                ...(showMovingAverage ? [{
                    label: '7-Day MA',
                    data: data.totalMA,
                    borderColor: 'rgba(255, 176, 0, 0.65)',
                    backgroundColor: 'transparent',
                    borderWidth: 1.5,
                    borderDash: [4, 4],
                    pointRadius: 0,
                    pointHoverRadius: 0,
                    fill: false,
                    tension: 0.2
                }] : []),
                ...(hasComparison ? [{
                    label: 'Total Users (Prior Period)',
                    data: comparisonData.totalUsers,
                    borderColor: colorPrior,
                    backgroundColor: 'transparent',
                    borderWidth: 1.75,
                    borderDash: [5, 5],
                    pointBackgroundColor: '#080A0E',
                    pointBorderColor: colorPrior,
                    pointBorderWidth: 1.5,
                    pointRadius: data.labels.length > 90 ? 0 : 2.5,
                    pointHoverRadius: 5,
                    fill: false,
                    tension: 0.2
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
                    borderWidth: 2,
                    pointBackgroundColor: '#080A0E',
                    pointBorderColor: colorActive,
                    pointBorderWidth: 1.5,
                    pointRadius: data.labels.length > 90 ? 0 : 3,
                    pointHoverRadius: 5,
                    fill: true,
                    tension: 0.2
                },
                ...(showMovingAverage ? [{
                    label: '7-Day MA',
                    data: data.activeMA,
                    borderColor: 'rgba(0, 229, 255, 0.65)',
                    backgroundColor: 'transparent',
                    borderWidth: 1.5,
                    borderDash: [4, 4],
                    pointRadius: 0,
                    pointHoverRadius: 0,
                    fill: false,
                    tension: 0.2
                }] : []),
                ...(hasComparison ? [{
                    label: 'Active Users (Prior Period)',
                    data: comparisonData.activeUsers,
                    borderColor: colorPrior,
                    backgroundColor: 'transparent',
                    borderWidth: 1.75,
                    borderDash: [5, 5],
                    pointBackgroundColor: '#080A0E',
                    pointBorderColor: colorPrior,
                    pointBorderWidth: 1.5,
                    pointRadius: data.labels.length > 90 ? 0 : 2.5,
                    pointHoverRadius: 5,
                    fill: false,
                    tension: 0.2
                }] : [])
            ]
        },
        options: commonOptions
    });

    // Toggle chart comparison legend badges
    document.querySelectorAll('.chart-comparison-legend').forEach(legend => {
        legend.hidden = !hasComparison;
    });

    // 3. Optional Daily Net Velocity Histogram Chart (Dual-Mode: MAU Health vs. Signups)
    const velocitySection = document.getElementById('section-velocity-chart');
    if (velocitySection && canvasVelocity) {
        if (showVelocityChart) {
            velocitySection.hidden = false;
            const ctxVelocity = canvasVelocity.getContext('2d');
            const isAct = velocityMode === 'active';
            const deltas = isAct ? data.dailyActiveDeltas : data.dailyTotalDeltas;
            const barColors = deltas.map(val => val >= 0 ? colorGain : colorLoss);
            const seriesLabel = isAct ? 'Net Active Change (MAU)' : 'Net Signups / Additions';

            // Sync heading and subtitle
            const velHeading = document.getElementById('velocity-chart-heading');
            const velSubtitle = document.getElementById('velocity-chart-subtitle');
            if (velHeading) {
                velHeading.textContent = isAct ? 'Daily Active User Velocity' : 'Daily Signups & Additions Velocity';
            }
            if (velSubtitle) {
                velSubtitle.textContent = isAct
                    ? 'Day-over-day net active user expansion (+) & contraction (-) (MAU Health)'
                    : 'Day-over-day net registered account additions & federated expansions (Signups)';
            }

            // Sync mode selector buttons
            const activeModeBtn = document.getElementById('vel-mode-active');
            const totalModeBtn = document.getElementById('vel-mode-total');
            if (activeModeBtn && totalModeBtn) {
                activeModeBtn.classList.toggle('active', isAct);
                activeModeBtn.setAttribute('aria-pressed', String(isAct));
                totalModeBtn.classList.toggle('active', !isAct);
                totalModeBtn.setAttribute('aria-pressed', String(!isAct));
            }

            velocityChartInstance = new Chart(ctxVelocity, {
                type: 'bar',
                data: {
                    labels: data.labels,
                    datasets: [{
                        label: seriesLabel,
                        data: deltas,
                        backgroundColor: barColors,
                        borderRadius: data.labels.length > 90 ? 0 : 2,
                        minBarLength: 2,
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

const exportVelocityCSV = () => {
    if (!historicalData || historicalData.length === 0) {
        console.error('No data to export');
        return;
    }

    const filteredData = filterDataByRange(selectedRange, historicalData);
    const isAct = velocityMode === 'active';
    const deltas = calculateDailyDeltas(filteredData, isAct ? 'active' : 'total');
    const header = `Date,${isAct ? 'Net Active Change' : 'Net Signups'}\n`;
    const rows = filteredData.map((d, i) => `${d.date},${deltas[i] || 0}`).join('\n');
    const csv = header + rows;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `daily-velocity-${isAct ? 'mau' : 'signups'}-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
};

const updateComparisonButtonState = () => {
    const compareBtn = document.querySelector('.compare-toggle-btn');
    if (!compareBtn) return;

    const canCompare = selectedRange !== 'ALL' && calculatePeriodComparison(selectedRange, historicalData) !== null;

    if (!canCompare) {
        compareBtn.classList.remove('active');
        compareBtn.setAttribute('aria-pressed', 'false');
        compareBtn.classList.add('range-unsupported');
        compareBtn.title = 'Period comparison unavailable for this range (select 1W, 1M, 6M, YTD, 1Y, or 2Y)';
    } else {
        compareBtn.classList.remove('range-unsupported');
        compareBtn.classList.toggle('active', showComparison);
        compareBtn.setAttribute('aria-pressed', String(showComparison));
        compareBtn.title = 'Toggle period comparison';
    }
};

const applyFilter = (range) => {
    selectedRange = range;
    const processed = processData(historicalData, range);
    const rangeLabel = getRangeLabel(range);
    const comparisonData = showComparison
        ? calculatePeriodComparison(range, historicalData)
        : null;

    updateMetrics(processed, rangeLabel, comparisonData);
    renderChart(processed, comparisonData);
    updateRangeLabel(rangeLabel);
    updateComparisonButtonState();
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
                else if (chartId === 'velocityChart') chartName = velocityMode === 'active' ? 'daily-active-velocity' : 'daily-signups-velocity';
                exportChartAsPNG(chartId, chartName);
            });
        });

        document.querySelectorAll('.export-csv-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const chartId = e.target.dataset.chart;
                if (chartId === 'velocityChart') {
                    exportVelocityCSV();
                } else {
                    const isTotal = chartId === 'totalChart';
                    const chartName = isTotal ? 'total-users' : 'active-users';
                    exportChartAsCSV(chartName, isTotal);
                }
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

        // Setup Velocity mode switcher (MAU Health vs Signups)
        document.querySelectorAll('.velocity-mode-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const mode = e.currentTarget.dataset.mode;
                if (!mode || mode === velocityMode) return;
                velocityMode = mode;
                applyFilter(selectedRange);
            });
        });

        // Setup Peak Signup Surges era chips
        document.querySelectorAll('.peak-chip').forEach(chip => {
            chip.addEventListener('click', () => {
                showVelocityChart = true;
                if (velocityToggleBtn) {
                    velocityToggleBtn.classList.add('active');
                    velocityToggleBtn.setAttribute('aria-pressed', 'true');
                }
                velocityMode = 'total';
                selectedRange = 'ALL';
                document.querySelectorAll('.time-btn').forEach(b => {
                    b.classList.toggle('active', b.dataset.range === 'ALL');
                });
                const yearSelectEl = document.querySelector('.year-range-select');
                if (yearSelectEl) yearSelectEl.selectedIndex = 0;
                applyFilter('ALL');
                const velSec = document.getElementById('section-velocity-chart');
                if (velSec) velSec.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            });
        });

        // Setup comparison toggle
        const compareBtn = document.querySelector('.compare-toggle-btn');
        if (compareBtn) {
            compareBtn.addEventListener('click', () => {
                // If on ALL or an unsupported range, automatically transition to 1Y
                if (selectedRange === 'ALL' || calculatePeriodComparison(selectedRange, historicalData) === null) {
                    showComparison = true;
                    document.querySelectorAll('.time-btn').forEach(b => {
                        b.classList.toggle('active', b.dataset.range === '1Y');
                    });
                    const yearSelect = document.querySelector('.year-range-select');
                    if (yearSelect) yearSelect.value = '1Y';
                    applyFilter('1Y');
                    return;
                }

                showComparison = !showComparison;
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

        // Setup Terminal Methodology & Reference Guide Dialog
        const guideDialog = document.getElementById('guide-dialog');
        const openGuideBtn = document.getElementById('open-guide-btn');
        const closeGuideBtn = document.getElementById('close-guide-btn');
        const guideDismissBtn = document.getElementById('guide-dismiss-btn');

        if (guideDialog) {
            const openModal = () => {
                if (typeof guideDialog.showModal === 'function') {
                    guideDialog.showModal();
                } else {
                    guideDialog.setAttribute('open', 'true');
                }
            };

            const closeModal = () => {
                if (typeof guideDialog.close === 'function') {
                    guideDialog.close();
                } else {
                    guideDialog.removeAttribute('open');
                }
            };

            if (openGuideBtn) {
                openGuideBtn.addEventListener('click', openModal);
            }

            if (closeGuideBtn) {
                closeGuideBtn.addEventListener('click', closeModal);
            }

            if (guideDismissBtn) {
                guideDismissBtn.addEventListener('click', closeModal);
            }

            // Close when clicking directly on dialog backdrop
            guideDialog.addEventListener('click', (e) => {
                if (e.target === guideDialog) {
                    closeModal();
                }
            });

            // Allow clicking comparison legend to open guide reference
            document.querySelectorAll('.chart-comparison-legend').forEach(legend => {
                legend.style.cursor = 'pointer';
                legend.setAttribute('title', 'Click to view Tooltip & Methodology Guide');
                legend.addEventListener('click', openModal);
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
        resetChartZoom,
        updateComparisonButtonState
    };
}
