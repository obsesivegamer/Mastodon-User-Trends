// Historical data is now loaded from historicalData.js

// Configuration
const API_URL = "https://api.joinmastodon.org/statistics";
let totalChartInstance = null;
let activeChartInstance = null;
let lastDataLoadTime = null;
let showMovingAverage = false;

// Format numbers
const formatNumber = (num) => {
    if (num >= 1000000) return (num / 1000000).toFixed(2) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toLocaleString();
};

// Calculate 7-day moving average
const calculateMovingAverage = (dataArray, key, window = 7) => {
    return dataArray.map((_, index) => {
        const start = Math.max(0, index - Math.floor(window / 2));
        const end = Math.min(dataArray.length, start + window);
        const slice = dataArray.slice(start, end);
        const sum = slice.reduce((acc, item) => acc + item[key], 0);
        return Math.round(sum / slice.length);
    });
};

// Process Data
const processData = (dataArray) => {
    // Sort chronologically
    const sortedData = [...dataArray].sort((a, b) => new Date(a.date) - new Date(b.date));
    
    const labels = sortedData.map(d => {
        const dateObj = new Date(d.date);
        return dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' });
    });
    const totalUsers = sortedData.map(d => d.total);
    const activeUsers = sortedData.map(d => d.active);
    
    // Calculate 7-day moving averages
    const totalMA = calculateMovingAverage(sortedData, 'total');
    const activeMA = calculateMovingAverage(sortedData, 'active');

    return { labels, totalUsers, activeUsers, totalMA, activeMA, raw: sortedData };
};

// Update DOM Metrics
const updateMetrics = (data, periodLabel = 'All Time') => {
    if (data.raw.length === 0) return;
    
    const latest = data.raw[data.raw.length - 1];
    const previous = data.raw[0]; // Compare against the start of the selected period

    document.getElementById('val-total-users').textContent = formatNumber(latest.total);
    document.getElementById('val-active-users').textContent = formatNumber(latest.active);

    const calcTrend = (current, past) => {
        const diff = current - past;
        let pct = 0;
        if (past > 0) {
            pct = (diff / past) * 100;
        }
        return { diff, pct };
    };

    const totalTrend = calcTrend(latest.total, previous.total);
    const activeTrend = calcTrend(latest.active, previous.active);

    // Calculate net new users (total growth in selected period)
    const newUsersDiff = latest.total - previous.total;
    const newUsersPct = previous.total > 0 ? (newUsersDiff / previous.total) * 100 : 0;
    const newUsersTrend = { diff: newUsersDiff, pct: newUsersPct };

    const formatTrendText = (trend) => {
        const sign = trend.diff >= 0 ? '+' : '';
        const arrow = trend.diff >= 0 ? '▲' : '▼';
        return `${arrow} ${sign}${trend.pct.toFixed(2)}% (${sign}${formatNumber(trend.diff)}) ${periodLabel}`;
    };

    const totalTrendEl = document.getElementById('trend-total');
    totalTrendEl.textContent = formatTrendText(totalTrend);
    totalTrendEl.className = totalTrend.diff >= 0 ? 'trend up' : 'trend down';

    const activeTrendEl = document.getElementById('trend-active');
    activeTrendEl.textContent = formatTrendText(activeTrend);
    activeTrendEl.className = activeTrend.diff >= 0 ? 'trend up' : 'trend down';

    // Update net new users metric
    const newUsersEl = document.getElementById('val-new-users');
    newUsersEl.textContent = formatNumber(newUsersDiff);
    
    const newUsersTrendEl = document.getElementById('trend-new-users');
    newUsersTrendEl.textContent = formatTrendText(newUsersTrend);
    newUsersTrendEl.className = newUsersTrend.diff >= 0 ? 'trend up' : 'trend down';
};

