# Indicator Toggles

Indicator toggles allow users to layer advanced analytical overlays onto the dashboard, including a 7-day trailing moving average to smooth short-term volatility and a daily net change velocity histogram.

## Sub-features

- `ind-ma-toggle`: Toggles the 7-day trailing moving average line on the Total and Active Users charts.
- `ind-velocity-toggle`: Toggles visibility of the daily additions/losses velocity histogram chart.
- `ind-chart-zoom`: Allows dragging to zoom into specific date ranges and resetting zoom with `.reset-zoom-btn`.

## How to get to it (user POV)

- Under `INDICATORS` in the command bar, click `📈 7D MA` to overlay moving averages.
- Click `📊 Velocity` to display the Daily Net Change Velocity chart section.
- Click `Reset Zoom` on any chart card header to restore the full axis range.

## Driving it with control-dashboard.py

Preconditions:
- Dashboard server is running on `http://127.0.0.1:8089`.
- Doctor checks pass.

- **Toggle 7D MA:** Click `#toggle-ma-btn` (or `.toggle-ma-btn`).
  ```python
  page.locator('.toggle-ma-btn').click()
  ```
- **Assert MA state:** Assert `.toggle-ma-btn` has `aria-pressed="true"`.
- **Assert MA dataset:** Query `Chart.getChart('totalChart').data.datasets`. Verify a dataset with label `7-Day Moving Average` is present.
- **Toggle Velocity Chart:** Click `#toggle-velocity-btn` (or `.toggle-velocity-btn`).
  ```python
  page.locator('#toggle-velocity-btn').click()
  ```
- **Assert Velocity visible:** Assert `#section-velocity-chart` does not have attribute `hidden` (`hidden === false`).
- **Assert Velocity instance:** Assert `Chart.getChart('velocityChart')` is defined and rendered.

## Gotchas

- Moving averages require at least 7 preceding records. The first 6 observations will naturally be null.
- Velocity chart section is hidden by default using the HTML `hidden` attribute to preserve vertical space until invoked.
