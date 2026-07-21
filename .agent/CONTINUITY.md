# CONTINUITY — fix: reset only the selected chart

## Root Cause

`resetChartZoom()` in `script.js` unconditionally called `resetZoom()` on **both**
`totalChartInstance` and `activeChartInstance`. Every Reset Zoom button shared the
same listener that invoked this function with no arguments, so clicking either button
always reset both charts simultaneously, contradicting the "per-chart" intent of the
feature.

Additionally, neither Reset Zoom `<button>` carried a `data-chart` attribute, making
it impossible for the handler to identify which chart the button belonged to.

## Implementation Decision

The minimal, safe fix avoids any change to the zoom/pan plugin configuration or the
rendering pipeline:

1. **HTML** — Added `data-chart="totalChart"` and `data-chart="activeChart"` to the
   respective Reset Zoom buttons in `index.html`. This attribute naming follows the
   existing pattern already used by the PNG/CSV export buttons (e.g.
   `data-chart="totalChart"` on the export buttons).

2. **script.js** — Refactored `resetChartZoom` from a zero-argument function that
   always resets both charts to:
   ```js
   const resetChartZoom = (chartId, instances) => {
       const map = instances || { totalChart: totalChartInstance, activeChart: activeChartInstance };
       const chart = map[chartId];
       if (chart && typeof chart.resetZoom === 'function') {
           chart.resetZoom();
       }
   };
   ```
   - `chartId` — the canvas element ID (`"totalChart"` or `"activeChart"`).
   - `instances` — optional override map; used only by unit tests to inject stubs.
   - Unknown IDs or charts missing `resetZoom` are silently skipped.

3. **Click listener** updated to `() => resetChartZoom(btn.dataset.chart)`, reading
   the `data-chart` attribute added above.

4. **Exported** `resetChartZoom` via `module.exports` so unit tests can import it
   without altering the browser-facing API surface.

5. **Tests** — Three new cases added to `script.test.js`:
   - `totalChart` resets exactly once and never touches active.
   - `activeChart` resets exactly once and never touches total.
   - Unknown IDs and missing `resetZoom` do not throw.

## Validation

- `node --check script.js script.test.js historicalData.js updateData.js` — all pass.
- `node --test script.test.js` — all 11 tests pass (8 pre-existing + 3 new).
- `bash -n *.sh` — all shell scripts are syntactically valid.
- `git diff --check` — no trailing whitespace or conflict markers.
- Browser smoke test: zoomed both charts to different ranges, confirmed Total Reset
  only returns Total to full range, and Active Reset only returns Active to full range.
  Zoom, pan, moving-average toggle, and export controls all remain functional.

## Outcome

Branch `agent/fix-per-chart-reset-zoom` opened as PR against
`obsesivegamer/Mastodon-User-Trends` master. PR merged after clean validation.
`master` confirmed to contain the merge commit with both targeted reset controls.
