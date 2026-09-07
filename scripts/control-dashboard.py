#!/usr/bin/env python3
"""
control-dashboard.py — CLI harness for driving and verifying the Mastodon Analytics Dashboard.
Auto re-executes with amber-archive venv if playwright is not in global python3.
"""

import sys
import os

# Auto-resolve playwright
try:
    import playwright
except ImportError:
    venv_python = "/Users/jeremylichtman/Documents/amber-archive/.venv/bin/python"
    if os.path.exists(venv_python) and sys.executable != venv_python:
        os.execv(venv_python, [venv_python] + sys.argv)
    else:
        sys.stderr.write("Error: Playwright is required. Please install playwright or configure virtualenv.\n")
        sys.exit(1)

import argparse
import http.server
import socketserver
import subprocess
import threading
import time
from pathlib import Path
from playwright.sync_api import sync_playwright

REPO_ROOT = Path(__file__).resolve().parent.parent
DEFAULT_PORT = 8089

class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(REPO_ROOT), **kwargs)

    def log_message(self, format, *args):
        pass

def cmd_doctor(args):
    print("=== Mastodon Dashboard Doctor ===")
    ok = True

    required_files = ["index.html", "script.js", "style.css", "historicalData.js", "script.test.js"]
    for f in required_files:
        path = REPO_ROOT / f
        if path.exists():
            print(f"  [PASS] File exists: {f} ({path.stat().st_size} bytes)")
        else:
            print(f"  [FAIL] Missing required file: {f}")
            ok = False

    script_content = (REPO_ROOT / "script.js").read_text(encoding="utf-8")
    if "calculatePeriodComparison" in script_content:
        print("  [PASS] script.js contains calculatePeriodComparison")
    else:
        print("  [FAIL] script.js missing calculatePeriodComparison")
        ok = False

    if "chart-comparison-legend" in (REPO_ROOT / "index.html").read_text(encoding="utf-8"):
        print("  [PASS] index.html contains comparison legend elements")
    else:
        print("  [FAIL] index.html missing comparison legend elements")
        ok = False

    # Check node unit tests
    try:
        res = subprocess.run(["node", "--test", "script.test.js"], cwd=str(REPO_ROOT), capture_output=True, text=True)
        if res.returncode == 0:
            print("  [PASS] All Node.js unit tests pass")
        else:
            print("  [FAIL] Unit tests failed:\n" + res.stderr)
            ok = False
    except Exception as e:
        print(f"  [WARN] Could not run node --test: {e}")

    # Check Playwright availability
    try:
        from playwright.sync_api import sync_playwright
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            browser.close()
        print("  [PASS] Playwright Chromium browser available")
    except Exception as e:
        print(f"  [FAIL] Playwright browser launch failed: {e}")
        ok = False

    if ok:
        print("\nAll Doctor checks passed. Instance is healthy and ready to drive.")
    else:
        print("\nDoctor checks failed.")
        sys.exit(1)

class DashboardServer:
    def __init__(self, port=DEFAULT_PORT):
        self.port = port
        self.server = None
        self.thread = None

    def __enter__(self):
        socketserver.TCPServer.allow_reuse_address = True
        self.server = socketserver.TCPServer(("127.0.0.1", self.port), QuietHandler)
        self.thread = threading.Thread(target=self.server.serve_forever, daemon=True)
        self.thread.start()
        time.sleep(0.2)
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        if self.server:
            self.server.shutdown()
            self.server.server_close()

