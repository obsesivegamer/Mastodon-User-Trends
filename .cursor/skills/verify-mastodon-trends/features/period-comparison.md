# Period Comparison

Period Comparison allows users to visually and quantitatively compare the currently viewed time period against the immediately preceding period of equal length, rendering dashed comparison datasets on line charts, unhiding comparison legend badges, and displaying directional delta percentages on metric cards.

## Sub-features

- `comp-toggle`: Toggles comparison state on and off via the command bar button.
- `comp-fallback`: Automatically transitions unsupported ranges (such as `ALL`) to `1Y` when Compare is clicked.
- `comp-chart-overlay`: Injects an amber dashed line dataset (`borderDash: [5, 5]`, color `#F59E0B`) into Total and Active users charts.
- `comp-legend`: Unhides header legend badges distinguishing Current vs. Prior Period lines.
- `comp-metric-deltas`: Displays color-coded percentage and absolute changes under quantitative cards.

## How to get to it (user POV)

- Click the `🔄 Compare` button in the sticky command bar under INDICATORS.
- If currently on `ALL`, clicking `🔄 Compare` will automatically select `1Y` and display the comparison.
- Hover over data points on the charts to see combined tooltips showing current vs. prior period metrics and observation dates.

## Driving it with control-dashboard.py

Preconditions:
- Dashboard server is running on `http://127.0.0.1:8089`.
- Doctor checks pass.
- Browser starts in default state with `ALL` active and Compare off.

- **Initial inspection:** Check that `.time-btn.active` is `ALL` and `.compare-toggle-btn` has `aria-pressed="false"`. Total Chart has 1 dataset.
- **Activate compare:** Click `.compare-toggle-btn`.
  ```python
  page.locator(".compare-toggle-btn").click()
  ```
- **Verify transition:** Assert `.time-btn.active` is now `1Y`, and `.compare-toggle-btn` has `aria-pressed="true"`.
- **Verify chart datasets:** Query `Chart.getChart('totalChart').data.datasets`. Assert `datasets.length === 2`, and dataset index 1 has `borderDash: [5, 5]` and `color: "#F59E0B"`.
- **Verify legend badges:** Assert `document.querySelectorAll('.chart-comparison-legend')` elements have `hidden === false`.
- **Verify metric deltas:** Assert `#comparison-total` is visible and displays directional indicator (e.g. `Prev: ▲ +1.38% (+133.6K)`).
- **Capture proof:** Save visual artifact:
  ```bash
  python3 scripts/control-dashboard.py verify-compare --output artifacts/verify-mastodon-trends/proof-compare.png
  ```

## Gotchas

- Comparing on `ALL` is mathematically impossible because historical data starts in September 2022 and has no prior period. The app automatically transitions to `1Y` rather than failing.
- Chart.js requires `null` padding at the start of prior period arrays if the historical window hits the dataset boundary; verify that tooltips and chart scales do not render `NaN`.
- Tooltips render prior dates dynamically using labels stored in `comparisonData.labels`.
