# Planned Dashboard Improvements

This document outlines the dashboard improvements for the Mastodon statistics dashboard.

## PR 1 Goal

Define the dashboard improvement roadmap, turn the ideas into actionable work items, and prepare a stable implementation plan for the next feature branch.

## PR 1 Status: ✅ COMPLETE

All planned features have been successfully implemented!

## Feature Checklist

### 1. Year-Range Selector Improvements
- [x] Keep the existing 1W / 1M / 6M / YTD / ALL buttons.
- [x] Generate incremental `1Y`, `2Y`, `3Y`, etc. options dynamically from the data range.
- [x] Use a dropdown fallback when there are too many year buttons.
- [x] Add a dedicated UI label showing the currently selected range.
- [x] Verify the selector works on desktop and mobile.

### 2. Last Updated Timestamp
- [x] Add a visible `Last updated` timestamp to the dashboard header.
- [x] Derive freshness from the newest record in `historicalData.js`.
- [x] Add a manual archive-reload button with spinning animation.
- [x] Verify reloading preserves the archive record timestamp.

### 3. Chart Controls & UX
- [x] Add a `Reset Zoom` button for the chart zoom/pan plugin.
- [x] Add a chart export option (`PNG` and `CSV`).
- [x] Add a toggle to show/hide a trailing 7-day moving average overlay.
- [x] Verify chart controls are accessible and responsive.

### 4. Metrics & Analysis Enhancements
- [x] Add a "Net User Growth" metric card showing total net change.
- [x] Add comparison mode for current-range versus previous-period analytics.
- [x] Features calculate trends dynamically for all selected ranges.
- [x] Test metrics calculations with sample data.

### 5. Data Refresh Automation
- [x] Document daily updater scripts for macOS and Windows.
- [x] Scripts support one-command refresh for both platforms.
- [x] README includes comprehensive update instructions.
- [x] Validate the JavaScript entry points and updater helper syntax.

## Implementation Summary

All features have been successfully implemented across multiple feature commits:

1. **feat: add UI label showing currently selected time range** - Displays selected range in cyan text
2. **feat: add last updated timestamp and refresh button** - Shows archive freshness and reloads the local archive
3. **feat: add chart export functionality (PNG and CSV)** - Exports the currently selected range
4. **feat: add 7-day moving average overlay toggle** - Adds a trailing trend-smoothing line
5. **feat: add Net User Growth metric card** - Shows total net change in the selected period
6. **feat: add comparison mode** - Compares the current range with the immediately preceding period
7. **Data Refresh Automation** - Fully documented in README with working scripts

## Testing Verification

✅ All features tested on desktop and mobile viewports
✅ CSV generation is regression-tested against filtered input
✅ Moving average calculations verified correct
✅ Time range filters update all metrics dynamically
✅ Responsive design works across breakpoints
✅ JavaScript syntax and automated regression tests pass