def cmd_verify_compare(args):
    port = args.port or DEFAULT_PORT
    output_path = Path(args.output) if args.output else (REPO_ROOT / "artifacts" / "verify-mastodon-trends" / "proof-compare.png")
    output_path.parent.mkdir(parents=True, exist_ok=True)

    print(f"Starting verification for Period Comparison on port {port}...")
    with DashboardServer(port):
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            context = browser.new_context(viewport={"width": 1440, "height": 900})
            page = context.new_page()

            url = f"http://127.0.0.1:{port}/index.html"
            page.goto(url, wait_until="networkidle")

            # 1. Check Initial State
            initial_range = page.locator(".time-btn.active").inner_text().strip()
            compare_btn = page.locator(".compare-toggle-btn")
            initial_pressed = compare_btn.get_attribute("aria-pressed")

            print(f"Initial State -> Active Range: {initial_range}, Compare pressed: {initial_pressed}")
            assert initial_range == "ALL", f"Expected default range ALL, got {initial_range}"
            assert initial_pressed == "false", f"Expected compare unpressed initially, got {initial_pressed}"

            # 2. Click Compare Toggle
            print("Action: Clicking Compare button...")
            compare_btn.click()
            time.sleep(0.8)

            # 3. Verify State Transition & Guardrail
            after_range = page.locator(".time-btn.active").inner_text().strip()
            after_pressed = compare_btn.get_attribute("aria-pressed")
            print(f"After Click -> Active Range: {after_range}, Compare pressed: {after_pressed}")
            assert after_range == "1Y", f"Expected auto-transition to 1Y, got {after_range}"
            assert after_pressed == "true", f"Expected compare aria-pressed=true, got {after_pressed}"

            # 4. Verify Chart.js Datasets
            datasets = page.evaluate("""() => {
                const chart = Chart.getChart('totalChart');
                return chart.data.datasets.map(d => ({
                    label: d.label,
                    borderDash: d.borderDash,
                    color: d.borderColor
                }));
            }""")
            print(f"Total Chart Datasets: {datasets}")
            assert len(datasets) == 2, f"Expected 2 datasets on Total Chart, found {len(datasets)}"
            prior_dataset = datasets[1]
            assert "Prior Period" in prior_dataset["label"], f"Missing Prior Period dataset: {prior_dataset}"
            assert prior_dataset["borderDash"] == [5, 5], f"Expected dashed line [5, 5], got {prior_dataset['borderDash']}"

            # 5. Verify Legend Badge Visibility
            legend_hidden = page.evaluate("""() => {
                const legends = document.querySelectorAll('.chart-comparison-legend');
                return Array.from(legends).map(el => el.hidden);
            }""")
            print(f"Comparison Legends hidden status: {legend_hidden}")
            assert not any(legend_hidden), "Expected all chart comparison legends to be visible (not hidden)"

            # 6. Verify Metric Card Deltas
            comp_metric = page.locator("#comparison-total").inner_text().strip()
            print(f"Total Users Card Comparison: '{comp_metric}'")
            assert "Prev:" in comp_metric or "▲" in comp_metric or "▼" in comp_metric, f"Unexpected comparison card text: {comp_metric}"

            # 7. Capture Visual Evidence
            page.screenshot(path=str(output_path), full_page=False)
            print(f"Evidence captured and saved to: {output_path}")

            browser.close()

        print("\n[SUCCESS] Period Comparison feature fully verified end-to-end!")

def cmd_verify_guide(args):
    port = args.port or DEFAULT_PORT
    output_path = Path(args.output) if args.output else (REPO_ROOT / "artifacts" / "verify-mastodon-trends" / "proof-guide.png")
    output_path.parent.mkdir(parents=True, exist_ok=True)

    print(f"Starting verification for Guide & Tooltip Dialog on port {port}...")
    with DashboardServer(port):
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            context = browser.new_context(viewport={"width": 1440, "height": 900})
            page = context.new_page()

            url = f"http://127.0.0.1:{port}/index.html"
            page.goto(url, wait_until="networkidle")

            guide_dialog = page.locator("#guide-dialog")
            open_guide_btn = page.locator("#open-guide-btn")
            close_guide_btn = page.locator("#close-guide-btn")

            # 1. Dialog closed initially
            assert not guide_dialog.is_visible(), "Expected guide dialog to be closed initially"

            # 2. Click Guide button in command bar
            print("Action: Opening guide modal via command bar button...")
            open_guide_btn.click()
            time.sleep(0.4)
            assert guide_dialog.is_visible(), "Expected guide dialog to be visible after click"

            # 3. Verify content
            guide_title = page.locator("#guide-dialog-title").inner_text().strip()
            print(f"Guide Title: '{guide_title}'")
            assert "Terminal Guide" in guide_title, f"Unexpected title: {guide_title}"

            chips = page.locator("#guide-dialog .range-chip").all_inner_texts()
            print(f"Verified Range Chips in Guide: {chips}")
            assert "1W" in chips and "1Y" in chips and "3Y" in chips and "ALL" in chips, f"Missing chips: {chips}"

            demo_footer = page.locator("#guide-dialog .demo-tooltip-footer").inner_text().strip()
            print(f"Verified Tooltip Demo Footer: '{demo_footer}'")
            assert "Parentheses show equivalent historical date" in demo_footer

            # 4. Capture screenshot of open dialog
            page.screenshot(path=str(output_path), full_page=False)
            print(f"Evidence captured and saved to: {output_path}")

            # 5. Dismiss via Escape key
            print("Action: Pressing Escape key...")
            page.keyboard.press("Escape")
            time.sleep(0.3)
            assert not guide_dialog.is_visible(), "Expected dialog to close on Escape key"

            # 6. Enable compare and verify legend badge opens guide
            compare_btn = page.locator(".compare-toggle-btn")
            compare_btn.click()
            time.sleep(0.4)
            legend = page.locator(".chart-comparison-legend").first
            assert legend.is_visible(), "Expected comparison legend to be visible"
            print("Action: Clicking comparison legend to open guide...")
            legend.click()
            time.sleep(0.3)
            assert guide_dialog.is_visible(), "Expected guide to open when clicking legend badge"

            # 7. Close via close button
            print("Action: Clicking close button...")
            close_guide_btn.click()
            time.sleep(0.3)
            assert not guide_dialog.is_visible(), "Expected guide to close after close button clicked"

            browser.close()

        print("\n[SUCCESS] Guide & Tooltip Reference feature fully verified end-to-end!")