// Render Chart
const renderChart = (data) => {
    const ctxTotal = document.getElementById('totalChart').getContext('2d');
    const ctxActive = document.getElementById('activeChart').getContext('2d');
    
    // Destroy existing charts if updating
    if (totalChartInstance) totalChartInstance.destroy();
    if (activeChartInstance) activeChartInstance.destroy();

    // Chart styling vars (matching CSS)
    const colorPrimary = 'hsl(280, 100%, 70%)'; // Purple
    const colorSecondary = 'hsl(190, 100%, 60%)'; // Cyan
    const gridColor = 'rgba(255, 255, 255, 0.05)';
    const textColor = 'hsl(220, 10%, 70%)';

    // Gradients for fill
    const gradientTotal = ctxTotal.createLinearGradient(0, 0, 0, 400);
    gradientTotal.addColorStop(0, 'rgba(178, 102, 255, 0.2)');
    gradientTotal.addColorStop(1, 'rgba(178, 102, 255, 0)');

    const gradientActive = ctxActive.createLinearGradient(0, 0, 0, 400);
    gradientActive.addColorStop(0, 'rgba(51, 204, 255, 0.2)');
    gradientActive.addColorStop(1, 'rgba(51, 204, 255, 0)');

    Chart.defaults.color = textColor;
    Chart.defaults.font.family = "'Outfit', sans-serif";

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
                backgroundColor: 'rgba(18, 20, 32, 0.9)',
                titleColor: '#fff',
                bodyColor: '#ccc',
                borderColor: 'rgba(255,255,255,0.1)',
                borderWidth: 1,
                padding: 12,
                cornerRadius: 8,
                callbacks: {
                    label: function(context) {
                        return context.parsed.y.toLocaleString();
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
                    maxRotation: 45,
                    minRotation: 45,
                    includeBounds: true
                }
            },
            y: {
                grid: { color: gridColor, drawBorder: false },
                ticks: { callback: function(value) { return formatNumber(value); } }
            }
        }
    };

    totalChartInstance = new Chart(ctxTotal, {
        type: 'line',
        data: {
            labels: data.labels,
            datasets: [
                {
                    label: 'Total Users',
                    data: data.totalUsers,
                    borderColor: colorPrimary,
                    backgroundColor: gradientTotal,
                    borderWidth: 3,
                    pointBackgroundColor: '#121420',
                    pointBorderColor: colorPrimary,
                    pointBorderWidth: 2,
                    pointRadius: 4,
                    pointHoverRadius: 6,
                    fill: true,
                    tension: 0.4
                },
                ...(showMovingAverage ? [{
                    label: '7-Day Moving Average',
                    data: data.totalMA,
                    borderColor: 'rgba(178, 102, 255, 0.5)',
                    backgroundColor: 'transparent',
                    borderWidth: 2,
                    borderDash: [5, 5],
                    pointRadius: 0,
                    pointHoverRadius: 0,
                    fill: false,
                    tension: 0.4
                }] : [])
            ]
        },
        options: commonOptions
    });

    activeChartInstance = new Chart(ctxActive, {
        type: 'line',
        data: {
            labels: data.labels,
            datasets: [
                {
                    label: 'Active Users',
                    data: data.activeUsers,
                    borderColor: colorSecondary,
                    backgroundColor: gradientActive,
                    borderWidth: 3,
                    pointBackgroundColor: '#121420',
                    pointBorderColor: colorSecondary,
                    pointBorderWidth: 2,
                    pointRadius: 4,
                    pointHoverRadius: 6,
                    fill: true,
                    tension: 0.4
                },
                ...(showMovingAverage ? [{
                    label: '7-Day Moving Average',
                    data: data.activeMA,
                    borderColor: 'rgba(51, 204, 255, 0.5)',
                    backgroundColor: 'transparent',
                    borderWidth: 2,
                    borderDash: [5, 5],
                    pointRadius: 0,
                    pointHoverRadius: 0,
                    fill: false,
                    tension: 0.4
                }] : [])
            ]
        },
        options: commonOptions
    });
};

// Set UI Status
const setStatus = (mode) => {
    const statusEl = document.getElementById('data-status');
    const container = statusEl.parentElement;
    
    if (mode === 'live') {
        statusEl.textContent = 'Live Data Connected';
        container.className = 'status-indicator live';
    } else if (mode === 'fallback') {
        statusEl.textContent = 'Using Static Fallback Data';
        container.className = 'status-indicator fallback';
    } else if (mode === 'archive') {
        statusEl.textContent = 'Archived Data Loaded';
        container.className = 'status-indicator archive';
    }
};

