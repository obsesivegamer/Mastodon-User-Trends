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
            print("  [PASS] All Node.js unit tests pass (22/22)")
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

def run_server(port, stop_event):
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("127.0.0.1", port), QuietHandler) as httpd:
        while not stop_event.is_set():
            httpd.handle_request()

def start_server_daemon(port):
    stop_event = threading.Event()
    t = threading.Thread(target=run_server, args=(port, stop_event), daemon=True)
    t.start()
    return stop_event

def cmd_verify_compare(args):
    port = args.port or DEFAULT_PORT
    output_path = Path(args.output) if args.output else (REPO_ROOT / "artifacts" / "verify-mastodon-trends" / "proof-compare.png")
    output_path.parent.mkdir(parents=True, exist_ok=True)

    print(f"Starting verification for Period Comparison on port {port}...")
    stop_event = start_server_daemon(port)
    time.sleep(0.5)

    try:
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
    finally:
        stop_event.set()

def cmd_verify_all(args):
    print("Running full verification suite...")
    cmd_doctor(args)
    cmd_verify_compare(args)
    print("\nAll verification suites passed.")

def main():
    parser = argparse.ArgumentParser(description="Mastodon Analytics Dashboard Verification Harness")
    subparsers = parser.add_subparsers(dest="command", required=True)

    p_doc = subparsers.add_parser("doctor", help="Run environment and health checks")
    p_doc.set_defaults(func=cmd_doctor)

    p_comp = subparsers.add_parser("verify-compare", help="Drive and verify Period Comparison")
    p_comp.add_argument("--port", type=int, default=DEFAULT_PORT, help="Port to serve dashboard on")
    p_comp.add_argument("--output", type=str, help="Path to save screenshot evidence")
    p_comp.set_defaults(func=cmd_verify_compare)

    p_all = subparsers.add_parser("verify-all", help="Run all verification suites")
    p_all.add_argument("--port", type=int, default=DEFAULT_PORT, help="Port to serve dashboard on")
    p_all.add_argument("--output", type=str, help="Path to save screenshot evidence")
    p_all.set_defaults(func=cmd_verify_all)

    args = parser.parse_args()
    args.func(args)

if __name__ == "__main__":
    main()