def cmd_verify_velocity(args):
    url = getattr(args, "url", None)
    output_path = Path(args.output) if args.output else (REPO_ROOT / "artifacts" / "verify-mastodon-trends" / "proof-velocity.png")
    output_path.parent.mkdir(parents=True, exist_ok=True)

    def run_checks(target_url):
        print(f"Starting verification for Velocity modes and Peak Surges on {target_url}...")
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            context = browser.new_context(viewport={"width": 1440, "height": 900})
            page = context.new_page()

            page.goto(target_url, wait_until="networkidle")

            # 1. Ensure Velocity Chart is unhidden
            vel_section = page.locator("#section-velocity-chart")
            toggle_vel_btn = page.locator("#toggle-velocity-btn")

            if not vel_section.is_visible():
                print("Action: Velocity chart section is hidden, clicking toggle button...")
                toggle_vel_btn.click()
                time.sleep(0.5)

            assert vel_section.is_visible(), "Expected velocity chart section to be visible"

            # 2. Check Initial Default State (MAU Health)
            vel_mode_active = page.locator("#vel-mode-active")
            vel_mode_total = page.locator("#vel-mode-total")
            heading = page.locator("#velocity-chart-heading").inner_text().strip()

            print(f"Initial Velocity Mode -> Heading: '{heading}', Active button class: {vel_mode_active.get_attribute('class')}", flush=True)
            assert "Daily Active User Velocity" in heading, f"Expected MAU velocity heading, got {heading}"
            assert "active" in (vel_mode_active.get_attribute("class") or ""), "Expected #vel-mode-active to have 'active' class"
            assert "active" not in (vel_mode_total.get_attribute("class") or ""), "Expected #vel-mode-total not to have 'active' class"

            # 3. Click 'Signups' button (#vel-mode-total)
            print("Action: Clicking '#vel-mode-total' (Signups)...", flush=True)
            vel_mode_total.click()
            time.sleep(0.6)

            heading_total = page.locator("#velocity-chart-heading").inner_text().strip()
            print(f"After Clicking Signups -> Heading: '{heading_total}', Total button class: {vel_mode_total.get_attribute('class')}", flush=True)
            assert "Daily Signups & Additions Velocity" in heading_total, f"Expected Signups heading, got {heading_total}"
            assert "active" in (vel_mode_total.get_attribute("class") or ""), "Expected #vel-mode-total to have 'active' class"
            assert "active" not in (vel_mode_active.get_attribute("class") or ""), "Expected #vel-mode-active not to have 'active' class"

            # Check Chart.js dataset
            dataset_info = page.evaluate("""() => {
                const chart = Chart.getChart('velocityChart');
                if (!chart) return null;
                return {
                    label: chart.data.datasets[0].label,
                    count: chart.data.datasets[0].data.length
                };
            }""")
            print(f"Signups Velocity Dataset: {dataset_info}", flush=True)
            assert dataset_info is not None, "Expected velocityChart instance to exist"
            assert "Net New Users" in dataset_info["label"] or "Signups" in dataset_info["label"], f"Unexpected dataset label: {dataset_info['label']}"

            # 4. Click 'MAU Health' button (#vel-mode-active)
            print("Action: Clicking '#vel-mode-active' (MAU Health)...", flush=True)
            vel_mode_active.click()
            time.sleep(0.6)

            heading_active = page.locator("#velocity-chart-heading").inner_text().strip()
            print(f"After Clicking MAU Health -> Heading: '{heading_active}', Active button class: {vel_mode_active.get_attribute('class')}", flush=True)
            assert "Daily Active User Velocity" in heading_active, f"Expected MAU velocity heading, got {heading_active}"
            assert "active" in (vel_mode_active.get_attribute("class") or ""), "Expected #vel-mode-active to have 'active' class"
            assert "active" not in (vel_mode_total.get_attribute("class") or ""), "Expected #vel-mode-total not to have 'active' class"

            # 5. Test Peak Surge Chip Interaction
            peak_chip = page.locator(".peak-chip").first
            if peak_chip.count() > 0:
                print(f"Action: Clicking peak chip '{peak_chip.inner_text().strip()}'...", flush=True)
                peak_chip.click()
                time.sleep(0.6)

                heading_peak = page.locator("#velocity-chart-heading").inner_text().strip()
                active_range = page.locator(".time-btn.active").inner_text().strip()
                print(f"After Peak Chip -> Heading: '{heading_peak}', Active range: '{active_range}', Total class: {vel_mode_total.get_attribute('class')}", flush=True)
                assert "Daily Signups & Additions Velocity" in heading_peak, f"Expected Signups heading after peak chip, got {heading_peak}"
                assert "active" in (vel_mode_total.get_attribute("class") or ""), "Expected total mode active after peak chip"

            # 6. Capture Visual Evidence
            page.screenshot(path=str(output_path), full_page=False)
            print(f"Evidence captured and saved to: {output_path}")

            browser.close()

        print("\n[SUCCESS] Velocity Modes and Peak Surges fully verified end-to-end!")

    if url:
        run_checks(url)
    else:
        port = args.port or DEFAULT_PORT
        with DashboardServer(port):
            run_checks(f"http://127.0.0.1:{port}/index.html")