const formatTimestamp = (date) => {
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

const updateLastUpdatedDisplay = () => {
    const timeEl = document.getElementById('last-updated-time');
    if (!timeEl || !lastDataLoadTime) return;
    
    timeEl.textContent = formatTimestamp(lastDataLoadTime);
    timeEl.title = lastDataLoadTime.toLocaleString();
};

const recordDataLoadTime = () => {
    lastDataLoadTime = new Date();
    updateLastUpdatedDisplay();
};

const resetChartZoom = () => {
    if (totalChartInstance && typeof totalChartInstance.resetZoom === 'function') {
        totalChartInstance.resetZoom();
    }
    if (activeChartInstance && typeof activeChartInstance.resetZoom === 'function') {
        activeChartInstance.resetZoom();
    }
};

const MAX_YEAR_BUTTONS = 6;

const buildYearRangeButtons = () => {
    const container = document.getElementById('year-range-container');
    if (!container || !historicalData || historicalData.length === 0) return;
    container.innerHTML = '';

    const earliest = new Date(historicalData[0].date);
    const latest = new Date(historicalData[historicalData.length - 1].date);
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

        const placeholder = document.createElement('option');
        placeholder.value = '';
        placeholder.disabled = true;
        placeholder.selected = true;
        placeholder.textContent = 'Year Ranges';
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

    const latest = new Date(dataArray[dataArray.length - 1].date);
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

    return dataArray.filter(d => new Date(d.date) >= cutoff);
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

const exportChartAsCSV = (chartName, isTotal) => {
    if (!historicalData || historicalData.length === 0) {
        console.error('No data to export');
        return;
    }
    
    const dataType = isTotal ? 'total' : 'active';
    const header = `Date,${isTotal ? 'Total Users' : 'Active Users'}\n`;
    const rows = historicalData
        .map(d => `${d.date},${d[dataType]}`)
        .join('\n');
    
    const csv = header + rows;
    
    const link = document.createElement('a');
    link.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
    link.download = `${chartName}-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
};

const applyFilter = (range) => {
    const filtered = filterDataByRange(range, historicalData);
    const processed = processData(filtered);
    const rangeLabel = getRangeLabel(range);
    
    updateMetrics(processed, rangeLabel);
    renderChart(processed);
    updateRangeLabel(rangeLabel);
};

// Main Init Function
const initDashboard = () => {
    try {
        if (!historicalData || historicalData.length === 0) {
            throw new Error("No historical data found.");
        }
        
        recordDataLoadTime();
        buildYearRangeButtons();
        applyFilter('ALL');
        setStatus('archive');
        
        document.querySelectorAll('.reset-zoom-btn').forEach(btn => {
            btn.addEventListener('click', resetChartZoom);
        });

        // Setup refresh button
        const refreshBtn = document.getElementById('refresh-data-btn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                refreshBtn.classList.add('refreshing');
                refreshBtn.disabled = true;
                
                setTimeout(() => {
                    recordDataLoadTime();
                    applyFilter(document.querySelector('.time-btn.active')?.dataset.range || 'ALL');
                    refreshBtn.classList.remove('refreshing');
                    refreshBtn.disabled = false;
                }, 500);
            });
        }

        // Setup export buttons
        document.querySelectorAll('.export-png-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const chartId = e.target.dataset.chart;
                const chartName = chartId === 'totalChart' ? 'total-users' : 'active-users';
                exportChartAsPNG(chartId, chartName);
            });
        });

        document.querySelectorAll('.export-csv-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const chartId = e.target.dataset.chart;
                const chartName = chartId === 'totalChart' ? 'total-users' : 'active-users';
                const isTotal = chartId === 'totalChart';
                exportChartAsCSV(chartName, isTotal);
            });
        });

        // Setup moving average toggle
        document.querySelectorAll('.toggle-ma-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                showMovingAverage = !showMovingAverage;
                btn.classList.toggle('active', showMovingAverage);
                
                // Re-render charts with current filter
                const activeRange = document.querySelector('.time-btn.active')?.dataset.range || 'ALL';
                applyFilter(activeRange);
            });
        });

        // Setup Event Listeners for Time Scale Buttons
        document.querySelectorAll('.time-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.time-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
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
        document.getElementById('data-status').textContent = 'Data Error';
        document.getElementById('data-status').parentElement.style.backgroundColor = '#ff5555';
    }
};

// Start
document.addEventListener('DOMContentLoaded', initDashboard);
