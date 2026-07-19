// Historical data is now loaded from historicalData.js

// Configuration
const API_URL = "https://api.joinmastodon.org/statistics";
let totalChartInstance = null;
let activeChartInstance = null;
let lastDataLoadTime = null;

// Format numbers
const formatNumber = (num) => {
    if (num >= 1000000) return (num / 1000000).toFixed(2) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toLocaleString();
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

    return { labels, totalUsers, activeUsers, raw: sortedData };
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
            datasets: [{
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
            }]
        },
        options: commonOptions
    });

    activeChartInstance = new Chart(ctxActive, {
        type: 'line',
        data: {
            labels: data.labels,
            datasets: [{
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
            }]
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
