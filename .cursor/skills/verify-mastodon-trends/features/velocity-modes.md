# Velocity Modes & Peak Signup Surges Verification Recipe

Drive and verify the dual-mode Velocity chart (MAU Health vs Signups) and Peak Signup Surges explorer bar.

## Preconditions

- Local server running at `http://127.0.0.1:8089` (or use `python3 scripts/control-dashboard.py verify-velocity`)
- Core assets healthy (`doctor` passes)

## Semantic Handles & Controls

| Element | Selector | Role | Expected Behavior |
|---|---|---|---|
| Velocity Chart Toggle | `#toggle-velocity-btn` | Button | Unhides `#section-velocity-chart`, sets `aria-pressed="true"` |
| MAU Health Mode | `#vel-mode-active` | Segmented Button | Sets mode to `active`, updates heading to `Daily Active User Velocity`, displays MAU day-over-day changes |
| Signups Mode | `#vel-mode-total` | Segmented Button | Sets mode to `total`, updates heading to `Daily Signups & Additions Velocity`, displays new registration additions |
| Peak Surge Chips | `.peak-chip` | Chip Button | Switches mode to `total`, switches date range to `ALL`, zooms/scrolls to velocity histogram |

## Verification Procedure

1. **Reveal Velocity Section**: Click `#toggle-velocity-btn`. Section `#section-velocity-chart` becomes visible.
2. **Verify Default Mode**: `#vel-mode-active` has class `active`. Heading reads `Daily Active User Velocity`.
3. **Switch to Signups**: Click `#vel-mode-total`. Button gets class `active`, `#vel-mode-active` loses `active`. Heading updates to `Daily Signups & Additions Velocity`. Dataset label becomes `Net Signups / Additions`.
4. **Switch to MAU Health**: Click `#vel-mode-active`. Button gets class `active`. Heading returns to `Daily Active User Velocity`.
5. **Click Peak Surge Chip**: Click `.peak-chip` (e.g. `Nov 2022 Musk Wave`). Velocity mode switches to `total`, date range switches to `ALL`.
6. **Capture Evidence**: Save screenshot to `artifacts/verify-mastodon-trends/proof-velocity.png`.

## Automated Command

```bash
# Verify locally
python3 scripts/control-dashboard.py verify-velocity

# Verify live deployment
python3 scripts/control-dashboard.py verify-velocity --url https://lichtman.synology.me/Mastodon/ --output artifacts/verify-mastodon-trends/live-proof-velocity.png
```
