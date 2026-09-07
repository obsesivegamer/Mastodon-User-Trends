# Mastodon Analytics Dashboard Verification Map

This directory contains the feature-level verification recipes for the Mastodon User Trends dashboard. Consult this index before driving the app, then use the corresponding feature document for exact preconditions, driving commands, and proof criteria.

## Baseline Preconditions

- Start the local HTTP server at `http://127.0.0.1:8089` from the repository root.
- Run `python3 scripts/control-dashboard.py doctor` and require all checks pass.
- Load `http://127.0.0.1:8089/index.html` with network idle.
- Never drive an unverified instance or alter the underlying `historicalData.js` during verification.

## Driving Conventions

- Start every test recipe from the default initial page load state (`range = ALL`, indicators inactive).
- Prefer stable semantic handles: `.compare-toggle-btn`, `.time-btn[data-range]`, `#toggle-velocity-btn`, etc.
- Verify both the visual representation (screenshots) and the underlying state (Chart.js instance datasets, DOM text).
- Proof artifacts must be stored in `artifacts/verify-mastodon-trends/` and retained across cleanups.

## Features

- [Period Comparison](./period-comparison.md): Compare button toggle, auto-transition from unsupported ranges (`ALL` -> `1Y`), dashed comparison datasets, tooltips, and card deltas.
- [Range Filtering](./range-filtering.md): Dynamic range selection (`1W`, `1M`, `6M`, `YTD`, `1Y`, `2Y`, `3Y`, `4Y`, `ALL`), active pill states, and metric re-slicing.
- [Indicator Toggles](./indicator-toggles.md): 7-day trailing moving average overlay line and Daily Net Change velocity histogram.
- [Velocity Modes & Peak Surges](./velocity-modes.md): Dual-mode velocity histogram (MAU Health vs Signups) and peak registration surges.
