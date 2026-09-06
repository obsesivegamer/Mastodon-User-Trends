# Range Filtering

Range filtering segments the complete historical dataset into specific calendar windows (`1W`, `1M`, `6M`, `YTD`, `1Y`, `2Y`, `3Y`, `4Y`, `ALL`), dynamically re-rendering Chart.js line graphs, recalculating quantitative metric cards, and updating SVG sparklines.

## Sub-features

- `range-select`: Click any range button to immediately filter the view.
- `range-active-indicator`: Highlights the selected pill with `.time-btn.active`.
- `range-label-sync`: Updates the `#selected-range-label` text to match the selected period.
- `range-metric-calc`: Recalculates total growth, active user shifts, and annualized velocity across the active window.

## How to get to it (user POV)

- In the command bar under `RANGE`, click any pill: `1W`, `1M`, `6M`, `YTD`, `1Y`, `2Y`, `3Y`, `4Y`, or `ALL`.
- The charts and summary cards adjust instantaneously.

## Driving it with control-dashboard.py

Preconditions:
- Dashboard server is running on `http://127.0.0.1:8089`.
- Doctor checks pass.

- **Select 1M:** Click `.time-btn[data-range="1M"]`.
  ```python
  page.locator('.time-btn[data-range="1M"]').click()
  ```
- **Assert active pill:** Assert `.time-btn[data-range="1M"]` has class `active`.
- **Assert range label:** Assert `#selected-range-label` text equals `Past Month`.
- **Assert chart data points:** Query `Chart.getChart('totalChart').data.labels.length`. Assert it reflects approximately 30 days of data.
- **Select ALL:** Click `.time-btn[data-range="ALL"]`.
- **Assert full dataset:** Query `Chart.getChart('totalChart').data.labels.length`. Assert it matches `historicalData.length`.

## Gotchas

- When moving to `ALL` while Compare is active, Compare is automatically turned off or flagged as unsupported because `ALL` has no preceding window.
- Historical data contains daily snapshots; ranges count backwards in calendar time from the newest available snapshot.
