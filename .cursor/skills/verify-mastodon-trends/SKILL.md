---
name: verify-mastodon-trends
description: Drive and verify the Mastodon User Trends analytics dashboard across range filters, period comparison overlays, indicator toggles, and charts. Use for /verify-mastodon-trends, verifying dashboard UI behavior, regressions, and visual evidence.
---

# Verify Mastodon User Trends Dashboard

The Mastodon User Trends dashboard is an institutional-grade financial and analytics terminal visualizing Fediverse network growth, monthly active users, engagement ratios, and growth velocity.

## Launch

Start a local static server from the repository root:

```bash
# Serve locally on port 8089 in background
python3 -m http.server 8089 &
SERVER_PID=$!
echo "Server PID: $SERVER_PID"
```

Verify readiness:
```bash
curl -fsS http://127.0.0.1:8089/index.html | grep -q "Mastodon Analytics Terminal" && echo "Dashboard ready at http://127.0.0.1:8089"
```

Teardown:
```bash
kill $SERVER_PID
```

Alternatively, use the built-in control script which handles server lifecycle automatically during verification:
```bash
python3 scripts/control-dashboard.py verify-compare
```

## Doctor

Before driving, run the read-only health check to ensure files, data integrity, tests, and headless browsers are functioning:

```bash
python3 scripts/control-dashboard.py doctor
```

The check verifies:
1. Core assets exist (`index.html`, `script.js`, `style.css`, `historicalData.js`, `script.test.js`).
2. `script.js` contains `calculatePeriodComparison`.
3. `index.html` contains chart comparison legends (`.chart-comparison-legend`).
4. All 22 Node.js unit tests pass (`node --test script.test.js`).
5. Playwright headless Chromium is installed and operational.

## Drive

The dashboard uses accessible, stable semantic handles for interaction:

| User Action | Stable Handle / Selector | Observable State Change |
|---|---|---|
| Toggle Period Comparison | `.compare-toggle-btn` | `aria-pressed="true"`, auto-transitions from `ALL` to `1Y`, adds secondary dashed dataset on Chart.js instances, unhides `.chart-comparison-legend` badges and `.comparison` card deltas |
| Change Date Range | `.time-btn[data-range="<RANGE>"]` | `.time-btn.active` moves to selected range, updates `#selected-range-label`, re-slices chart X-axes and metric values |
| Toggle 7D Moving Average | `#toggle-ma-btn` or `.toggle-ma-btn` | `aria-pressed="true"`, renders MA line dataset on line charts |
| Toggle Velocity Histogram | `#toggle-velocity-btn` or `.toggle-velocity-btn` | `aria-pressed="true"`, unhides `#section-velocity-chart` |
| Reset Chart Zoom | `.reset-zoom-btn[data-chart="<CHART_ID>"]` | Calls `Chart.getChart("<CHART_ID>").resetZoom()`, restores base axis scale |

## Evidence

Verification evidence is written to:
`artifacts/verify-mastodon-trends/`

Standards for proof:
1. Capture action, state change, and resulting screenshot (`proof-compare.png`).
2. Verify DOM state and Chart.js dataset state directly:
   - `window.Chart.getChart('totalChart').data.datasets.length == 2`
   - Prior period dataset has `borderDash: [5, 5]` and color `#F59E0B`.
   - Card deltas contain directional icons (`▲` / `▼`).
3. Retain screenshots and test outputs through teardown.

## Cleanup

1. Stop any background HTTP servers started by the run (e.g. `kill $SERVER_PID`).
2. Remove any temporary scratch files (e.g. `rm -f /tmp/dashboard-*.tmp`).
3. Never remove files inside `artifacts/verify-mastodon-trends/` — proof artifacts survive cleanup.

## Helpers

The repository includes an automated verification harness:

```bash
# Doctor check
python3 scripts/control-dashboard.py doctor

# Drive and verify Period Comparison with visual screenshot
python3 scripts/control-dashboard.py verify-compare --output artifacts/verify-mastodon-trends/proof-compare.png

# Drive and verify Velocity modes (MAU Health vs Signups) and Peak Surges
python3 scripts/control-dashboard.py verify-velocity --output artifacts/verify-mastodon-trends/proof-velocity.png

# Run all automated verification suites
python3 scripts/control-dashboard.py verify-all
```
