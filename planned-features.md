# Planned Dashboard Improvements

This document breaks down the next set of enhancements for the Mastodon statistics dashboard into individual features, implementation tasks, and testing steps.

## Feature Checklist

### 1. Year-Range Selector Improvements
- [x] Keep the existing 1W / 1M / 6M / YTD / ALL buttons.
- [x] Generate incremental `1Y`, `2Y`, `3Y`, etc. options dynamically from the data range.
- [x] Use a dropdown fallback when there are too many year buttons.
- [ ] Add a dedicated UI label showing the currently selected range.
- [ ] Verify the selector works on desktop and mobile.

### 2. Last Updated Timestamp
- [ ] Add a visible `Last updated` timestamp to the dashboard header or footer.
- [ ] Update the timestamp when the page is loaded from `historicalData.js`.
- [ ] Add a manual refresh button or indicator for data staleness.
- [ ] Test with updated local data and confirm the timestamp changes.

### 3. Chart Controls & UX
- [ ] Add a `Reset Zoom` button for the chart zoom/pan plugin.
- [ ] Add a chart export option (`PNG` or `CSV`).
- [ ] Add a toggle to show/hide a 7-day moving average overlay.
- [ ] Verify chart controls are accessible and responsive.

### 4. Metrics & Analysis Enhancements
- [ ] Add a "New Users" metric card showing daily net growth.
- [ ] Add a two-period comparison mode (current range vs previous same range).
- [ ] Add a trend summary line describing the selected range.
- [ ] Test metrics calculations with sample data.

### 5. Data Refresh Automation
- [ ] Document daily updater scripts for macOS and Windows.
- [ ] Add a simple one-command refresh helper for both platforms.
- [ ] Add a note to the README describing how to use automated update scripts.
- [ ] Confirm scripts work when run locally.

## Implementation Plan

- `feature/year-range-dropdown`
  - Already implemented dynamic incremental year buttons.
  - Add UI polish and selection state management.

- `feature/last-updated-badge`
  - Add timestamp UI and data load time.
  - Ensure no network dependency on static archive mode.

- `feature/reset-zoom-button`
  - Add chart control UI and reset logic.
  - Keep existing zoom/pan plugin functionality.

- `feature/export-csv`
  - Add CSV export helper for filtered dataset.
  - Use browser download behavior.

- `feature/moving-average-overlay`
  - Add optional overlay dataset to both charts.
  - Add a toggle button to show/hide the moving average.

## Testing Notes
- Use `node --check` on updated JS files for syntax validation.
- Use local browser preview to confirm DOM/UI updates.
- Verify the dropdown fallback appears when many year options exist.