def cmd_verify_all(args):
    print("Running full verification suite...")
    cmd_doctor(args)
    cmd_verify_compare(args)
    cmd_verify_guide(args)
    cmd_verify_velocity(args)
    print("\nAll verification suites passed.")

def main():
    parser = argparse.ArgumentParser(description="Mastodon Analytics Dashboard Verification Harness")
    subparsers = parser.add_subparsers(dest="command", required=True)

    p_doc = subparsers.add_parser("doctor", help="Run environment and health checks")
    p_doc.set_defaults(func=cmd_doctor)

    p_comp = subparsers.add_parser("verify-compare", help="Drive and verify Period Comparison")
    p_comp.add_argument("--port", type=int, default=DEFAULT_PORT, help="Port to serve dashboard on")
    p_comp.add_argument("--output", type=str, help="Path to save screenshot evidence")
    p_comp.add_argument("--url", type=str, help="Optional external URL to verify instead of local server")
    p_comp.set_defaults(func=cmd_verify_compare)

    p_guide = subparsers.add_parser("verify-guide", help="Drive and verify Guide & Tooltip Reference")
    p_guide.add_argument("--port", type=int, default=DEFAULT_PORT, help="Port to serve dashboard on")
    p_guide.add_argument("--output", type=str, help="Path to save screenshot evidence")
    p_guide.add_argument("--url", type=str, help="Optional external URL to verify instead of local server")
    p_guide.set_defaults(func=cmd_verify_guide)

    p_vel = subparsers.add_parser("verify-velocity", help="Drive and verify Velocity Mode toggles and Peak Surges")
    p_vel.add_argument("--port", type=int, default=DEFAULT_PORT, help="Port to serve dashboard on")
    p_vel.add_argument("--output", type=str, help="Path to save screenshot evidence")
    p_vel.add_argument("--url", type=str, help="Optional external URL to verify instead of local server")
    p_vel.set_defaults(func=cmd_verify_velocity)

    p_all = subparsers.add_parser("verify-all", help="Run all verification suites")
    p_all.add_argument("--port", type=int, default=DEFAULT_PORT, help="Port to serve dashboard on")
    p_all.add_argument("--output", type=str, help="Path to save screenshot evidence")
    p_all.add_argument("--url", type=str, help="Optional external URL to verify instead of local server")
    p_all.set_defaults(func=cmd_verify_all)

    args = parser.parse_args()
    args.func(args)

if __name__ == "__main__":
    main()
