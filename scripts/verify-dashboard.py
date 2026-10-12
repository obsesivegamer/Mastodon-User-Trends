#!/usr/bin/env python3
"""End-to-end checks for the Mastodon Network Pulse dashboard (Playwright, Chromium).

Run with any Python that has Playwright installed (on the maintainer's Mac that is
~/Documents/amber-archive/.venv/bin/python), for example:

    /Users/jeremylichtman/Documents/amber-archive/.venv/bin/python -I scripts/verify-dashboard.py all
    python3 -m pip install playwright && python3 -m playwright install chromium   # elsewhere

Without --url the repo root is served on a free 127.0.0.1 port. With --url every subcommand
drives that page instead (e.g. the GitHub Pages site). Screenshots go to
artifacts/verify-mastodon-trends/ (git-ignored). The joinmastodon statistics request the page makes
for its LIVE figure is always intercepted (see `status`), so results do not depend on the real API.
Chart.js and the fonts are fetched once from their CDNs and replayed for every page.

Expected values are derived here, from historicalData.js read over HTTP, independently of
script.js (see `Archive`). The page's own hooks (window.MastodonTerminal.app) are used to read
what was painted, never to decide what should have been.
"""

from __future__ import annotations

import argparse
import base64
import csv
import functools
import http.server
import io
import json
import math
import re
import shutil
import subprocess
import sys
import tempfile
import threading
import urllib.parse
from datetime import date, datetime, timedelta, timezone
from decimal import ROUND_HALF_UP, Decimal
from pathlib import Path

try:
    from playwright.sync_api import Error as PlaywrightError
    from playwright.sync_api import sync_playwright
except ImportError:  # doctor can still report this
    sync_playwright = None
    PlaywrightError = Exception

REPO_ROOT = Path(__file__).resolve().parent.parent
ARTIFACTS = REPO_ROOT / "artifacts" / "verify-mastodon-trends"
_SITE = re.search(r"""const SITE_URL = '([^']+)'""", (REPO_ROOT / "lib" / "prerender.js").read_text(encoding="utf-8"))
SITE_URL = _SITE.group(1) if _SITE else "https://obsesivegamer.github.io/Mastodon-User-Trends/"
LIVE_GLOB = "**/api.joinmastodon.org/statistics*"
SERVERS_GLOB = "**/data/servers.js*"
SOCIAL_GLOB = "**/data/social.js*"
SCRIPT_GLOB = "**/script.js*"
CDN_HOSTS = ("cdn.jsdelivr.net", "fonts.googleapis.com", "fonts.gstatic.com")
PINNED_LIBS = [
    "https://cdn.jsdelivr.net/npm/chart.js@4.5.1/dist/chart.umd.min.js",
    "https://cdn.jsdelivr.net/npm/hammerjs@2.0.8/hammer.min.js",
    "https://cdn.jsdelivr.net/npm/chartjs-plugin-zoom@2.0.1/dist/chartjs-plugin-zoom.min.js",
]

RANGES = ["1W", "1M", "3M", "6M", "YTD", "1Y", "2Y", "ALL"]
DEFAULT_RANGE = "1Y"
RANGE_LABELS = {"1W": "Past Week", "1M": "Past Month", "3M": "Past 3 Months", "6M": "Past 6 Months", "YTD": "Year to Date",
                "1Y": "Past Year", "2Y": "Past 2 Years", "3Y": "Past 3 Years", "4Y": "Past 4 Years", "ALL": "All Time"}
SURGES = {
    "SURGE_NOV_2022": ("2022-10-20", "2022-12-15", False),
    "SURGE_JUL_2023": ("2023-06-25", "2023-08-15", False),
    "SURGE_FEB_2024": ("2024-01-20", "2024-03-05", True),
    "SURGE_SEP_2024": ("2024-08-20", "2024-10-10", True),
}
CSV_HEADER = "date,total,active,servers,statuses,fedi_users,fedi_instances,net_total,net_active,flags"
CHART_KEYS = ["velocity", "mau", "srv", "rec", "rat", "tot"]
CANVAS_IDS = {"velocity": "velocityChart", "mau": "mauChart", "srv": "srvChart", "rec": "recChart", "rat": "ratChart", "tot": "totChart"}
LOG_CHARTS = {"mau", "srv", "rec", "tot"}
CHART_CSV = {
    "velocity": ("velocity", ["date", "total", "active", "net_total", "net_active", "net_total_7d_avg", "net_active_7d_avg",
                              "growth_total_pct", "growth_active_pct", "flags"]),
    "mau": ("monthly-active-users", ["date", "active", "active_7d_avg", "flags"]),
    "srv": ("servers", ["date", "servers", "fedi_instances", "users_per_server", "flags"]),
    "rec": ("posts-per-day", ["date", "statuses", "posts", "posts_7d_avg", "flags"]),
    "rat": ("ratios", ["date", "engagement_pct", "posts_per_mau", "users_per_server", "flags"]),
    "tot": ("total-users", ["date", "total", "fedi_users", "net_total", "flags"]),
}
FLAG_OF = {"total": "total", "active": "active", "servers": "servers", "statuses": "statuses",
           "fedi_users": "statuses", "fedi_instances": "statuses"}
FIELDS = ["total", "active", "servers", "statuses", "fedi_users", "fedi_instances"]
EMPTY_TEXT = "Collecting — first data after the next daily run."


# ---------------------------------------------------------------- small utilities

class Results:
    def __init__(self):
        self.rows: list[tuple[str, str, str, str]] = []

    def check(self, suite: str, name: str, ok: bool, detail: str = "") -> bool:
        status = "PASS" if ok else "FAIL"
        self.rows.append((suite, status, name, detail))
        print(f"  [{status}] {name}" + (f" -- {detail}" if detail else ""), flush=True)
        return bool(ok)

    def warn(self, suite: str, name: str, detail: str = ""):
        self.rows.append((suite, "WARN", name, detail))
        print(f"  [WARN] {name}" + (f" -- {detail}" if detail else ""), flush=True)

    @property
    def failed(self) -> int:
        return sum(1 for r in self.rows if r[1] == "FAIL")


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, format, *args):
        pass

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()


class Server:
    def __init__(self, root: Path, port: int):
        self.root, self.port, self.httpd = root, port, None

    def __enter__(self):
        handler = functools.partial(QuietHandler, directory=str(self.root))
        self.httpd = http.server.ThreadingHTTPServer(("127.0.0.1", self.port), handler)
        self.port = self.httpd.server_address[1]
        threading.Thread(target=self.httpd.serve_forever, daemon=True).start()
        return self

    def __exit__(self, *exc):
        self.httpd.shutdown()
        self.httpd.server_close()


def norm(text) -> str:
    return re.sub(r"\s+", " ", text or "").strip()


def squash(text) -> str:
    return re.sub(r"\s+", "", text or "")


def short(value, n=300) -> str:
    text = value if isinstance(value, str) else json.dumps(value, ensure_ascii=False, default=str)
    return text if len(text) <= n else text[: n - 1] + "…"


def iso_now() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.000Z")


def day_add(iso: str, n: int) -> str:
    return (date.fromisoformat(iso) + timedelta(days=n)).isoformat()


def days_between(a: str, b: str) -> int:
    return (date.fromisoformat(b) - date.fromisoformat(a)).days


def month_add(iso: str, n: int) -> str:
    d = date.fromisoformat(iso)
    y, m = divmod(d.year * 12 + d.month - 1 + n, 12)
    last = [31, 29 if y % 4 == 0 and (y % 100 or y % 400 == 0) else 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m]
    return date(y, m + 1, min(d.day, last)).isoformat()


# JavaScript number formatting (script.js), reproduced so expected strings are computed here.
def js_round(x: float) -> int:
    return math.floor(x + 0.5)


def js_fixed(x: float, digits: int) -> str:
    q = Decimal(1).scaleb(-digits)
    return str(Decimal(x).quantize(q, rounding=ROUND_HALF_UP))


def fmt_int(n) -> str:
    return "—" if n is None else f"{js_round(n):,}"


def fmt_compact(n) -> str:
    if n is None:
        return "—"
    a = abs(n)
    if js_round(a) < 1e3:
        body = f"{js_round(a):,}"
    elif float(js_fixed(a / 1e3, 1)) < 1e3:
        body = js_fixed(a / 1e3, 1) + "K"
    elif float(js_fixed(a / 1e6, 2)) < 1e3:
        body = js_fixed(a / 1e6, 2) + "M"
    else:
        body = js_fixed(a / 1e9, 3) + "B"
    return ("-" if n < 0 and body != "0" else "") + body


def fmt_signed(n, compact=True) -> str:
    if n is None:
        return "—"
    body = fmt_compact(abs(n)) if compact else fmt_int(abs(n))
    return ("-" if n < 0 and body != "0" else "+") + body


MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]


def fmt_day(iso: str | None) -> str:
    m = re.match(r"^(\d{4})-(\d{2})-(\d{2})", iso or "")
    return f"{MONTHS[int(m.group(2)) - 1]} {int(m.group(3))}, {m.group(1)}" if m else "—"


def parse_compact(text: str) -> float | None:
    m = re.fullmatch(r"([\d,.]+)([KMB]?)", (text or "").strip())
    if not m:
        return None
    return float(m.group(1).replace(",", "")) * {"": 1, "K": 1e3, "M": 1e6, "B": 1e9}[m.group(2)]


def parse_int(text: str) -> int | None:
    m = re.search(r"-?[\d,]{4,}", text or "")
    return int(m.group(0).replace(",", "")) if m else None


# ---------------------------------------------------------------- the independent oracle

class Archive:
    """historicalData.js read as data, with the page's rules re-implemented (flags mean missing)."""

    def __init__(self, rows: list[dict]):
        by = {r["date"]: r for r in rows if isinstance(r, dict) and re.fullmatch(r"\d{4}-\d{2}-\d{2}", str(r.get("date", "")))}
        self.row_count = len(by)
        self.first, self.last = min(by), max(by)
        self.dates = [day_add(self.first, i) for i in range(days_between(self.first, self.last) + 1)]
        self.missing = [d not in by for d in self.dates]
        self.flags = [set(by[d].get("flags") or []) if d in by else set() for d in self.dates]
        self.s: dict[str, list] = {}
        for k in FIELDS:
            col = []
            for d, fl in zip(self.dates, self.flags):
                row = by.get(d)
                v = row.get(k) if row else None
                ok = isinstance(v, (int, float)) and not isinstance(v, bool) and math.isfinite(v)
                col.append(v if ok and FLAG_OF[k] not in fl else None)
            self.s[k] = col

        def delta(col):
            return [None if i == 0 or v is None or col[i - 1] is None else v - col[i - 1] for i, v in enumerate(col)]

        s = self.s
        s["net_total"], s["net_active"] = delta(s["total"]), delta(s["active"])
        s["posts"] = [v if v is not None and v >= 0 else None for v in delta(s["statuses"])]
        s["growth_signups"] = [None if v is None or i == 0 or not (s["total"][i - 1] or 0) > 0 else v / s["total"][i - 1] * 100
                               for i, v in enumerate(s["net_total"])]
        s["growth_mau"] = [None if v is None or i == 0 or not (s["active"][i - 1] or 0) > 0 else v / s["active"][i - 1] * 100
                           for i, v in enumerate(s["net_active"])]
        ratio = lambda a, b, k: [None if x is None or y is None or not y > 0 else x / y * k for x, y in zip(a, b)]
        s["engagement"] = ratio(s["active"], s["total"], 100)
        s["users_per_server"] = ratio(s["total"], s["servers"], 1)
        s["posts_per_mau"] = ratio(s["posts"], s["active"], 1)

    @property
    def n(self) -> int:
        return len(self.dates)

    def idx(self, iso: str) -> int:
        return days_between(self.first, iso)

    def last_valid(self, key: str):
        for i in range(self.n - 1, -1, -1):
            if self.s[key][i] is not None:
                return i, self.s[key][i]
        return -1, None

    def ma(self, key: str) -> list:
        col = self.s[key]
        out = [None] * len(col)
        for i in range(6, len(col)):
            vals = [v for v in col[i - 6:i + 1] if v is not None]
            if len(vals) >= 4:
                out[i] = sum(vals) / len(vals)
        return out

    def bounds(self, rng: str) -> tuple[str, str] | None:
        if rng in SURGES:
            lo, hi, _ = SURGES[rng]
            base = day_add(lo, -1)
            start = base if base > self.first else self.first
            end = hi if hi < self.last else self.last
            return (start, end) if start <= end else None
        if rng == "1W":
            start = day_add(self.last, -7)
        elif rng in ("1M", "3M", "6M"):
            start = month_add(self.last, -{"1M": 1, "3M": 3, "6M": 6}[rng])
        elif rng == "YTD":
            start = f"{int(self.last[:4]) - 1}-12-31"
        elif rng == "ALL":
            start = self.first
        else:
            m = re.fullmatch(r"(\d+)Y", rng)
            start = month_add(self.last, -12 * int(m.group(1))) if m else self.first
        return (max(start, self.first), self.last)

    def window(self, rng: str) -> tuple[int, int]:
        a, b = self.bounds(rng)
        return self.idx(a), self.idx(b)

    def prior(self, rng: str):
        if rng == "ALL":
            return None
        cur = self.bounds(rng)
        span = days_between(*cur)
        if span < 1 or cur[0] <= self.first:
            return None
        start = day_add(cur[0], -span)
        return {"start": start, "end": cur[0], "span": span, "truncated": start < self.first}

    def year_ranges(self) -> list[str]:
        out = []
        for y in range(1, 41):
            if month_add(self.last, -12 * y) > self.first:
                out.append(f"{y}Y")
            else:
                break
        return out


# ---------------------------------------------------------------- fixtures for the social panels

def social_fixture(day: str) -> dict:
    """Hostile Contract-A data: names with markup, bad avatars/urls, accounts that must never be named."""
    def acct(user, name, followers, **extra):
        key = f"{user}@mastodon.social"
        base = {"acct": key, "display_name": name, "avatar": "https://files.mastodon.social/a.png", "url": f"https://mastodon.social/@{user}",
                "followers": followers, "following": 1, "posts": 10, "last_posted": day, "created_at": "2020-01-01", "domain": "mastodon.social"}
        base.update(extra)
        return key, base

    accounts = dict([
        acct("good", "Good Account", 50000),
        acct("evil", '<img src=x onerror="window.__pwned=1">Evil Name', 20000, avatar="https://evil.example.com/a.png"),
        acct("small", "Small Fry", 9999),
        acct("robot", "Robot", 90000, bot=True),
        acct("locked", "Locked", 80000, locked=True),
        acct("hidden", "Hidden", 70000, discoverable=False),
        acct("noindex", "No Index", 60000, noindex=True),
        acct("jsurl", "Js Url", 30000, avatar="javascript:alert(1)", url="javascript:alert(1)"),
        acct("creds", "Creds", 25000, avatar="https://user:pw@files.mastodon.social/a.png"),
        acct("bidi", "Bi\u202edi\u200b \x00Name", 21000),
    ])
    expected_named = ["good", "evil", "jsurl", "creds", "bidi"]
    followed = [{"acct": k, "value": a["followers"]} for k, a in accounts.items()]
    iso = lambda h: f"{day}T{h}:00:00.000Z"
    prev_day = day_add(day, -1)
    posts = [
        {"url": "https://mastodon.social/@good/111", "author": "good@mastodon.social", "text": "A fine post", "created_at": iso("10"),
         "favourites": 900, "reblogs": 10, "replies": 5, "embed": None, "language": "en"},
        {"url": "https://mastodon.social/@evil/112", "author": "evil@mastodon.social", "text": '<script>window.__pwned=1</script>' + "x" * 400,
         "created_at": iso("11"), "favourites": 800, "reblogs": 1, "replies": 1, "embed": "image", "language": "en"},
        {"url": "https://mastodon.social/@small/113", "author": "small@mastodon.social", "text": "ineligible author", "created_at": iso("12"),
         "favourites": 5000, "reblogs": 0, "replies": 0, "embed": None, "language": None},
        {"url": "https://mastodon.social/@good/114", "author": "good@mastodon.social", "text": "wrong day", "created_at": f"{prev_day}T10:00:00.000Z",
         "favourites": 700, "reblogs": 0, "replies": 0, "embed": None, "language": None},
        {"url": "https://mastodon.social/@good/115", "author": "good@mastodon.social", "text": "has a warning", "created_at": iso("13"),
         "favourites": 600, "reblogs": 0, "replies": 0, "embed": None, "language": None, "spoiler_text": "cw"},
        {"url": "https://other.example/@good/116", "author": "good@mastodon.social", "text": "wrong host", "created_at": iso("14"),
         "favourites": 500, "reblogs": 0, "replies": 0, "embed": None, "language": None},
        {"url": "https://mastodon.social/@good/117", "author": "good@mastodon.social", "text": "", "created_at": iso("15"),
         "favourites": 400, "reblogs": 0, "replies": 0, "embed": "video", "language": None},
    ]
    return {
        "schema": 1, "generated_at": iso_now(), "day": day,
        "coverage": {"days_7d": 1, "first_day": day, "pool": 10, "servers_scanned": 1, "note": "Fixture note: not exhaustive."},
        "guardrails": {"min_followers": 10000, "rules": ["Only accounts with 10,000 or more followers are named."]},
        "accounts": accounts,
        "boards": {"followed": followed, "gainers_24h": [], "losers_24h": [], "gainers_7d": [], "losers_7d": [], "active_24h": [], "active_7d": []},
        "top_posts": posts, "history": [],
        "_expected_named": expected_named,
    }


def servers_fixture(day: str) -> dict:
    rows = [{"domain": d, "users": u, "mau": 10, "statuses": 100, "open": True, "version": "4.3.0"}
            for d, u in (("mastodon.social", 1000), ("ok.example", 500), ('evil"><script>.example', 400), ("javascript:alert(1)", 300))]
    return {
        "schema": 1, "generated_at": iso_now(), "day": day, "source": "fedidb",
        "totals": {"users": 5000, "statuses": 1000, "servers": 4, "mau": 100},
        "servers": rows,
        "boards": {"largest": [{"domain": r["domain"], "value": r["users"]} for r in rows], "active": [],
                   "gainers_24h": [], "losers_24h": [], "gainers_7d": [], "losers_7d": []},
        # top1 > top5: inconsistent, so the meter must not be drawn
        "decentralization": {"top1": 0.9, "top5": 0.5, "top10": 0.6, "top1_domain": "mastodon.social", "servers_for_half": 1, "listed": 4},
        "coverage": {"days_7d": 1, "first_day": day}, "history": [],
    }


def fresh_fixture(var: str, day: str) -> dict:
    """A collector's very first output: valid files with nothing in them yet."""
    base = {"schema": 1, "generated_at": iso_now(), "day": day, "history": []}
    if var == "MASTODON_SOCIAL":
        return {**base, "coverage": {"days_7d": 0, "first_day": day, "pool": 0, "servers_scanned": 0, "note": "Fixture."},
                "guardrails": {"min_followers": 10000, "rules": []}, "accounts": {},
                "boards": {k: [] for k in ("followed", "gainers_24h", "losers_24h", "gainers_7d", "losers_7d", "active_24h", "active_7d")}, "top_posts": []}
    return {**base, "source": "fedidb", "totals": {"users": 0, "statuses": 0, "servers": 0, "mau": None}, "servers": [],
            "boards": {k: [] for k in ("largest", "active", "gainers_24h", "losers_24h", "gainers_7d", "losers_7d")},
            "coverage": {"days_7d": 0, "first_day": day}}


def avatar_svg(url: str) -> str:
    hue = sum(ord(c) for c in url) % 360
    return (f'<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48"><rect width="48" height="48" fill="hsl({hue},45%,36%)"/>'
            f'<circle cx="24" cy="19" r="9" fill="hsl({hue},40%,72%)"/><ellipse cx="24" cy="46" rx="16" ry="14" fill="hsl({hue},40%,72%)"/></svg>')


def as_js(var: str, payload: dict) -> str:
    clean = {k: v for k, v in payload.items() if not k.startswith("_")}
    return f"window.{var} = {json.dumps(clean)};\n"


# ---------------------------------------------------------------- in-page snippets

CHARTS_JS = """(withData) => {
  const T = window.MastodonTerminal;
  if (!T || !T.app) return null;
  const out = {};
  for (const [key, ch] of Object.entries(T.app.charts)) {
    const labels = ch.data.labels || [];
    out[key] = {
      id: ch.canvas.id, aria: ch.canvas.getAttribute('aria-label') || '',
      points: labels.length, first: labels[0] || null, last: labels[labels.length - 1] || null,
      yType: ch.scales && ch.scales.y ? ch.scales.y.type : null,
      zoomed: typeof ch.isZoomedOrPanned === 'function' ? ch.isZoomedOrPanned() : false,
      xMin: ch.scales.x.min, xMax: ch.scales.x.max,
      datasets: ch.data.datasets.map((d, i) => {
        const vals = d.data || [];
        return {
          label: d.label || '', role: d.role || '', metaKey: d.metaKey || '', n: vals.length,
          nonNull: vals.filter(v => v !== null && v !== undefined && !Number.isNaN(v)).length,
          dash: d.borderDash || [], visible: ch.isDatasetVisible(i), type: d.type || ch.config.type,
          data: withData ? vals.map(v => (v === undefined ? null : v)) : undefined,
        };
      }),
    };
  }
  return out;
}"""

PRERENDER_JS = """() => {
  const txt = (el) => el.textContent.replace(/\\s+/g, ' ').trim();
  return {
    values: [...document.querySelectorAll('[data-prerender]')].map(el => [el.getAttribute('data-prerender'), txt(el)]),
    ticker: [...document.querySelectorAll('#ticker-items li.tick')].map(txt),
    milestones: [...document.querySelectorAll('#milestones-body tr')].map(txt),
    strip: [...document.querySelectorAll('#strip-stats .index-stat')].map(el => txt(el) + ' | ' + ((el.querySelector('dd') || {}).title || '')),
  };
}"""

TABLE_JS = """() => [...document.querySelectorAll('#data-table-body tr')].map(tr => ({
  head: tr.querySelector('th') ? tr.querySelector('th').textContent.trim() : '',
  cells: [...tr.querySelectorAll('td')].map(td => td.textContent.trim()),
  flagged: [...tr.querySelectorAll('td')].map(td => td.classList.contains('flagged')),
}))"""

LDR_ROWS_JS = """() => [...document.querySelectorAll('#soc-ldr-body tr')].map(tr => {
  const t = (s) => { const e = tr.querySelector(s); return e ? e.textContent.trim() : ''; };
  const a = tr.querySelector('a.soc-acct');
  const img = tr.querySelector('img.soc-avatar');
  return {
    rank: t('.soc-col-rank'), href: a ? a.getAttribute('href') : null, target: a ? a.getAttribute('target') : null,
    rel: a ? a.getAttribute('rel') : null, name: t('.soc-acct-name'), handle: t('.soc-acct-handle'), meta: t('.soc-acct-meta'),
    metric: t('.soc-col-metric'), cells: [...tr.querySelectorAll('td.soc-col-opt')].map(td => td.textContent.trim()),
    all: [...tr.querySelectorAll('td')].map(td => td.textContent.trim()),
    img: img ? {src: img.getAttribute('src'), w: img.getAttribute('width'), h: img.getAttribute('height'),
                loading: img.getAttribute('loading'), ref: img.getAttribute('referrerpolicy'), alt: img.getAttribute('alt')} : null,
    blank: !!tr.querySelector('.soc-avatar-blank'),
  };
})"""

HEADS_JS = """() => [...document.querySelectorAll('#soc-ldr-head th')].map(th => th.textContent.trim().toLowerCase())"""

POSTS_JS = """() => [...document.querySelectorAll('#soc-pst-list li.soc-post-card')].map(li => {
  const m = li.querySelector('.soc-stat-main b');
  return {
    text: (li.querySelector('.soc-post-text') || {}).textContent || '',
    hrefs: [...li.querySelectorAll('a')].map(a => a.getAttribute('href')),
    rels: [...li.querySelectorAll('a')].map(a => a.getAttribute('rel')),
    targets: [...li.querySelectorAll('a')].map(a => a.getAttribute('target')),
    fav: m ? m.textContent : '', stats: (li.querySelector('.soc-post-stats') || {}).textContent || '',
    imgs: [...li.querySelectorAll('img')].map(i => i.getAttribute('src')),
    handle: (li.querySelector('.soc-acct-handle') || {}).textContent || '',
  };
})"""

UNSAFE_DOM_JS = """(sel) => {
  const bad = [];
  for (const root of document.querySelectorAll(sel)) {
    for (const el of root.querySelectorAll('script, iframe, object, embed, style, link, svg, form, input')) bad.push('tag ' + el.tagName);
    for (const el of root.querySelectorAll('*')) {
      for (const a of el.attributes) {
        if (/^on/i.test(a.name)) bad.push('attr ' + a.name);
        if (/^(href|src)$/i.test(a.name) && /^\\s*(javascript|data|http):/i.test(a.value)) bad.push(a.name + '=' + a.value.slice(0, 30));
      }
    }
  }
  return bad;
}"""

PNG_PIXELS_JS = """async (b64) => {
  const img = new Image(); img.src = 'data:image/png;base64,' + b64; await img.decode();
  const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
  const ctx = c.getContext('2d'); ctx.drawImage(img, 0, 0);
  const at = (x, y) => [...ctx.getImageData(x, y, 1, 1).data];
  const w = img.width, h = img.height;
  return {w, h, corners: [at(0, 3), at(w - 1, 3), at(0, h - 1), at(w - 1, h - 1)], bar: at(Math.floor(w / 2), 0), bg: at(w - 4, 24)};
}"""


# ---------------------------------------------------------------- the dashboard session

class Dashboard:
    """Owns the server (unless --url), the browser, the CDN replay cache and the expected values."""

    def __init__(self, args):
        self.args = args
        self.tmp = Path(tempfile.mkdtemp(prefix="verify-mastodon-"))
        self.server = None
        self.pw = self.browser = None
        self._cdn: dict[str, tuple[int, dict, bytes]] = {}
        self.now = datetime.now(timezone.utc)

    def __enter__(self):
        if self.args.url:
            self.base = self.args.url if self.args.url.endswith(("/", ".html")) else self.args.url + "/"
        else:
            self.server = Server(REPO_ROOT, self.args.port).__enter__()
            self.base = f"http://127.0.0.1:{self.server.port}/"
        self.pw = sync_playwright().start()
        self.browser = launch_browser(self.pw, self.args)
        self.static_html = self.fetch_text(self.base)
        data_text = self.fetch_text(urllib.parse.urljoin(self.base, self._asset_url(r"historicalData\.js")))
        self.data_text = data_text
        self.rows = parse_assignment(data_text)
        self.arch = Archive(self.rows)
        self.servers_data = self._optional_js("data/servers.js", "MASTODON_SERVERS")
        self.social_data = self._optional_js("data/social.js", "MASTODON_SOCIAL")
        self.avatar_hosts = node_json("process.stdout.write(JSON.stringify(require(process.argv[1]).AVATAR_HOSTS))", str(REPO_ROOT / "lib" / "social.js"))
        return self

    def __exit__(self, *exc):
        if self.browser:
            self.browser.close()
        if self.pw:
            self.pw.stop()
        if self.server:
            self.server.__exit__(*exc)
        shutil.rmtree(self.tmp, ignore_errors=True)

    def fetch_text(self, url: str, allow_missing: bool = False) -> str | None:
        req = self.pw.request.new_context()
        try:
            resp = req.get(url)
            if not resp.ok:
                if allow_missing:
                    return None
                raise RuntimeError(f"GET {url} -> HTTP {resp.status}")
            return resp.text()
        finally:
            req.dispose()

    def _asset_url(self, pattern: str) -> str:
        m = re.search(r"""<script[^>]+src=["']((?:\./)?""" + pattern + r"""[^"']*)["']""", self.static_html)
        if not m:
            raise RuntimeError(f"index.html does not load {pattern}")
        return m.group(1)

    def _optional_js(self, rel: str, var: str):
        text = self.fetch_text(urllib.parse.urljoin(self.base, rel), allow_missing=True)
        if not text:
            return None
        path = self.tmp / Path(rel).name
        path.write_text(text, encoding="utf-8")
        script = ("const vm=require('vm'),fs=require('fs');const c={};c.window=c;vm.createContext(c);"
                  "vm.runInContext(fs.readFileSync(process.argv[1],'utf8'),c);process.stdout.write(JSON.stringify(c[process.argv[2]]||null))")
        return node_json(script, str(path), var)

    def url(self, hash_: str = "") -> str:
        base = self.base.split("#")[0]
        return base + (("#" + hash_.lstrip("#")) if hash_ else "")

    # ---- pages

    def _cdn_route(self, route):
        url = route.request.url
        hit = self._cdn.get(url)
        if hit is None:
            try:
                resp = route.fetch()
                headers = {k: v for k, v in resp.headers.items() if k.lower() not in ("content-encoding", "content-length", "transfer-encoding")}
                hit = (resp.status, headers, resp.body())
            except PlaywrightError:
                route.abort()
                return
            if hit[0] == 200:
                self._cdn[url] = hit
        route.fulfill(status=hit[0], headers=hit[1], body=hit[2])

    def live_body(self, mode: str) -> str | None:
        a = self.arch
        _, total = a.last_valid("total")
        _, mau = a.last_valid("active")
        today = self.now.strftime("%Y-%m-%d")
        newest = today if today > a.last else a.last
        entry = lambda period, users, active, servers=7000: {"period": period, "server_count": str(servers), "user_count": str(int(users)), "active_user_count": str(int(active))}
        if mode == "fresh":
            return json.dumps([entry(newest, total + 4321, mau + 77, 7400), entry(day_add(newest, -1), total + 100, mau)])
        if mode == "partial":  # the UTC day in progress reports a tiny partial aggregate; the complete day before it is valid
            return json.dumps([entry(today, 52, 3, 1), entry(a.last, total + 1234, mau + 5, 7390)])
        if mode == "stale":  # nothing newer than the archive
            return json.dumps([entry(day_add(a.last, -1), total - 2000, mau - 400), entry(day_add(a.last, -2), total - 4000, mau - 800)])
        if mode == "garbage":
            return json.dumps([{"period": "nope", "user_count": "abc", "active_user_count": None}, {"hello": "world"}])
        return None

    def live_expected(self, mode: str) -> dict | None:
        a = self.arch
        _, total = a.last_valid("total")
        _, mau = a.last_valid("active")
        if mode == "fresh":
            return {"users": int(total + 4321), "mau": int(mau + 77)}
        if mode == "partial":
            return {"users": int(total + 1234), "mau": int(mau + 5)}
        return None

    def new_page(self, feed: str = "stale", width: int = 1440, height: int = 900, reduced_motion: str = "reduce",
                 social: str | None = None, servers: str | None = None, no_script: bool = False):
        """feed: stale | fresh | partial | fail | garbage | hang | passthrough.
        social/servers: None (real file), "missing" (HTTP 404), "empty" (loads, defines nothing), "fresh" (valid, no rows yet),
        "hostile" (fixture)."""
        ctx = self.browser.new_context(viewport={"width": width, "height": height}, accept_downloads=True,
                                       reduced_motion=reduced_motion, color_scheme="dark")
        page = ctx.new_page()
        page.console_errors = []
        page.on("console", lambda m: m.type == "error" and page.console_errors.append(m.text))
        page.on("pageerror", lambda e: page.console_errors.append(f"pageerror: {e}"))
        page.on("response", lambda r: r.status >= 400 and page.console_errors.append(f"HTTP {r.status} {r.url}"))
        page.live_requests = []
        page.pending_routes = []
        page.external_hosts = set()
        known = {urllib.parse.urlsplit(self.base).hostname, "localhost", "api.joinmastodon.org", *CDN_HOSTS, *self.avatar_hosts}

        def note_host(req):
            host = urllib.parse.urlsplit(req.url).hostname
            if host and host not in known:
                page.external_hosts.add(host)

        page.on("request", note_host)

        def handle_live(route):
            page.live_requests.append(route.request.url)
            body = self.live_body(feed)
            if feed == "passthrough":
                route.continue_()
            elif feed == "fail":
                route.abort("failed")
            elif feed == "hang":
                page.pending_routes.append(route)
            else:
                route.fulfill(status=200, content_type="application/json", headers={"access-control-allow-origin": "*"}, body=body)

        page.route(LIVE_GLOB, handle_live)
        avatar_hosts = set(self.avatar_hosts)
        page.route(lambda url: (urllib.parse.urlsplit(url).hostname or "") in avatar_hosts,
                   lambda route: route.fulfill(status=200, content_type="image/svg+xml", body=avatar_svg(route.request.url)))
        for host in CDN_HOSTS:
            page.route(f"**://{host}/**", self._cdn_route)

        day = (self.social_data or {}).get("day") or (self.now - timedelta(days=1)).strftime("%Y-%m-%d")

        def data_route(var: str, mode: str | None, fixture):
            def handler(route):
                if mode == "missing":
                    route.fulfill(status=404, content_type="text/plain", body="not found")
                elif mode == "empty":
                    route.fulfill(status=200, content_type="text/javascript", body="// no data yet\n")
                elif mode == "hostile":
                    route.fulfill(status=200, content_type="text/javascript", body=as_js(var, fixture))
                elif mode == "fresh":
                    route.fulfill(status=200, content_type="text/javascript", body=as_js(var, fresh_fixture(var, day)))
                else:
                    route.continue_()
            return handler

        if social:
            page.route(SOCIAL_GLOB, data_route("MASTODON_SOCIAL", social, social_fixture(day)))
        if servers:
            page.route(SERVERS_GLOB, data_route("MASTODON_SERVERS", servers, servers_fixture(day)))
        if no_script:
            page.route(SCRIPT_GLOB, lambda route: route.abort())
        return page

    @staticmethod
    def close(page):
        for route in getattr(page, "pending_routes", []):
            try:
                route.abort()
            except PlaywrightError:
                pass
        page.context.close()

    def open(self, page, hash_: str = "", wait_ready: bool = True):
        page.goto(self.url(hash_), wait_until="load")
        if not wait_ready:
            return
        page.wait_for_function("() => ['true','error'].includes(document.documentElement.dataset.ready)", timeout=30000)
        state = page.evaluate("() => document.documentElement.dataset.ready")
        if state != "true":
            raise RuntimeError(f"page reported ready={state!r}: {' | '.join(page.console_errors)[:300]}")

    def charts(self, page, with_data: bool = False) -> dict:
        return page.evaluate(CHARTS_JS, with_data)

    def state(self, page) -> dict:
        return page.evaluate("() => JSON.parse(JSON.stringify(window.MastodonTerminal.app.state))")

    def hash_state(self, page) -> dict:
        return dict(urllib.parse.parse_qsl(page.evaluate("() => location.hash").lstrip("#")))

    def shot(self, page, name: str, full_page: bool = False):
        out = Path(self.args.out) if self.args.out else ARTIFACTS
        out.mkdir(parents=True, exist_ok=True)
        path = out / f"{name}.png"
        page.screenshot(path=str(path), full_page=full_page)
        print(f"  screenshot: {path.relative_to(REPO_ROOT) if path.is_relative_to(REPO_ROOT) else path}")
        return path

    def shot_el(self, page, selector: str, name: str):
        out = Path(self.args.out) if self.args.out else ARTIFACTS
        out.mkdir(parents=True, exist_ok=True)
        loc = page.locator(selector)
        loc.scroll_into_view_if_needed()
        page.mouse.move(0, 0)  # no row left in its hover state
        page.add_style_tag(content=".terminal-command-bar { visibility: hidden !important; }")
        path = out / f"{name}.png"
        loc.screenshot(path=str(path))
        print(f"  screenshot: {path.relative_to(REPO_ROOT) if path.is_relative_to(REPO_ROOT) else path}")
        return path


def parse_assignment(text: str) -> list[dict]:
    """historicalData.js is `const historicalData = [ ... ];`."""
    eq = text.index("=")
    return json.loads(text[eq + 1:].strip().rstrip(";").strip())


def node_json(script: str, *argv: str):
    out = subprocess.run(["node", "-e", script, *argv], capture_output=True, text=True, check=True)
    return json.loads(out.stdout)


def launch_browser(pw, args):
    """Playwright's bundled Chromium, or the installed Google Chrome when that build is missing."""
    errors = []
    for opts in ({}, {"channel": "chrome"}):
        try:
            browser = pw.chromium.launch(headless=not args.headed, slow_mo=args.slow_mo, **opts)
            browser.label = "system Chrome (channel=chrome)" if opts else "bundled Chromium"
            return browser
        except PlaywrightError as e:
            errors.append(str(e).splitlines()[0])
    raise RuntimeError("Could not launch Chromium: " + " | ".join(errors) + ". Run: python -m playwright install chromium")


def errors_of(page, ignore=()) -> list[str]:
    return [e for e in page.console_errors if not any(s in e for s in ignore)]


def no_errors(res: Results, suite: str, page, label: str = "no console errors", ignore=()):
    errs = errors_of(page, ignore)
    return res.check(suite, label, not errs, " | ".join(errs)[:500])


def click_range(page, rng: str):
    page.locator(f'.time-btn[data-range="{rng}"]').click()
    page.wait_for_function("(r) => window.MastodonTerminal.app.state.range === r", arg=rng, timeout=5000)


def window_of(chart: dict) -> tuple:
    return chart["first"], chart["last"], chart["points"]


# ---------------------------------------------------------------- doctor

def cmd_doctor(args, res: Results):
    s = "doctor"
    print("== doctor")
    required = ["index.html", "style.css", "script.js", "social.js", "social.css", "historicalData.js", "favicon.svg", "og-image.png",
                "data/mastodon-daily.csv", "lib/format.js", "lib/prerender.js", "lib/social.js", "sitemap.xml", "robots.txt", "README.md", "LICENSE"]
    for f in required:
        p = REPO_ROOT / f
        res.check(s, f"file {f}", p.exists() and p.stat().st_size > 0, f"{p.stat().st_size:,} bytes" if p.exists() else "missing")
    for f in ("data/servers.js", "data/social.js"):
        p = REPO_ROOT / f
        if p.exists():
            res.check(s, f"file {f}", p.stat().st_size > 0, f"{p.stat().st_size:,} bytes")
        else:
            res.warn(s, f"file {f} not built yet", "the panels then show the Collecting state")

    node = shutil.which("node")
    if res.check(s, "node on PATH", bool(node), node or "install Node >= 22"):
        ver = subprocess.run(["node", "--version"], capture_output=True, text=True).stdout.strip()
        res.check(s, "node >= 22", int(re.sub(r"\D", "", ver.split(".")[0]) or 0) >= 22, ver)
        for f in ("script.js", "social.js"):
            c = subprocess.run(["node", "--check", f], cwd=REPO_ROOT, capture_output=True, text=True)
            res.check(s, f"node --check {f}", c.returncode == 0, norm(c.stderr)[:300])
        t = subprocess.run(["npm", "test", "--silent"], cwd=REPO_ROOT, capture_output=True, text=True)
        summary = " ".join(l.strip("ℹ ").strip() for l in t.stdout.splitlines() if re.match(r"^ℹ (tests|pass|fail) ", l))
        res.check(s, "npm test (script.test.js)", t.returncode == 0, summary or norm(t.stderr)[-300:])
        pr = subprocess.run(["node", "lib/prerender.js", "--dry-run"], cwd=REPO_ROOT, capture_output=True, text=True)
        out = norm(pr.stderr + " " + pr.stdout)
        clean = pr.returncode == 0 and "stale" not in out and "missing:" not in out
        res.check(s, "pre-render contract (every key in index.html, markup up to date)", clean, "" if clean else out[:400])

    index = REPO_ROOT / "index.html"
    if index.exists():
        html = index.read_text(encoding="utf-8")
        for lib in PINNED_LIBS:
            tag = re.search(r"<script[^>]*src=\"" + re.escape(lib) + r"\"[^>]*>", html)
            res.check(s, f"pinned {lib.split('/npm/')[1].split('/')[0]} with SRI", bool(tag) and "integrity=" in tag.group(0))
        res.check(s, "historicalData.js has ?v= cache-bust", bool(re.search(r"historicalData\.js\?v=", html)))
        head = html.split("</head>")[0]
        res.check(s, "no <a> inside <head>", not re.search(r"<a\b", head, re.I))
        abs_path = re.search(r"""(?:src|href)=["']/(?!/)[^"']*""", html)
        res.check(s, "relative asset URLs only", not abs_path, f"{abs_path.group(0)} breaks the /Mastodon-User-Trends/ subpath" if abs_path else "")
        images = {m.group(1) for m in re.finditer(r"""<meta[^>]+(?:property|name)=["'](?:og|twitter):image["'][^>]*content=["']([^"']+)["']""", head)}
        for url in sorted(images):
            local = url.replace(SITE_URL, "", 1) if url.startswith(SITE_URL) else None
            ok = local is None or (REPO_ROOT / local).exists()
            res.check(s, f"social image exists: {url.rsplit('/', 1)[-1]}", ok, "" if ok else f"{url} is not in the repo")
        res.check(s, "no analytics scripts", not re.search(r"googletagmanager|google-analytics|plausible|matomo", html, re.I))
    for wf in ("update-data.yml", "test.yml", "collect-servers.yml", "collect-social.yml"):
        res.check(s, f"workflow .github/workflows/{wf}", (REPO_ROOT / ".github" / "workflows" / wf).exists())

    if sync_playwright is None:
        res.check(s, "playwright importable", False, f"{sys.executable} has no playwright; pip install playwright")
        return
    res.check(s, "playwright importable", True, sys.executable)
    try:
        with sync_playwright() as pw:
            b = launch_browser(pw, args)
            res.check(s, "Chromium launches", True, f"{b.label} {b.version}")
            b.close()
    except Exception as e:  # noqa: BLE001
        res.check(s, "Chromium launches", False, str(e)[:300])


# ---------------------------------------------------------------- smoke / status / kpi

def cmd_smoke(args, res: Results, dash: Dashboard):
    s = "smoke"
    print("== smoke")
    a = dash.arch
    page = dash.new_page(feed="stale", reduced_motion="no-preference")
    t0 = datetime.now()
    dash.open(page)
    took = (datetime.now() - t0).total_seconds()
    res.check(s, "page loads and the ready flag is 'true'", page.evaluate("() => document.documentElement.dataset.ready") == "true", f"{took:.1f}s with motion enabled")
    title = page.title()
    res.check(s, "title and H1 name the network", "Mastodon" in title and "Mastodon" in page.locator("h1").text_content(), title)
    charts = dash.charts(page)
    res.check(s, "all six charts exist", sorted(charts) == sorted(CHART_KEYS), ", ".join(f"{k}({c['points']})" for k, c in (charts or {}).items()))
    for key in CHART_KEYS:
        c = charts.get(key)
        if not c:
            continue
        has_empty = page.locator(f"#section-{key}-chart .chart-empty").is_visible()
        any_data = any(d["nonNull"] > 0 for d in c["datasets"])
        res.check(s, f"{key} chart plots data (or shows its Collecting note)", any_data or has_empty,
                  f"{c['points']} points; datasets {[(d['label'], d['nonNull']) for d in c['datasets']]}")
        res.check(s, f"{key} chart canvas has a descriptive aria-label", len(c["aria"]) > 40 and "data table" in c["aria"], c["aria"][:100])
    orphan = page.evaluate("""() => [...document.querySelectorAll('canvas')].filter(c => {
        if (c.offsetParent === null) return false;
        const ctx = c.getContext('2d'); if (!ctx || !c.width || !c.height) return true;
        const px = ctx.getImageData(0, 0, c.width, c.height).data;
        for (let i = 3; i < px.length; i += 4) if (px[i]) return false;
        return true;
      }).map(c => c.id || 'canvas')""")
    res.check(s, "no blank canvases", not orphan, f"blank: {orphan}" if orphan else "")
    res.check(s, "archive loaded: every calendar day from the first row to the last", page.evaluate("() => window.MastodonTerminal.app.s.length") == a.n,
              f"{a.n} days, {a.first} to {a.last}")
    clock = norm(page.locator("#clock-utc").text_content())
    res.check(s, "UTC clock is running", bool(re.fullmatch(r"\d\d:\d\d:\d\d", clock)), clock)
    res.check(s, "data-error banner hidden", not page.locator("#data-error").is_visible())
    unpressed = page.evaluate("""() => [...document.querySelectorAll('.time-btn, #toggle-ma-btn, #toggle-log-btn, #toggle-compare-btn, .surge-chip, .vel-mode-btn, .rat-mode-btn, .srv-mode-btn, #ticker-pause')]
        .filter(b => !['true', 'false'].includes(b.getAttribute('aria-pressed'))).map(b => b.textContent.trim().slice(0, 20))""")
    res.check(s, "toggle buttons expose aria-pressed", not unpressed, json.dumps(unpressed[:6]))
    loud = page.evaluate("""() => {
        const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT); const out = [];
        for (let n = w.nextNode(); n; n = w.nextNode()) {
          if (/\\p{Extended_Pictographic}/u.test(n.textContent) && !n.parentElement.closest('[aria-hidden="true"], script, style, .soc-acct-text, .soc-post-text')) out.push(n.textContent.trim().slice(0, 30));
        }
        return out;
      }""")
    res.check(s, "emoji in UI chrome are hidden from screen readers", not loud, json.dumps(loud[:5], ensure_ascii=False))
    no_errors(res, s, page)
    res.check(s, "the page talks only to its own host, the CDNs and api.joinmastodon.org", not page.external_hosts, str(sorted(page.external_hosts)))
    dash.shot(page, "smoke-desktop")
    dash.shot(page, "smoke-desktop-full", full_page=True)
    dash.close(page)


def cmd_status(args, res: Results, dash: Dashboard):
    s = "status"
    print("== status")
    a = dash.arch
    _, total = a.last_valid("total")
    archived = fmt_int(total)

    def status_text(p):
        return norm(p.locator("#data-status").text_content())

    # fresh reading -> LIVE
    page = dash.new_page(feed="fresh")
    dash.open(page)
    page.wait_for_function("() => /LIVE/i.test(document.querySelector('#data-status').textContent)", timeout=10000)
    live = dash.live_expected("fresh")
    res.check(s, "fresh reading -> status LIVE", status_text(page) == "LIVE", status_text(page))
    res.check(s, "status indicator takes the live class", page.evaluate("() => document.querySelector('#status-indicator').classList.contains('live')"))
    res.check(s, "page requested the statistics API once", len(page.live_requests) == 1, f"{len(page.live_requests)} request(s)")
    shown = norm(page.locator("#kpi-users-value").text_content())
    res.check(s, "TOTAL USERS shows the live figure", shown == fmt_int(live["users"]), f"{shown} vs {fmt_int(live['users'])}")
    res.check(s, "TOTAL USERS chip reads LIVE", norm(page.locator("#kpi-users-chip").text_content()) == "LIVE")
    note = page.locator("#kpi-users-note")
    res.check(s, "live note is shown with the MAU reading", note.is_visible() and "LIVE" in note.text_content() and fmt_compact(live["mau"]) in note.text_content(),
              norm(note.text_content()))
    tick = norm(page.locator('.tick[data-tick="users"] .tick-val').first.text_content())
    res.check(s, "ticker USERS shows the live figure", tick == fmt_int(live["users"]), tick)
    charts = dash.charts(page, True)
    tot = next(d for d in charts["tot"]["datasets"] if d["role"] == "raw" and d["metaKey"] == "total")
    res.check(s, "charts keep the archive's end-of-day total", tot["data"][-1] == total, f"{tot['data'][-1]} vs {total}")
    no_errors(res, s, page)
    dash.shot(page, "status-live")
    dash.close(page)

    # the day in progress reports a tiny partial aggregate: it must be skipped
    page = dash.new_page(feed="partial")
    dash.open(page)
    page.wait_for_function("() => /LIVE/i.test(document.querySelector('#data-status').textContent)", timeout=10000)
    live = dash.live_expected("partial")
    shown = norm(page.locator("#kpi-users-value").text_content())
    res.check(s, "a partial aggregate for today is skipped for the newest complete day", shown == fmt_int(live["users"]), f"{shown} vs {fmt_int(live['users'])}")
    dash.close(page)

    for mode in ("stale", "garbage", "fail", "hang"):
        page = dash.new_page(feed=mode)
        if mode == "hang":
            with page.expect_event("requestfailed", lambda r: "statistics" in r.url, timeout=15000):
                dash.open(page)
        else:
            dash.open(page)
        # The page makes its request right after the ready flag. Wait for it, then let the response (or the failure) settle:
        # an archive-mode page shows no signal when it has nothing to change, so a short settle is all there is to wait on.
        while not page.live_requests:
            page.wait_for_timeout(25)
        page.evaluate("() => new Promise((r) => setTimeout(r, 400))")
        res.check(s, f"{mode} feed -> status ARCHIVE", status_text(page) == "ARCHIVE", status_text(page))
        res.check(s, f"{mode} feed -> TOTAL USERS stays at the archived figure", norm(page.locator("#kpi-users-value").text_content()) == archived,
                  norm(page.locator("#kpi-users-value").text_content()))
        res.check(s, f"{mode} feed -> fails silently", not errors_of(page, ("Failed to load resource", "ERR_FAILED", "net::")), " | ".join(page.console_errors)[:300])
        if mode == "stale":
            res.check(s, "DATA THRU names the last archive day", norm(page.locator("#last-updated-time").text_content()) == fmt_day(a.last),
                      norm(page.locator("#last-updated-time").text_content()))
            res.check(s, "ARCHIVE state is described for screen readers", a.last and fmt_day(a.last) in (page.locator("#status-detail").text_content() or ""),
                      page.locator("#status-detail").text_content())
            dash.shot(page, "status-archive")
        dash.close(page)


def expected_kpis(a: Archive) -> dict:
    mean7 = lambda col: (lambda v: sum(v) / len(v) if v else None)([x for x in col[-7:] if x is not None])
    _, mau = a.last_valid("active")
    _, total = a.last_valid("total")
    _, servers = a.last_valid("servers")
    return {
        "kpi-mau-value": fmt_compact(mau),
        "kpi-users-value": fmt_int(total),
        "kpi-mauvel-value": (lambda m: "—" if m is None else f"{fmt_signed(m)}/day")(mean7(a.s["net_active"])),
        "kpi-signups-value": (lambda m: "—" if m is None else f"{fmt_signed(m)}/day")(mean7(a.s["net_total"])),
        "kpi-servers-value": fmt_int(servers),
    }


def cmd_kpi(args, res: Results, dash: Dashboard):
    s = "kpi"
    print("== kpi")
    a = dash.arch
    page = dash.new_page(feed="stale")
    dash.open(page)
    for cid, want in expected_kpis(a).items():
        got = norm(page.locator(f"#{cid}").text_content())
        res.check(s, f"{cid} = {want}", got == want and got not in ("", "—"), f"page shows {got!r}")
    for card in ("mau", "users", "mauvel", "signups", "servers"):
        trend = norm(page.locator(f"#kpi-{card}-trend").text_content())
        res.check(s, f"{card} card: trend badge filled", bool(trend) and trend != "—" and bool(re.search(r"[▲▼■]", trend)), trend)
        d = page.locator(f"#spark-{card} path").get_attribute("d") or ""
        res.check(s, f"{card} card: sparkline drawn", len(d) > 20, f"{len(d)} chars")
    res.check(s, "TOTAL USERS card: net change line", "in range" in norm(page.locator("#kpi-users-comp").text_content()),
              norm(page.locator("#kpi-users-comp").text_content()))
    peak = a.s["active"].index(max(v for v in a.s["active"] if v is not None))
    card = norm(page.locator("#card-mau").text_content())
    res.check(s, "MAU card: ATH is the archive maximum", fmt_compact(a.s["active"][peak]) in card and fmt_day(a.dates[peak]) in card,
              f"{fmt_compact(a.s['active'][peak])} on {fmt_day(a.dates[peak])}")
    nets = a.s["net_total"]
    pk = max(range(len(nets)), key=lambda i: nets[i] if nets[i] is not None else -1e18)
    card = norm(page.locator("#card-signups").text_content())
    res.check(s, "NET SIGNUPS card: peak is the largest usable day (flagged steps excluded)", fmt_signed(nets[pk]) in card and fmt_day(a.dates[pk]) in card,
              f"{fmt_signed(nets[pk])} on {fmt_day(a.dates[pk])}")

    # ticker
    items = page.evaluate("() => [...document.querySelectorAll('#ticker-items li.tick')].map(li => ({key: li.dataset.tick, sym: li.querySelector('.tick-sym').textContent, val: li.querySelector('.tick-val').textContent}))")
    keys = [i["key"] for i in items]
    res.check(s, "ticker has MAU, USERS, MAU/DAY, NET/DAY, ENGAGEMENT and SERVERS", all(k in keys for k in ("mau", "users", "mauvel", "signups", "engagement", "servers")), str(keys))
    want = expected_kpis(a)
    by = {i["key"]: i["val"] for i in items}
    res.check(s, "ticker values match the cards", by.get("mau") == want["kpi-mau-value"] and by.get("users") == want["kpi-users-value"]
              and by.get("mauvel") == want["kpi-mauvel-value"] and by.get("signups") == want["kpi-signups-value"] and by.get("servers") == want["kpi-servers-value"], str(by))
    clone = page.locator("#ticker-clone li.tick").count()
    res.check(s, "ticker loop clone mirrors the items (aria-hidden)", clone == len(items) and page.locator("#ticker-clone").get_attribute("aria-hidden") == "true", f"{clone} vs {len(items)}")
    anim = page.evaluate("() => getComputedStyle(document.querySelector('.ticker-track')).animationName")
    res.check(s, "ticker is static under prefers-reduced-motion", anim == "none", anim)
    res.check(s, "reduced motion: the pause button and the loop clone are hidden", not page.locator("#ticker-pause").is_visible()
              and not page.locator("#ticker-clone").is_visible())
    moving = dash.new_page(feed="stale", reduced_motion="no-preference")
    dash.open(moving)
    anim = moving.evaluate("() => getComputedStyle(document.querySelector('.ticker-track')).animationName")
    res.check(s, "with motion enabled the ticker scrolls", anim not in ("none", ""), anim)
    pause = moving.locator("#ticker-pause")
    pause.click()
    res.check(s, "ticker pause toggles aria-pressed and the paused class", pause.get_attribute("aria-pressed") == "true"
              and moving.evaluate("() => document.querySelector('#ticker').classList.contains('paused')"))
    state = moving.evaluate("() => getComputedStyle(document.querySelector('.ticker-track')).animationPlayState")
    res.check(s, "paused ticker stops animating", state == "paused", state)
    pause.click()
    res.check(s, "ticker resumes", pause.get_attribute("aria-pressed") == "false")
    dash.close(moving)

    # FediDB strip
    strip = page.locator("#strip-stats .index-stat")
    last_fedi = [(k, a.last_valid(k)) for k in ("fedi_instances", "statuses", "fedi_users")]
    expect_parts = sum(1 for _, (i, v) in last_fedi if v is not None)
    res.check(s, "FediDB strip shows one stat per figure the archive has", strip.count() == max(1, expect_parts), f"{strip.count()} vs {expect_parts}")
    texts = [norm(t) for t in strip.all_text_contents()]
    ok = True
    for (k, (i, v)), label, f in zip(last_fedi, ("SERVERS", "POSTS", "USERS"), (fmt_int, fmt_compact, fmt_compact)):
        if v is not None:
            ok = ok and any(t.startswith(label) and f(v) in t for t in texts)
    res.check(s, "FediDB strip values match the archive's newest reading", ok, str(texts))
    res.check(s, "FediDB strip says it is a different base", "different base" in norm(page.locator("#index-strip-title").text_content()))
    no_errors(res, s, page)
    dash.close(page)


# ---------------------------------------------------------------- ranges, toggles, compare, keyboard

def cmd_ranges(args, res: Results, dash: Dashboard):
    s = "ranges"
    print("== ranges")
    a = dash.arch
    page = dash.new_page()
    dash.open(page)
    buttons = page.evaluate("() => [...document.querySelectorAll('.time-btn[data-range]')].map(b => b.dataset.range)")
    expect = RANGES[:7] + a.year_ranges()[2:] + ["ALL"]
    res.check(s, "range buttons: 1W..2Y, a button per extra year of history, ALL", buttons == expect, f"{buttons} vs {expect}")
    res.check(s, "default range is 1Y", page.locator(f'.time-btn[data-range="{DEFAULT_RANGE}"]').get_attribute("aria-pressed") == "true")
    for r in buttons:
        click_range(page, r)
        start, end = a.bounds(r)
        n = days_between(start, end) + 1
        charts = dash.charts(page)
        pressed = page.evaluate("() => [...document.querySelectorAll('.time-btn[aria-pressed=true]')].map(b => b.dataset.range)")
        res.check(s, f"{r}: only {r} is pressed", pressed == [r], str(pressed))
        res.check(s, f"{r}: URL hash r={r}", dash.hash_state(page).get("r") == r, page.evaluate("() => location.hash"))
        res.check(s, f"{r}: VIEWING label '{RANGE_LABELS[r]}'", norm(page.locator("#selected-range-label").text_content()) == RANGE_LABELS[r],
                  norm(page.locator("#selected-range-label").text_content()))
        want_dates = f"{fmt_day(start)} → {fmt_day(end)} · {n} pts"
        res.check(s, f"{r}: dates and points '{want_dates}'", norm(page.locator("#selected-range-dates").text_content()) == want_dates,
                  norm(page.locator("#selected-range-dates").text_content()))
        bad = {k: window_of(c) for k, c in charts.items() if window_of(c) != (start, end, n)}
        res.check(s, f"{r}: every chart plots {start} → {end} ({n} points)", not bad, f"off: {bad}" if bad else "")
        rows = page.locator("#data-table-body tr").count()
        res.check(s, f"{r}: table shows min(30, {n}) rows", rows == min(30, n), str(rows))
    dash.shot(page, "ranges-all")
    # hash restores the range on a cold load
    page.goto(dash.url("r=3M&ma=0&log=0&cmp=0"))
    page.reload(wait_until="load")
    page.wait_for_function("() => document.documentElement.dataset.ready === 'true'", timeout=30000)
    start, end = a.bounds("3M")
    res.check(s, "hash #r=3M restores the range on load", page.locator('.time-btn[data-range="3M"]').get_attribute("aria-pressed") == "true"
              and window_of(dash.charts(page)["velocity"]) == (start, end, days_between(start, end) + 1))
    # an unknown range in the hash falls back to 1Y
    page.goto(dash.url("r=BOGUS"))
    page.reload(wait_until="load")
    page.wait_for_function("() => document.documentElement.dataset.ready === 'true'", timeout=30000)
    res.check(s, "an invalid range in the hash falls back to 1Y", page.locator('.time-btn[data-range="1Y"]').get_attribute("aria-pressed") == "true")
    no_errors(res, s, page)
    dash.close(page)


def ma_counts(charts: dict) -> dict:
    return {k: sum(1 for d in c["datasets"] if d["role"] == "ma") for k, c in charts.items()}


def cmd_toggles(args, res: Results, dash: Dashboard):
    s = "toggles"
    print("== toggles")
    a = dash.arch
    page = dash.new_page()
    dash.open(page)
    ma = page.locator("#toggle-ma-btn")
    res.check(s, "7D MA starts on", ma.get_attribute("aria-pressed") == "true")
    before = ma_counts(dash.charts(page))
    res.check(s, "MA lines drawn on velocity, MAU, SRV, REC and RAT", all(before[k] >= 1 for k in ("velocity", "mau", "srv", "rec", "rat")), str(before))
    charts = dash.charts(page, True)
    oracle = a.ma("active")
    lo, hi = a.window(DEFAULT_RANGE)
    ds = next(d for d in charts["mau"]["datasets"] if d["role"] == "ma")
    want = oracle[lo:hi + 1]
    same = all((x is None and y is None) or (x is not None and y is not None and abs(x - y) < 1e-6) for x, y in zip(ds["data"], want)) and len(ds["data"]) == len(want)
    res.check(s, "MAU 7D average equals a trailing 7-calendar-day mean (>= 4 usable days)", same)
    ma.click()
    after = ma_counts(dash.charts(page))
    res.check(s, "7D MA off: aria-pressed=false, MA lines removed", ma.get_attribute("aria-pressed") == "false" and all(v == 0 for v in after.values()), str(after))
    res.check(s, "URL hash ma=0", dash.hash_state(page).get("ma") == "0", page.evaluate("() => location.hash"))
    res.check(s, "MA legend hidden while off", not page.locator("#section-mau-chart .ma-legend").is_visible())
    ma.click()
    res.check(s, "7D MA back on", ma_counts(dash.charts(page)) == before and dash.hash_state(page).get("ma") == "1")

    log = page.locator("#toggle-log-btn")
    y0 = {k: c["yType"] for k, c in dash.charts(page).items()}
    res.check(s, "LOG starts off (all linear)", log.get_attribute("aria-pressed") == "false" and set(y0.values()) == {"linear"}, str(y0))
    log.click()
    y1 = {k: c["yType"] for k, c in dash.charts(page).items()}
    res.check(s, "LOG: MAU, SRV, REC and TOT go logarithmic, USR and RAT stay linear",
              all(y1[k] == "logarithmic" for k in LOG_CHARTS) and y1["velocity"] == "linear" and y1["rat"] == "linear", str(y1))
    res.check(s, "LOG: aria-pressed and hash log=1", log.get_attribute("aria-pressed") == "true" and dash.hash_state(page).get("log") == "1")
    tags = page.evaluate("() => [...document.querySelectorAll('.log-capable')].map(e => e.textContent.trim())")
    res.check(s, "LOG: scale tags read LOG", bool(tags) and set(tags) == {"LOG"}, str(tags))
    dash.shot(page, "toggles-log")
    log.click()
    res.check(s, "LOG off restores linear axes", {k: c["yType"] for k, c in dash.charts(page).items()} == y0)

    # hash round trip: cold load with a full state, then UI changes, then an in-page hashchange
    full = "r=3M&ma=0&log=1&cmp=1&vm=signups&rm=pm&sm=ups"
    page.goto(dash.url(full))
    page.reload(wait_until="load")
    page.wait_for_function("() => document.documentElement.dataset.ready === 'true'", timeout=30000)
    st = dash.state(page)
    res.check(s, "cold load restores range, MA, LOG, COMPARE, velocity, ratio and server modes",
              (st["range"], st["ma"], st["log"], st["cmp"], st["vm"], st["rm"], st["sm"]) == ("3M", False, True, True, "signups", "posts_per_mau", "users_per_server"), str(st))
    res.check(s, "controls reflect the restored state", page.locator("#toggle-ma-btn").get_attribute("aria-pressed") == "false"
              and page.locator("#toggle-log-btn").get_attribute("aria-pressed") == "true"
              and page.locator("#toggle-compare-btn").get_attribute("aria-pressed") == "true"
              and page.locator('.vel-mode-btn[data-mode="signups"]').get_attribute("aria-pressed") == "true"
              and page.locator('.rat-mode-btn[data-mode="posts_per_mau"]').get_attribute("aria-pressed") == "true"
              and page.locator('.srv-mode-btn[data-mode="users_per_server"]').get_attribute("aria-pressed") == "true")
    page.locator('.time-btn[data-range="1M"]').click()
    page.locator("#toggle-ma-btn").click()
    h = dash.hash_state(page)
    res.check(s, "UI changes are written back to the hash", (h.get("r"), h.get("ma"), h.get("log"), h.get("cmp"), h.get("vm"), h.get("rm"), h.get("sm"))
              == ("1M", "1", "1", "1", "signups", "pm", "ups"), page.evaluate("() => location.hash"))
    page.evaluate("() => { location.hash = '#r=6M&ma=1&log=0&cmp=0'; }")
    page.wait_for_function("() => window.MastodonTerminal.app.state.range === '6M'", timeout=5000)
    st = dash.state(page)
    res.check(s, "an in-page hash change (back/forward, pasted link) updates the view without reload",
              (st["range"], st["ma"], st["log"], st["cmp"]) == ("6M", True, False, False) and page.locator('.time-btn[data-range="6M"]').get_attribute("aria-pressed") == "true", str(st))
    no_errors(res, s, page)
    dash.close(page)


def cmd_compare(args, res: Results, dash: Dashboard):
    s = "compare"
    print("== compare")
    a = dash.arch
    page = dash.new_page()
    dash.open(page)
    btn = page.locator("#toggle-compare-btn")
    res.check(s, "COMPARE starts off", btn.get_attribute("aria-pressed") == "false")
    res.check(s, "no prior overlays, prior range text hidden", all(d["role"] != "prior" for c in dash.charts(page).values() for d in c["datasets"])
              and not page.locator("#prior-range-dates").is_visible())
    btn.click()
    res.check(s, "COMPARE on: aria-pressed and hash cmp=1", btn.get_attribute("aria-pressed") == "true" and dash.hash_state(page).get("cmp") == "1")
    charts = dash.charts(page, True)
    lo, hi = a.window(DEFAULT_RANGE)
    n = hi - lo + 1
    for key in ("velocity", "mau", "tot", "srv"):
        priors = [d for d in charts[key]["datasets"] if d["role"] == "prior"]
        need_data = key != "srv"  # the server count only exists for the newest weeks
        res.check(s, f"{key}: dashed prior-period overlay with the window's length",
                  len(priors) >= 1 and priors[0]["n"] == n and len(priors[0]["dash"]) > 0 and (priors[0]["nonNull"] > 0 or not need_data),
                  str([(p["label"], p["n"], p["nonNull"]) for p in priors]))
    pr = a.prior(DEFAULT_RANGE)
    tot_prior = next(d for d in charts["tot"]["datasets"] if d["role"] == "prior")
    want = [a.s["total"][i - pr["span"]] if i - pr["span"] >= 0 else None for i in range(lo, hi + 1)]
    res.check(s, "TOT prior overlay holds the totals from the same number of calendar days earlier", tot_prior["data"] == want)
    text = norm(page.locator("#prior-range-dates").text_content())
    want_text = f"PRIOR {fmt_day(pr['start'])} → {fmt_day(pr['end'])}"
    res.check(s, f"prior range label '{want_text}'", page.locator("#prior-range-dates").is_visible() and text.startswith(want_text), text)
    for card in ("mau", "users", "mauvel", "signups", "servers"):
        loc = page.locator(f"#kpi-{card}-prior")
        res.check(s, f"{card} card: prior-period line visible", loc.is_visible() and "PRIOR" in loc.text_content(), norm(loc.text_content()))
    res.check(s, "Prior period legend badge shown", page.locator("#section-velocity-chart .chart-comparison-legend").is_visible())
    dash.shot(page, "compare-1y")

    # a window that begins before the data does is labelled PARTIAL
    click_range(page, "3Y")
    pr3 = a.prior("3Y")
    t3 = norm(page.locator("#prior-range-dates").text_content())
    res.check(s, "3Y: prior period truncated at the first day is labelled PARTIAL", bool(pr3 and pr3["truncated"]) == ("PARTIAL" in t3), t3)
    # ALL has no prior: COMPARE switches to 1Y
    click_range(page, "ALL")
    res.check(s, "ALL: COMPARE is switched off (no prior period)", btn.get_attribute("aria-pressed") == "false")
    res.check(s, "ALL: COMPARE is marked unsupported", page.evaluate("() => document.querySelector('#toggle-compare-btn').classList.contains('range-unsupported')"))
    btn.click()
    st = dash.state(page)
    res.check(s, "ALL: pressing COMPARE moves to 1Y with the overlay on", st["range"] == "1Y" and st["cmp"] is True, str(st))
    btn.click()
    off = [d for c in dash.charts(page).values() for d in c["datasets"] if d["role"] == "prior"]
    res.check(s, "COMPARE off removes every overlay", not off and not page.locator("#prior-range-dates").is_visible())
    no_errors(res, s, page)
    dash.close(page)


def cmd_keyboard(args, res: Results, dash: Dashboard):
    s = "keyboard"
    print("== keyboard")
    page = dash.new_page()
    dash.open(page)
    page.evaluate("() => document.activeElement && document.activeElement.blur()")
    for i, r in enumerate(RANGES, start=1):
        page.keyboard.press(str(i))
        page.wait_for_function("(r) => window.MastodonTerminal.app.state.range === r", arg=r, timeout=5000)
        res.check(s, f"key {i} selects {r}", page.locator(f'.time-btn[data-range="{r}"]').get_attribute("aria-pressed") == "true"
                  and dash.hash_state(page).get("r") == r)
    page.keyboard.press("6")
    for key, btn_id, name in (("m", "#toggle-ma-btn", "ma"), ("l", "#toggle-log-btn", "log"), ("c", "#toggle-compare-btn", "cmp")):
        b = page.locator(btn_id)
        before = b.get_attribute("aria-pressed")
        page.keyboard.press(key)
        res.check(s, f"key {key.upper()} toggles {name}", b.get_attribute("aria-pressed") != before and dash.hash_state(page).get(name) == ("1" if before == "false" else "0"),
                  f"{before} -> {b.get_attribute('aria-pressed')}")
        page.keyboard.press(key.upper())
        res.check(s, f"key Shift+{key.upper()} toggles it back", b.get_attribute("aria-pressed") == before)
    dialog = page.locator("#guide-dialog")
    page.keyboard.press("?")
    res.check(s, "? opens the guide", dialog.evaluate("d => d.open === true"))
    page.keyboard.press("2")
    res.check(s, "range keys are ignored while the guide is open", dash.state(page)["range"] == "1Y")
    page.keyboard.press("?")
    res.check(s, "? closes the guide", dialog.evaluate("d => d.open === false"))
    page.keyboard.press("?")
    page.keyboard.press("Escape")
    res.check(s, "Esc closes the guide", dialog.evaluate("d => d.open === false"))
    page.evaluate("() => document.activeElement && document.activeElement.blur()")
    page.keyboard.press("Tab")
    ring = page.evaluate("""() => { const el = document.activeElement; if (!el || el === document.body) return null;
        const cs = getComputedStyle(el); return {tag: el.tagName, cls: el.className, outline: cs.outlineStyle, shadow: cs.boxShadow, vis: el.matches(':focus-visible')}; }""")
    res.check(s, "Tab reaches a control that shows a focus ring", bool(ring) and (ring["outline"] != "none" or ring["shadow"] != "none"), json.dumps(ring))
    no_errors(res, s, page)
    dash.close(page)


# ---------------------------------------------------------------- velocity modes, surges, gaps

def series_slice(a: Archive, key: str, rng: str) -> list:
    lo, hi = a.window(rng)
    return a.s[key][lo:hi + 1]


def close_lists(got, want, tol=1e-6) -> bool:
    return len(got) == len(want) and all((x is None and y is None) or (x is not None and y is not None and abs(x - y) <= tol) for x, y in zip(got, want))


def cmd_modes(args, res: Results, dash: Dashboard):
    s = "modes"
    print("== modes")
    a = dash.arch
    page = dash.new_page()
    dash.open(page)

    def velocity():
        c = dash.charts(page, True)["velocity"]
        return c, next(d for d in c["datasets"] if d["type"] == "bar")

    c, bar = velocity()
    res.check(s, "default velocity mode is MAU HEALTH", page.locator('.vel-mode-btn[data-mode="mau"]').get_attribute("aria-pressed") == "true"
              and "MAU health" in norm(page.locator("#velocity-chart-heading").text_content()))
    res.check(s, "MAU HEALTH bars equal the day-over-day change of active users (flagged = gap)", close_lists(bar["data"], series_slice(a, "net_active", DEFAULT_RANGE)),
              f"{bar['nonNull']} non-null points")
    res.check(s, "velocity panel is always linear (tag LIN)", c["yType"] == "linear" and norm(page.locator("#section-velocity-chart .scale-tag").text_content()) == "LIN")
    page.locator('.vel-mode-btn[data-mode="signups"]').click()
    c, bar = velocity()
    res.check(s, "SIGNUPS bars equal the day-over-day change of total users", close_lists(bar["data"], series_slice(a, "net_total", DEFAULT_RANGE)))
    res.check(s, "SIGNUPS: heading, label, hash vm=signups", "Net signups" in norm(page.locator("#velocity-chart-heading").text_content()) and bar["label"] == "Net signups"
              and dash.hash_state(page).get("vm") == "signups")
    page.locator('.vel-mode-btn[data-mode="pct"]').click()
    c, bar = velocity()
    res.check(s, "GROWTH % of the metric picked last (signups): percent of previous day", close_lists(bar["data"], series_slice(a, "growth_signups", DEFAULT_RANGE), 1e-9)
              and bar["label"] == "Signup growth", bar["label"])
    h = dash.hash_state(page)
    res.check(s, "GROWTH %: hash vm=pct&vb=signups", h.get("vm") == "pct" and h.get("vb") == "signups", page.evaluate("() => location.hash"))
    page.locator('.vel-mode-btn[data-mode="mau"]').click()
    page.locator('.vel-mode-btn[data-mode="pct"]').click()
    c, bar = velocity()
    res.check(s, "GROWTH % after MAU HEALTH: percent growth of MAU", close_lists(bar["data"], series_slice(a, "growth_mau", DEFAULT_RANGE), 1e-9) and bar["label"] == "MAU growth")
    dash.shot(page, "modes-growth-pct")
    page.locator('.vel-mode-btn[data-mode="mau"]').click()

    # SRV panel
    page.locator('.srv-mode-btn[data-mode="users_per_server"]').click()
    srv = dash.charts(page, True)["srv"]
    raw = next(d for d in srv["datasets"] if d["role"] == "raw")
    res.check(s, "SRV USERS/SERVER equals total users / servers", close_lists(raw["data"], series_slice(a, "users_per_server", DEFAULT_RANGE), 1e-6)
              and dash.hash_state(page).get("sm") == "ups", f"{raw['nonNull']} points")
    page.locator('.srv-mode-btn[data-mode="servers"]').click()
    srv = dash.charts(page, True)["srv"]
    raw = next(d for d in srv["datasets"] if d["role"] == "raw")
    res.check(s, "SRV SERVERS equals the archive's server_count (blank days are gaps)", close_lists(raw["data"], series_slice(a, "servers", DEFAULT_RANGE)))
    dots = [d for d in srv["datasets"] if d["metaKey"] == "fedi_instances"]
    res.check(s, "SRV shows FediDB's server count as a separate dotted series when present", bool(dots) == any(v is not None for v in series_slice(a, "fedi_instances", DEFAULT_RANGE)))
    # RAT panel
    for mode, key, hashv in (("engagement", "engagement", None), ("posts_per_mau", "posts_per_mau", "pm"), ("users_per_server", "users_per_server", "us")):
        page.locator(f'.rat-mode-btn[data-mode="{mode}"]').click()
        rat = dash.charts(page, True)["rat"]
        raw = next(d for d in rat["datasets"] if d["role"] == "raw")
        want = series_slice(a, key, DEFAULT_RANGE)
        res.check(s, f"RAT {mode}: values equal the independent ratio", close_lists(raw["data"], want, 1e-6), f"{raw['nonNull']} usable points")
        empty = page.locator("#section-rat-chart .chart-empty")
        should_be_empty = sum(1 for v in want if v is not None) < 2
        res.check(s, f"RAT {mode}: Collecting note shown exactly when fewer than 2 usable points", empty.is_visible() == should_be_empty,
                  norm(empty.text_content()) if empty.count() else "")
        if hashv:
            res.check(s, f"RAT {mode}: hash rm={hashv}", dash.hash_state(page).get("rm") == hashv)
    no_errors(res, s, page)
    dash.close(page)


def expected_surge_chip(a: Archive, sid: str) -> str | None:
    lo, hi, artifact = SURGES[sid]
    if artifact:
        return "FLAGGED"
    start, end = a.bounds(sid)
    i0, i1 = a.idx(start), a.idx(end)
    tot = a.s["total"]
    if any("total" in a.flags[i] for i in range(i0, i1 + 1)):
        return None  # flagged steps inside: the page's step-exclusion rule is not re-derived here
    base = next((j for d in range(0, 8) for j in (i0 - d, i0 + d) if 0 <= j < a.n and tot[j] is not None), None)
    last = next((j for j in range(i1, i0, -1) if tot[j] is not None), None)
    return fmt_signed(tot[last] - tot[base]) if base is not None and last is not None and last > base else "—"


def cmd_surges(args, res: Results, dash: Dashboard):
    s = "surges"
    print("== surges")
    a = dash.arch
    page = dash.new_page()
    dash.open(page)
    chips = page.evaluate("""() => [...document.querySelectorAll('.surge-chip')].map(c => ({id: c.dataset.surge, val: c.querySelector('.chip-val').textContent.trim(),
        title: c.title, artifact: c.classList.contains('artifact'), pressed: c.getAttribute('aria-pressed')}))""")
    res.check(s, "four surge chips", [c["id"] for c in chips] == list(SURGES), str([c["id"] for c in chips]))
    for c in chips:
        want = expected_surge_chip(a, c["id"])
        if want is None:
            res.warn(s, f"{c['id']}: chip value not re-derived (flagged days inside the window)", c["val"])
        else:
            res.check(s, f"{c['id']}: chip shows {want}", c["val"] == want, c["val"])
        res.check(s, f"{c['id']}: flagged windows are marked artifact and say so in their title", c["artifact"] == SURGES[c["id"]][2]
                  and (not c["artifact"] or "flagged" in c["title"].lower()), c["title"][:120])
    reset = page.locator("#reset-surge-btn")
    res.check(s, "RESET hidden before a window is picked", not reset.is_visible())

    for sid in ("SURGE_NOV_2022", "SURGE_FEB_2024"):
        start, end = a.bounds(sid)
        n = days_between(start, end) + 1
        page.locator(f'.surge-chip[data-surge="{sid}"]').click()
        page.wait_for_function("(r) => window.MastodonTerminal.app.state.range === r", arg=sid, timeout=5000)
        charts = dash.charts(page)
        res.check(s, f"{sid}: chip pressed, only it", page.evaluate("() => [...document.querySelectorAll('.surge-chip[aria-pressed=true]')].map(c => c.dataset.surge)") == [sid])
        res.check(s, f"{sid}: every chart zooms to {start} → {end}", all(window_of(c) == (start, end, n) for c in charts.values()),
                  str({k: window_of(c) for k, c in charts.items() if window_of(c) != (start, end, n)}))
        res.check(s, f"{sid}: hash r={sid}", dash.hash_state(page).get("r") == sid)
        res.check(s, f"{sid}: VIEWING label is the window label", "Crawler Step" in norm(page.locator("#selected-range-label").text_content()) or "Wave" in norm(page.locator("#selected-range-label").text_content()),
                  norm(page.locator("#selected-range-label").text_content()))
        res.check(s, f"{sid}: velocity switches to SIGNUPS (what the window is about)", dash.state(page)["vm"] == "signups")
        res.check(s, f"{sid}: no range button is pressed", page.evaluate("() => document.querySelectorAll('.time-btn[aria-pressed=true]').length") == 0)
        res.check(s, f"{sid}: RESET is shown", reset.is_visible())
        res.check(s, f"{sid}: subtitle explains the window", len(norm(page.locator("#velocity-chart-subtitle").text_content())) > 60)
        dash.shot(page, f"surge-{sid.lower().replace('surge_', '')}")
        reset.click()
        page.wait_for_function("() => window.MastodonTerminal.app.state.range === '1Y'", timeout=5000)
        st = dash.state(page)
        res.check(s, f"{sid}: RESET returns to 1Y and the earlier velocity mode", st["range"] == "1Y" and st["vm"] == "mau" and not reset.is_visible(), str(st))

    # toggling a chip twice, picking another range, switching windows
    chip = page.locator('.surge-chip[data-surge="SURGE_JUL_2023"]')
    chip.click()
    chip.click()
    page.wait_for_function("() => window.MastodonTerminal.app.state.range === '1Y'", timeout=5000)
    res.check(s, "clicking the active chip again leaves the window", dash.state(page)["range"] == "1Y")
    page.locator('.time-btn[data-range="6M"]').click()
    chip.click()
    page.locator('.surge-chip[data-surge="SURGE_SEP_2024"]').click()
    page.wait_for_function("() => window.MastodonTerminal.app.state.range === 'SURGE_SEP_2024'", timeout=5000)
    page.locator('.time-btn[data-range="2Y"]').click()
    st = dash.state(page)
    res.check(s, "a range button leaves the window and restores the velocity mode", st["range"] == "2Y" and st["vm"] == "mau", str(st))
    no_errors(res, s, page)
    dash.close(page)


def cmd_gaps(args, res: Results, dash: Dashboard):
    s = "gaps"
    print("== gaps")
    a = dash.arch
    flagged_total = [i for i in range(a.n) if "total" in a.flags[i] and not a.missing[i]]
    flagged_active = [i for i in range(a.n) if "active" in a.flags[i] and not a.missing[i]]
    missing = [i for i in range(a.n) if a.missing[i]]
    res.check(s, "archive has flagged days to test with", bool(flagged_total or flagged_active), f"{len(flagged_total)} total, {len(flagged_active)} active, {len(missing)} missing days")
    page = dash.new_page()
    dash.open(page, "r=ALL&ma=1&log=0&cmp=0")
    charts = dash.charts(page, True)

    def raw(key, meta=None):
        return next(d for d in charts[key]["datasets"] if d["role"] == "raw" and (meta is None or d["metaKey"] == meta))

    n = a.n
    for key, meta, skey in (("mau", "active", "active"), ("tot", "total", "total"), ("srv", "servers", "servers")):
        data = raw(key, meta)["data"]
        want = a.s[skey]
        wrong = [a.dates[i] for i in range(n) if (data[i] is None) != (want[i] is None)]
        res.check(s, f"{key}: gap exactly where the archive has no usable {skey} (flagged or no row)", not wrong and len(data) == n,
                  f"mismatch at {wrong[:5]} ({len(wrong)})")
    vel = raw("velocity")["data"]
    want = a.s["net_active"]
    wrong = [a.dates[i] for i in range(n) if (vel[i] is None) != (want[i] is None)]
    res.check(s, "velocity: no bar on a flagged day, nor on the day after it (the change needs both)", not wrong, f"mismatch at {wrong[:5]}")
    for key in flagged_active[:3]:
        res.check(s, f"velocity: no bar on flagged day {a.dates[key]} or the day after", vel[key] is None and (key + 1 >= n or vel[key + 1] is None))
    res.check(s, "flagged values never enter the 7D average (MAU MA equals the independent MA)",
              close_lists(next(d for d in charts["mau"]["datasets"] if d["role"] == "ma")["data"], a.ma("active")), "")
    res.check(s, "the tallest MAU bar is the archive's largest usable day", max(v for v in vel if v is not None) == max(v for v in want if v is not None))

    # the legend and the shaded band
    res.check(s, "legend explains FLAGGED (gap)", "FLAGGED" in page.locator("#section-mau-chart .legend-row").text_content())
    sid = "SURGE_FEB_2024"
    page.locator(f'.surge-chip[data-surge="{sid}"]').click()
    page.wait_for_function("(r) => window.MastodonTerminal.app.state.range === r", arg=sid, timeout=5000)
    start, end = a.bounds(sid)
    i0, i1 = a.idx(start), a.idx(end)
    day_flagged = [i - i0 for i in range(i0, i1 + 1) if "total" in a.flags[i] and not a.missing[i]]
    res.check(s, f"{sid}: window contains flagged days", bool(day_flagged), f"{len(day_flagged)} flagged days")
    band = page.evaluate("""(idxs) => {
        const ch = window.MastodonTerminal.app.charts.velocity;
        const cv = ch.canvas, ctx = cv.getContext('2d'), r = cv.width / cv.clientWidth;
        const area = ch.chartArea, x = ch.scales.x;
        const column = (i) => { const px = Math.round(x.getPixelForValue(i) * r); const vals = [];
          for (let y = Math.round((area.top + 6) * r); y < Math.round((area.bottom - 6) * r); y += 7) { const d = ctx.getImageData(px, y, 1, 1).data; vals.push(d[0] - d[2]); }
          return vals.sort((a, b) => a - b)[Math.floor(vals.length / 2)]; };
        return idxs.map(i => column(i));
    }""", day_flagged[:4])
    # the canvas is transparent where nothing is drawn (r-b = 0); the band is #F83F55 at low alpha (r-b about +163)
    res.check(s, "flagged days are painted with the red gap band on the velocity chart", all(v > 100 for v in band), f"median (r-b) per column {band}; an undrawn pixel is 0")
    dash.shot(page, "gaps-feb-2024")
    rows = page.evaluate(TABLE_JS)
    flagged_cells = sum(f for r in rows for f in r["flagged"])
    want_cells = 0
    for i in range(max(i0, i1 - 29), i1 + 1):
        for key, flag in (("total", "total"), ("net_total", "total"), ("active", "active"), ("net_active", "active"), ("servers", "servers"), ("posts", "statuses")):
            if a.s[key][i] is None and not a.missing[i] and flag in a.flags[i]:
                want_cells += 1
    res.check(s, "data table prints 'flagged' for exactly those cells", flagged_cells == want_cells and all(c == "flagged" for r in rows for c, f in zip(r["cells"], r["flagged"]) if f),
              f"{flagged_cells} vs {want_cells}")
    no_errors(res, s, page)
    dash.close(page)


# ---------------------------------------------------------------- HUD, exports, table

def hud_title_day(text: str) -> str | None:
    m = re.search(r"[A-Z]{3} ([A-Z][a-z]{2}) (\d{1,2}), (\d{4})", text or "")
    return f"{m.group(3)}-{MONTHS.index(m.group(1)) + 1:02d}-{int(m.group(2)):02d}" if m else None


def cmd_hud(args, res: Results, dash: Dashboard):
    s = "hud"
    print("== hud")
    a = dash.arch
    page = dash.new_page()
    dash.open(page)
    lo, hi = a.window(DEFAULT_RANGE)
    first, last = a.dates[lo], a.dates[hi]
    for key in ("mau", "velocity", "tot"):
        canvas = page.locator(f"#{CANVAS_IDS[key]}")
        canvas.scroll_into_view_if_needed()
        canvas.focus()
        hud = canvas.locator("xpath=..").locator(".hud")
        title = hud.locator(".hud-title")
        page.wait_for_function("(id) => { const h = document.getElementById(id).parentNode.querySelector('.hud'); return !!h && h.classList.contains('visible'); }",
                               arg=CANVAS_IDS[key], timeout=5000)
        res.check(s, f"{key}: focusing the chart shows the HUD on the newest day", hud_title_day(title.text_content()) == last, title.text_content())

        def day_after(press: str, want: str):
            page.keyboard.press(press)
            page.wait_for_function("([id, want]) => { const t = document.getElementById(id).parentNode.querySelector('.hud-title'); "
                                   "const m = t && /[A-Z]{3} ([A-Z][a-z]{2}) (\\d{1,2}), (\\d{4})/.exec(t.textContent); if (!m) return false; "
                                   "const mon = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].indexOf(m[1]) + 1; "
                                   "return `${m[3]}-${String(mon).padStart(2,'0')}-${String(m[2]).padStart(2,'0')}` === want; }",
                                   arg=[CANVAS_IDS[key], want], timeout=5000)
            return hud_title_day(title.text_content())

        res.check(s, f"{key}: ArrowLeft steps back one day", day_after("ArrowLeft", day_add(last, -1)) == day_add(last, -1))
        res.check(s, f"{key}: ArrowRight steps forward", day_after("ArrowRight", last) == last)
        res.check(s, f"{key}: Home jumps to the first day of the window", day_after("Home", first) == first)
        res.check(s, f"{key}: End jumps to the last day", day_after("End", last) == last)
        rows = hud.locator(".hud-row").count()
        res.check(s, f"{key}: HUD lists the day's value", rows >= 1 and bool(re.search(r"\d", hud.text_content() or "")), f"{rows} rows: {norm(hud.text_content())[:140]}")
        if key == "mau":
            _, mau = a.last_valid("active")
            res.check(s, "mau: HUD value is the exact figure for the day", fmt_int(mau) in hud.text_content(), norm(hud.text_content())[:160])
        label = {"mau": "Monthly active users", "velocity": "MAU change", "tot": "Total users"}[key]
        page.wait_for_function("(want) => document.querySelector('#chart-live').textContent.startsWith(want)", arg=f"{fmt_day(last)}: {label}", timeout=3000)
        res.check(s, f"{key}: stepping is announced in the polite live region", True, norm(page.locator("#chart-live").text_content())[:120])
        if key == "mau":
            # walk back onto a flagged day (1Y window has some) and expect the warning
            flagged = [i for i in range(lo, hi + 1) if "active" in a.flags[i] and not a.missing[i]]
            if flagged:
                steps = hi - flagged[-1]
                for _ in range(steps):
                    page.keyboard.press("ArrowLeft")
                page.wait_for_function("([id, want]) => { const h = document.getElementById(id).parentNode.querySelector('.hud'); "
                                       "return h && /FLAGGED/.test(h.textContent); }", arg=[CANVAS_IDS[key], 0], timeout=5000)
                res.check(s, f"mau: stepping onto flagged day {a.dates[flagged[-1]]} says FLAGGED and shows a gap", "FLAGGED" in hud.text_content() and "gap" in hud.text_content(),
                          norm(hud.text_content())[:200])
        canvas.evaluate("el => el.blur()")
    # pointer HUD
    page.locator("#mauChart").scroll_into_view_if_needed()
    box = page.locator("#mauChart").bounding_box()
    page.mouse.move(box["x"] + box["width"] * 0.9, box["y"] + box["height"] * 0.5)
    page.wait_for_function("() => { const h = document.getElementById('mauChart').parentNode.querySelector('.hud'); return h && h.classList.contains('visible'); }", timeout=5000)
    res.check(s, "hovering the chart shows the HUD with a dated title", bool(hud_title_day(page.locator("#mauChart").locator("xpath=..").locator(".hud-title").text_content())))
    dash.shot(page, "hud-mau")
    # zoom and reset
    page.evaluate("() => { const c = window.MastodonTerminal.app.charts.velocity; c.zoomScale('x', {min: 100, max: 160}, 'none'); }")
    page.wait_for_function("() => window.MastodonTerminal.app.charts.velocity.isZoomedOrPanned()", timeout=3000)
    zc = dash.charts(page)["velocity"]
    res.check(s, "zoom narrows the x range", zc["zoomed"] and round(zc["xMax"] - zc["xMin"]) == 60, f"{zc['xMin']}..{zc['xMax']}")
    page.locator('.reset-zoom-btn[data-chart="velocity"]').click()
    page.wait_for_function("() => !window.MastodonTerminal.app.charts.velocity.isZoomedOrPanned()", timeout=3000)
    res.check(s, "the zoom button resets it", not dash.charts(page)["velocity"]["zoomed"])
    no_errors(res, s, page)
    dash.close(page)


def cmd_exports(args, res: Results, dash: Dashboard):
    s = "exports"
    print("== exports")
    a = dash.arch
    page = dash.new_page()
    dash.open(page)
    lo, hi = a.window(DEFAULT_RANGE)
    first, last = a.dates[lo], a.dates[hi]
    n = hi - lo + 1
    for key in CHART_KEYS:
        name, header = CHART_CSV[key]
        btn = page.locator(f'.export-csv-btn[data-chart="{key}"]')
        if not res.check(s, f"{key}: CSV button exists", btn.count() == 1):
            continue
        with page.expect_download() as dl:
            btn.click()
        d = dl.value
        text = Path(d.path()).read_text(encoding="utf-8")
        rows = list(csv.reader(io.StringIO(text)))
        body = [r for r in rows[1:] if r]
        res.check(s, f"{key}: file name mastodon-{name}-{first}_{last}.csv", d.suggested_filename == f"mastodon-{name}-{first}_{last}.csv", d.suggested_filename)
        res.check(s, f"{key}: header {','.join(header)}", rows[0] == header, ",".join(rows[0]))
        dates = [r[0] for r in body]
        res.check(s, f"{key}: {n} rows, daily, {first} → {last}", dates == a.dates[lo:hi + 1], f"{len(body)} rows {dates[:1]}…{dates[-1:]}")
        if key in ("tot", "mau"):
            col = {"tot": ("total", "total"), "mau": ("active", "active")}[key][0]
            want = a.s[col][lo:hi + 1]
            got = [int(r[header.index(col)]) if r[header.index(col)] != "" else None for r in body]
            res.check(s, f"{key}: {col} column equals the archive, flagged and missing days blank", got == want, "")
            fl = [r[-1] for r in body]
            want_fl = ["|".join(sorted(a.flags[i])) if not a.missing[i] else "" for i in range(lo, hi + 1)]
            res.check(s, f"{key}: flags column lists the flagged metrics", [("|".join(sorted(f.split("|"))) if f else "") for f in fl] == want_fl)

    # a zoomed export covers only the visible window
    page.evaluate("() => window.MastodonTerminal.app.charts.mau.zoomScale('x', {min: 40, max: 99}, 'none')")
    page.wait_for_function("() => window.MastodonTerminal.app.charts.mau.isZoomedOrPanned()", timeout=3000)
    with page.expect_download() as dl:
        page.locator('.export-csv-btn[data-chart="mau"]').click()
    body = [r for r in csv.reader(io.StringIO(Path(dl.value.path()).read_text(encoding="utf-8")))][1:]
    res.check(s, "export covers the visible (zoomed) window", [r[0] for r in body] == a.dates[lo + 40:lo + 100], f"{len(body)} rows {body[0][0] if body else ''}")
    page.locator('.reset-zoom-btn[data-chart="mau"]').click()

    # Chrome throttles several downloads from one page when the later ones start outside a click handler (the PNG is
    # made asynchronously), so each PNG gets its own page, as a visitor would have after a reload.
    for key in CHART_KEYS:
        name, _ = CHART_CSV[key]
        shot_page = dash.new_page()
        dash.open(shot_page)
        btn = shot_page.locator(f'.export-png-btn[data-chart="{key}"]')
        if not res.check(s, f"{key}: PNG button exists", btn.count() == 1):
            dash.close(shot_page)
            continue
        with shot_page.expect_download(timeout=15000) as dl:
            btn.click()
        d = dl.value
        raw = Path(d.path()).read_bytes()
        px = shot_page.evaluate(PNG_PIXELS_JS, base64.b64encode(raw).decode())
        res.check(s, f"{key}: PNG signature and name", raw[:8] == b"\x89PNG\r\n\x1a\n" and d.suggested_filename == f"mastodon-{name}-{first}_{last}.png", d.suggested_filename)
        res.check(s, f"{key}: PNG is opaque on a dark background with the accent bar", all(c[3] == 255 for c in px["corners"] + [px["bg"], px["bar"]])
                  and sum(px["bg"][:3]) < 200 and px["bar"][0] > 150 and px["w"] > 300, json.dumps(px)[:240])
        dash.close(shot_page)
    page.evaluate("() => window.scrollTo(0, 0)")
    # the full-dataset CSV link
    links = page.locator('a[href="data/mastodon-daily.csv"]')
    res.check(s, "page links data/mastodon-daily.csv (table panel and footer)", links.count() >= 2, f"{links.count()} link(s)")
    if links.count():
        href = urllib.parse.urljoin(page.url, links.first.get_attribute("href"))
        r = page.request.get(href)
        lines = r.text().splitlines() if r.ok else []
        res.check(s, "full CSV is served with the documented header", r.ok and lines[:1] == [CSV_HEADER], f"HTTP {r.status} {lines[:1]}")
        csv_dates = [l.split(",")[0] for l in lines[1:] if l]
        res.check(s, "full CSV has one row per archive day, same dates as historicalData.js", csv_dates == [r_["date"] for r_ in sorted(dash.rows, key=lambda x: x["date"])],
                  f"{len(csv_dates)} rows vs {a.row_count}")
        res.check(s, "FULL CSV button downloads it (download attribute)", page.locator('#section-table a.tool-btn[download]').count() == 1)
    no_errors(res, s, page)
    dash.close(page)


def cmd_table(args, res: Results, dash: Dashboard):
    s = "table"
    print("== table")
    a = dash.arch
    page = dash.new_page()
    dash.open(page)
    heads = [norm(t) for t in page.locator("#section-table thead th").all_text_contents()]
    res.check(s, "table columns", heads == ["Date", "Total users", "Net", "MAU", "MAU Δ", "Servers", "Posts/day"], str(heads))

    def expected_rows(rng: str):
        lo, hi = a.window(rng)
        out = []
        for i in range(hi, max(lo, hi - 29) - 1, -1):
            row = []
            for key, flag, signed in (("total", "total", False), ("net_total", "total", True), ("active", "active", False),
                                      ("net_active", "active", True), ("servers", "servers", False), ("posts", "statuses", False)):
                v = a.s[key][i]
                if v is not None:
                    row.append(fmt_signed(v, False) if signed else fmt_int(v))
                elif not a.missing[i] and flag in a.flags[i]:
                    row.append("flagged")
                else:
                    row.append("—")
            out.append((fmt_day(a.dates[i]), row))
        return out

    for rng in ("1Y", "1W", "ALL", "SURGE_FEB_2024"):
        if rng == "SURGE_FEB_2024":
            page.locator('.surge-chip[data-surge="SURGE_FEB_2024"]').click()
            page.wait_for_function("() => window.MastodonTerminal.app.state.range === 'SURGE_FEB_2024'", timeout=5000)
        else:
            click_range(page, rng)
        rows = page.evaluate(TABLE_JS)
        want = expected_rows(rng)
        got = [(r["head"], r["cells"]) for r in rows]
        res.check(s, f"{rng}: {len(want)} rows, newest first, every cell equals the archive", got == want,
                  f"{len(got)} rows; first diff {next(((g, w) for g, w in zip(got, want) if g != w), None)}")
        lo, hi = a.window(rng)
        label = norm(page.locator("#table-range-label").text_content())
        res.check(s, f"{rng}: range label", label == f"{fmt_day(a.dates[max(lo, hi - 29)])} → {fmt_day(a.dates[hi])}", label)
    res.check(s, "column headers are scoped and rows have row headers", page.locator("#section-table th[scope=col]").count() == 7
              and page.locator("#data-table-body th[scope=row]").count() > 0)
    no_errors(res, s, page)
    dash.close(page)


# ---------------------------------------------------------------- social panels

def eligible_account(key: str, acc: dict, min_followers: int) -> bool:
    if not isinstance(acc, dict) or not re.fullmatch(r"[a-z0-9_]+(?:[a-z0-9_.-]*[a-z0-9_])?@[a-z0-9.-]+\.[a-z]+", key):
        return False
    f = acc.get("followers")
    if not isinstance(f, (int, float)) or f < max(10000, min_followers):
        return False
    if any(acc.get(k) is True for k in ("bot", "locked", "group", "noindex", "suspended", "limited", "memorial")) or acc.get("indexable") is False:
        return False
    if "discoverable" in acc and acc["discoverable"] is not True:
        return False
    return acc.get("moved") in (None, False)


def account_board(social: dict, bkey: str, sign: str | None, asc: bool) -> list[tuple[str, float]]:
    out, seen = [], set()
    accounts = social.get("accounts") or {}
    minf = (social.get("guardrails") or {}).get("min_followers") or 0
    for r in (social.get("boards") or {}).get(bkey, []) or []:
        key = str(r.get("acct", "")).lower()
        v = r.get("value")
        if key in seen or key not in accounts or not isinstance(v, (int, float)):
            continue
        if sign == "pos" and not v > 0 or sign == "neg" and not v < 0 or sign is None and v < 0:
            continue
        if not eligible_account(key, accounts[key], minf):
            continue
        seen.add(key)
        out.append((key, v))
    out.sort(key=lambda t: ((t[1] if asc else -t[1]), t[0]))
    return out[:25]


def server_board(servers: dict, bkey: str, sign: str | None, asc: bool) -> list[tuple[str, float]]:
    out, seen = [], set()
    host = re.compile(r"^(?=.{3,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z](?:[a-z0-9-]{0,61}[a-z0-9])?$", re.I)
    for r in (servers.get("boards") or {}).get(bkey, []) or []:
        d = str(r.get("domain", "")).strip().lower()
        v = r.get("value")
        if not host.match(d) or d in seen or not isinstance(v, (int, float)):
            continue
        if sign == "pos" and not v > 0 or sign == "neg" and not v < 0 or sign is None and v < 0:
            continue
        seen.add(d)
        out.append((d, v))
    out.sort(key=lambda t: ((t[1] if asc else -t[1]), t[0]))
    return out[:25]


SOC_BOARDS = {
    "servers": [("largest", None, None, False), ("active", None, None, False), ("gainers", ["24h", "7d"], "pos", False), ("losers", ["24h", "7d"], "neg", True)],
    "accounts": [("followed", None, None, False), ("gainers", ["24h", "7d"], "pos", False), ("losers", ["24h", "7d"], "neg", True), ("active", ["24h", "7d"], "pos", False)],
}


def pick(page, mode: str | None = None, board: str | None = None, win: str | None = None):
    if mode:
        page.locator(f'#soc-ldr-mode button[data-val="{mode}"]').click()
    if board:
        page.locator(f'#soc-ldr-board button[data-val="{board}"]').click()
    if win:
        page.locator(f'#soc-ldr-win button[data-val="{win}"]').click()


def allowlisted_avatar(url: str | None, hosts: list[str]) -> bool:
    try:
        u = urllib.parse.urlsplit(url or "")
    except ValueError:
        return False
    return u.scheme == "https" and not u.username and not u.password and u.port is None and (u.hostname or "") in hosts


def cmd_social(args, res: Results, dash: Dashboard):
    s = "social"
    print("== social")
    hosts = dash.avatar_hosts
    servers, social = dash.servers_data, dash.social_data
    mf = ((social or {}).get("guardrails") or {}).get("min_followers") or 0

    # ---- the real data files (or the Collecting state when they do not exist)
    page = dash.new_page(feed="stale")
    dash.open(page)
    res.check(s, "LDR, PST and DEC mount points are filled", all(page.locator(f"#section-{x} .soc-root, #section-{x} .panel-bar").count() >= 1 for x in ("ldr", "pst", "dec")))
    res.check(s, "panel headers use the function-key style", [norm(t) for t in page.locator("#section-ldr .fn-code, #section-pst .fn-code, #section-dec .fn-code").all_text_contents()] == ["LDR", "PST", "DEC"])
    res.check(s, "mode pills are SERVERS and ACCOUNTS", [norm(t) for t in page.locator("#soc-ldr-mode button").all_text_contents()] == ["SERVERS", "ACCOUNTS"])
    seen_imgs: list[str] = []
    for mode in ("servers", "accounts"):
        data = servers if mode == "servers" else social
        pick(page, mode=mode)
        for bid, wins, sign, asc in SOC_BOARDS[mode]:
            for win in (wins or [None]):
                pick(page, board=bid, win=win)
                label = f"{mode}/{bid}" + (f"/{win}" if win else "")
                bkey = f"{bid}_{win}" if win else bid
                want = (server_board if mode == "servers" else account_board)(data, bkey, sign, asc) if data else []
                rows = page.evaluate(LDR_ROWS_JS)
                if mode == "servers":
                    got = [r["name"] for r in rows]
                    want_ids = [d for d, _ in want]
                else:
                    got = [r["handle"].lstrip("@") for r in rows]
                    want_ids = [k for k, _ in want]
                res.check(s, f"{label}: rows are the eligible board entries in rank order", got == want_ids, f"got {got[:3]}… want {want_ids[:3]}…")
                res.check(s, f"{label}: ranks 1..n, at most 25", [r["rank"] for r in rows] == [str(i + 1) for i in range(len(rows))] and len(rows) <= 25)
                empty = page.locator("#soc-ldr-empty")
                if want:
                    res.check(s, f"{label}: table visible, no Collecting line", page.locator("#soc-ldr-wrap").is_visible() and not empty.is_visible())
                else:
                    res.check(s, f"{label}: empty board shows the Collecting state", empty.is_visible() and norm(empty.text_content()).startswith(EMPTY_TEXT)
                              and not page.locator("#soc-ldr-wrap").is_visible(), norm(empty.text_content()))
                res.check(s, f"{label}: exactly one mode and one board pill pressed", page.locator("#soc-ldr-mode button[aria-pressed=true]").count() == 1
                          and page.locator("#soc-ldr-board button[aria-pressed=true]").count() == 1)
                res.check(s, f"{label}: window pill only on boards with windows", page.locator("#soc-ldr-win").is_visible() == bool(wins))
                heads = page.evaluate(HEADS_JS)
                fcol = next((i for i, h in enumerate(heads) if h == "followers"), None)

                def followers_of(r):
                    """The follower count a row shows: its FOLLOWERS column (most-followed board: the metric column)."""
                    if fcol is not None and fcol < len(r["all"]):
                        return parse_int(r["all"][fcol]) if re.search(r"\d", r["all"][fcol]) else None
                    m = re.search(r"([\d,]+) followers", r["meta"])
                    return int(m.group(1).replace(",", "")) if m else None

                if mode == "accounts":
                    for r, (key, value) in zip(rows, want):
                        acc = data["accounts"][key]
                        fol = followers_of(r)
                        if not (fol is not None and fol >= 10000 and fol == acc["followers"] >= max(10000, mf)):
                            res.check(s, f"{label}: {key} shows its real follower count, at least 10,000", False, f"{fol} vs {acc['followers']} (columns {heads})")
                        if r["img"]:
                            seen_imgs.append(r["img"]["src"])
                            if r["img"]["src"] != acc.get("avatar") or not allowlisted_avatar(r["img"]["src"], hosts):
                                res.check(s, f"{label}: {key} avatar is an allow-listed https host", False, r["img"]["src"])
                        elif allowlisted_avatar(acc.get("avatar"), hosts):
                            res.check(s, f"{label}: {key} has its allow-listed avatar", False, "no img rendered")
                if mode == "accounts" and rows:
                    folls = [followers_of(r) for r in rows]
                    res.check(s, f"{label}: every shown account has >= 10,000 followers, avatars only from allow-listed hosts",
                              all(f is not None and f >= 10000 for f in folls) and all(allowlisted_avatar(r["img"]["src"], hosts) for r in rows if r["img"]),
                              str(folls[:5]))
                    res.check(s, f"{label}: profile links are https, new tab, noopener", all(re.fullmatch(r"https://[^/]+/@[^/]+", r["href"] or "") and r["target"] == "_blank"
                              and "noopener" in (r["rel"] or "") for r in rows))
                    if bid == "followed":
                        vals = [int(r["metric"].replace(",", "")) for r in rows]
                        res.check(s, f"{label}: ranked by followers, descending, values equal the data", vals == [int(v) for _, v in want] and vals == sorted(vals, reverse=True))
                if mode == "servers" and rows:
                    res.check(s, f"{label}: server links go to the host over https", all(r["href"] == f"https://{r['name']}" and r["target"] == "_blank" for r in rows))
                    if bid == "largest":
                        vals = [int(r["metric"].replace(",", "")) for r in rows]
                        res.check(s, f"{label}: ranked by users, descending, values equal the data", vals == [int(v) for _, v in want])
    # every <img> anywhere in the social panels comes from an allow-listed host
    all_imgs = page.evaluate("() => [...document.querySelectorAll('#section-ldr img, #section-pst img, #section-dec img')].map(i => i.getAttribute('src'))")
    res.check(s, "no social image loads from a non-allow-listed host", all(allowlisted_avatar(u, hosts) for u in all_imgs), str([u for u in all_imgs if not allowlisted_avatar(u, hosts)][:3]))
    res.check(s, "page's AVATAR_HOSTS equals lib/social.js AVATAR_HOSTS", page_avatar_hosts_match(dash, hosts))
    pick(page, mode="accounts", board="followed")
    guard = norm(page.locator("#soc-ldr-guard").text_content())
    res.check(s, "guardrail statement names the 10,000 follower rule", "10,000" in guard, guard[:160])
    notes = norm(page.locator("#soc-ldr-notes").text_content())
    res.check(s, "coverage note says the list is not exhaustive", (not social) or "not exhaustive" in notes.lower(), notes[:160])
    tag = norm(page.locator("#soc-ldr-asof").text_content())
    res.check(s, "as-of tag shows a date (or NO DATA when the file is absent)", bool(re.fullmatch(r"(AS OF|DAY) \d{4}-\d{2}-\d{2}", tag)) if social else tag == "NO DATA", tag)
    dash.shot_el(page, "#section-ldr", "social-ldr-accounts")
    pick(page, mode="servers", board="largest")
    dash.shot_el(page, "#section-ldr", "social-ldr-servers")

    # PST
    posts = page.evaluate(POSTS_JS)
    want_posts = expected_posts(social)
    if social and want_posts:
        res.check(s, f"PST shows {min(10, len(want_posts))} posts, the eligible ones in favourites order", [p["hrefs"][1] for p in posts] == [w["url"] for w in want_posts],
                  f"{len(posts)} shown vs {len(want_posts)}")
        res.check(s, "PST posts are by accounts with >= 10,000 followers", all(w["followers"] >= 10000 for w in want_posts))
        favs = [parse_compact(p["fav"]) for p in posts]
        res.check(s, "PST ordered by favourites", all(x is not None for x in favs) and favs == sorted(favs, reverse=True), str(favs))
        res.check(s, "PST cards: post link, favourites, boosts, replies, noopener", all(re.fullmatch(r"https://[^/]+/@[^/]+/\d+", p["hrefs"][1] or "") and "favourites" in p["stats"] and "boosts" in p["stats"]
                  and "replies" in p["stats"] and all("noopener" in (r or "") for r in p["rels"]) for p in posts))
        res.check(s, "PST text is at most 280 characters", all(len(p["text"]) <= 281 for p in posts))
        dash.shot_el(page, "#section-pst", "social-pst")
    else:
        res.check(s, "PST shows the Collecting state when no eligible posts exist", page.locator("#soc-pst-empty").is_visible() and not posts)
    res.check(s, "PST subtitle says trending candidates, not every post", "not every post" in norm(page.locator("#soc-pst-subtitle").text_content()))

    # DEC
    dec = (servers or {}).get("decentralization") if servers else None
    if dec and dec.get("top1") is not None and dec["top1"] <= dec["top5"] <= dec["top10"]:
        big = norm(page.locator(".soc-dec-big").text_content())
        share = dec["top1"] * 100
        want_big = f"{share:.2f}%" if 0 < dec["top1"] < 0.01 else f"{float(js_fixed(share, 1)):.1f}%"
        res.check(s, f"DEC headline is the largest server's share ({want_big})", big == want_big, big)
        half = dec.get("servers_for_half")
        sub = norm(page.locator(".soc-dec-sub").text_content())
        res.check(s, "DEC says how many servers hold half of all users", (f"{half} servers hold half" in sub or f"{half} server holds half" in sub) if half else "More than" in sub, sub)
        segs = page.evaluate("() => [...document.querySelectorAll('.soc-dec-bar .soc-seg')].map(e => parseFloat(e.style.width))")
        res.check(s, "DEC bar segments add up to 100%", abs(sum(segs) - 100) < 0.05 and len(segs) == 4, str(segs))
        res.check(s, "DEC labels its base", "FediDB" in norm(page.locator(".soc-dec-foot").text_content()))
        dash.shot_el(page, "#section-dec", "social-dec")
    else:
        res.check(s, "DEC shows the Collecting state when there is no usable meter", page.locator("#soc-dec-empty").is_visible())
    no_errors(res, s, page)
    dash.close(page)

    # ---- hostile fixture: escaping and the guardrail re-check
    page = dash.new_page(feed="stale", social="hostile", servers="hostile")
    dash.open(page)
    fx = social_fixture(((social or {}).get("day") or (dash.now - timedelta(days=1)).strftime("%Y-%m-%d")))
    pick(page, mode="accounts", board="followed")
    rows = page.evaluate(LDR_ROWS_JS)
    named = [r["handle"].lstrip("@").split("@")[0] for r in rows]
    res.check(s, "hostile: only accounts that pass every rule are listed (no bot, locked, hidden, no-index, under 10,000)",
              named == fx["_expected_named"] or sorted(named) == sorted(fx["_expected_named"]), str(named))
    seen = norm(page.locator("#section-ldr").text_content())
    res.check(s, "hostile: a markup display name is shown as literal text", '<img src=x onerror="window.__pwned=1">Evil Name' in seen)
    res.check(s, "hostile: names of rejected accounts never appear", not any(w in seen for w in ("Small Fry", "Robot", "Locked", "Hidden", "No Index")))
    res.check(s, "hostile: bidi overrides, zero-width and control characters are stripped", "\u202e" not in seen and "\u200b" not in seen and "\x00" not in seen)
    res.check(s, "hostile: nothing executable is injected into the leaderboard", not page.evaluate(UNSAFE_DOM_JS, "#section-ldr"), str(page.evaluate(UNSAFE_DOM_JS, "#section-ldr")))
    by_name = {r["handle"].lstrip("@").split("@")[0]: r for r in rows}
    res.check(s, "hostile: non-allow-listed, credentialed and javascript: avatars become placeholders",
              all(by_name[u]["img"] is None and by_name[u]["blank"] for u in ("evil", "jsurl", "creds") if u in by_name)
              and by_name.get("good", {}).get("img", {}) and by_name["good"]["img"]["src"] == "https://files.mastodon.social/a.png")
    res.check(s, "hostile: a javascript: profile url is rebuilt as https://host/@user", by_name.get("jsurl", {}).get("href") == "https://mastodon.social/@jsurl", str(by_name.get("jsurl", {}).get("href")))
    res.check(s, "hostile: avatars are lazy, 24px, no-referrer, empty alt", all(r["img"]["loading"] == "lazy" and r["img"]["w"] == "24" and r["img"]["h"] == "24"
              and r["img"]["ref"] == "no-referrer" and r["img"]["alt"] == "" for r in rows if r["img"]))
    posts = page.evaluate(POSTS_JS)
    urls = [p["hrefs"][1] for p in posts]
    res.check(s, "hostile: posts by ineligible authors, other days, content warnings and foreign hosts are dropped",
              urls == ["https://mastodon.social/@good/111", "https://mastodon.social/@evil/112", "https://mastodon.social/@good/117"], str(urls))
    res.check(s, "hostile: post text is escaped, cut at 280 characters, empty text becomes [video]", all(len(p["text"]) <= 281 for p in posts)
              and any("<script>window.__pwned=1</script>" in p["text"] for p in posts) and any(p["text"] == "[video]" for p in posts)
              and not page.evaluate(UNSAFE_DOM_JS, "#section-pst"))
    pick(page, mode="servers", board="largest")
    srows = page.evaluate(LDR_ROWS_JS)
    names = [r["name"] for r in srows]
    res.check(s, "hostile: servers with invalid hostnames are dropped, valid ones linked over https", names == ["mastodon.social", "ok.example"]
              and all(r["href"] == f"https://{r['name']}" for r in srows), str(names))
    res.check(s, "hostile: servers panel injects nothing executable", not page.evaluate(UNSAFE_DOM_JS, "#section-ldr"))
    res.check(s, "hostile: inconsistent decentralization shares are not drawn", page.locator("#soc-dec-empty").is_visible() and "inconsistent" in norm(page.locator("#soc-dec-empty").text_content())
              and not page.locator("#soc-dec-body").is_visible(), norm(page.locator("#soc-dec-empty").text_content()))
    res.check(s, "hostile: injected script never ran", page.evaluate("() => window.__pwned === undefined"))
    res.check(s, "hostile: no request went to a non-allow-listed host", not page.external_hosts, str(sorted(page.external_hosts)))
    no_errors(res, s, page, "hostile: no console errors")
    dash.shot_el(page, "#section-ldr", "social-hostile")
    dash.close(page)

    # ---- missing, empty and brand-new data files
    for mode in ("missing", "empty", "fresh"):
        page = dash.new_page(feed="stale", social=mode, servers=mode)
        dash.open(page)
        errs = errors_of(page, ("social.js", "servers.js", "Failed to load resource"))
        res.check(s, f"{mode} data files: no page errors", not errs, " | ".join(errs)[:300])
        texts = [norm(page.locator(i).text_content()) for i in ("#soc-ldr-empty", "#soc-pst-empty", "#soc-dec-empty")]
        shown = all(page.locator(i).is_visible() for i in ("#soc-ldr-empty", "#soc-pst-empty", "#soc-dec-empty"))
        # a file that loads but defines nothing is reported as unreadable, the other two as Collecting
        allowed = (EMPTY_TEXT, "This data file could not be read.") if mode == "empty" else (EMPTY_TEXT,)
        res.check(s, f"{mode} data files: LDR, PST and DEC show an empty state in plain words", shown and all(t.startswith(allowed) for t in texts)
                  and not page.locator("#soc-ldr-wrap").is_visible() and not page.locator("#soc-pst-list").is_visible() and not page.locator("#soc-dec-body").is_visible(), str(texts))
        res.check(s, f"{mode} data files: the rest of the dashboard still works", len(dash.charts(page)) == 6 and norm(page.locator("#kpi-users-value").text_content()) not in ("", "—"))
        pick(page, mode="accounts", board="gainers", win="7d")
        res.check(s, f"{mode} data files: pills still switch", page.locator('#soc-ldr-board button[data-val="gainers"]').get_attribute("aria-pressed") == "true")
        if mode == "missing":
            dash.shot_el(page, "#section-ldr", "social-ldr-collecting")
        dash.close(page)

    # ---- keyboard: pills are real buttons
    page = dash.new_page(feed="stale")
    dash.open(page)
    btn = page.locator('#soc-ldr-mode button[data-val="accounts"]')
    btn.focus()
    res.check(s, "mode pills are buttons that take keyboard focus", btn.evaluate("el => el.tagName === 'BUTTON' && document.activeElement === el"))
    page.keyboard.press("Enter")
    res.check(s, "Enter on a pill switches the mode and keeps focus", btn.get_attribute("aria-pressed") == "true" and btn.evaluate("el => document.activeElement === el"))
    no_errors(res, s, page)
    dash.close(page)


def page_avatar_hosts_match(dash: Dashboard, hosts: list[str]) -> bool:
    text = (REPO_ROOT / "social.js").read_text(encoding="utf-8")
    block = re.search(r"const AVATAR_HOSTS = \[(.*?)\];", text, re.S)
    page_hosts = re.findall(r"'([^']+)'", block.group(1)) if block else []
    return page_hosts == hosts


def expected_posts(social: dict | None) -> list[dict]:
    if not social:
        return []
    accounts = social.get("accounts") or {}
    minf = (social.get("guardrails") or {}).get("min_followers") or 0
    day = social.get("day")
    out, seen = [], set()
    for p in social.get("top_posts") or []:
        key = str(p.get("author", "")).lower()
        acc = accounts.get(key)
        if not acc or not eligible_account(key, acc, minf):
            continue
        if p.get("visibility") not in (None, "public") or p.get("sensitive") is True or str(p.get("spoiler_text") or "").strip():
            continue
        if not str(p.get("created_at", "")).startswith(day or "?"):
            continue
        url = p.get("url")
        user = key.split("@")[0]
        if not re.fullmatch(r"https://[^/]+/@" + re.escape(user) + r"/\d{1,30}", str(url or ""), re.I) or url in seen:
            continue
        fav = p.get("favourites")
        if not isinstance(fav, (int, float)) or fav < 0:
            continue
        seen.add(url)
        out.append({"url": url, "fav": fav, "followers": acc["followers"]})
    out.sort(key=lambda w: (-w["fav"], w["url"]))
    return out[:10]


# ---------------------------------------------------------------- prerender, responsive, guide, meta

def cmd_prerender(args, res: Results, dash: Dashboard):
    s = "prerender"
    print("== prerender")
    a = dash.arch
    # 1. the static snapshot: script.js aborted, so nothing repaints it
    static = dash.new_page(feed="stale", no_script=True)
    dash.open(static, wait_ready=False)
    static.wait_for_load_state("load")
    snap = static.evaluate(PRERENDER_JS)
    res.check(s, "script.js was blocked for the snapshot", static.evaluate("() => !window.MastodonTerminal"))
    dash.close(static)
    # 2. the painted page
    page = dash.new_page(feed="stale")
    dash.open(page)
    painted = page.evaluate(PRERENDER_JS)
    res.check(s, "page has data-prerender elements, ticker, milestones and strip blocks",
              len(snap["values"]) >= 30 and snap["ticker"] and snap["milestones"] and snap["strip"], f"{len(snap['values'])} elements")
    keys = {k for k, _ in snap["values"]}
    contract = node_json("process.stdout.write(JSON.stringify(require(process.argv[1]).INLINE_KEYS))", str(REPO_ROOT / "lib" / "prerender.js"))
    res.check(s, "every pre-render key in lib/prerender.js has an element", not [k for k in contract if k not in keys], f"missing {[k for k in contract if k not in keys]}")
    res.check(s, "same elements before and after the script runs", [k for k, _ in snap["values"]] == [k for k, _ in painted["values"]])
    diff = [(k, sv, pv) for (k, sv), (_, pv) in zip(snap["values"], painted["values"]) if sv != pv]
    res.check(s, "every data-prerender text equals the painted text", not diff, "; ".join(f"{k}: static={sv!r} painted={pv!r}" for k, sv, pv in diff[:5])[:500])
    res.check(s, "ticker items equal the static ticker", [squash(x) for x in snap["ticker"]] == [squash(x) for x in painted["ticker"][:len(snap["ticker"])]],
              f"{snap['ticker'][:2]} vs {painted['ticker'][:2]}")
    res.check(s, "milestone rows equal the static milestones", [squash(x) for x in snap["milestones"]] == [squash(x) for x in painted["milestones"]])
    res.check(s, "FediDB strip equals the static strip", [squash(x) for x in snap["strip"]] == [squash(x) for x in painted["strip"]])
    # 3. the static values equal the independent archive
    static_by = {}
    for k, v in snap["values"]:
        static_by.setdefault(k, v)
    _, total = a.last_valid("total")
    _, mau = a.last_valid("active")
    _, servers = a.last_valid("servers")
    want = {"last-day": fmt_day(a.last), "total-users": fmt_int(total), "mau-full": fmt_int(mau), "mau": fmt_compact(mau), "servers": fmt_int(servers),
            "first-day": fmt_day(a.first)}
    got = {k: static_by.get(k) for k in want}
    res.check(s, "static values match the archive read independently (not stale)", got == want, f"{got} vs {want}")
    lo, hi = a.window(DEFAULT_RANGE)
    res.check(s, "static range-dates is the default 1Y window", static_by.get("range-dates") == f"{fmt_day(a.dates[lo])} → {fmt_day(a.dates[hi])} · {hi - lo + 1} pts", static_by.get("range-dates"))
    gen = static_by.get("generated", "")
    res.check(s, "build stamp is a UTC timestamp", bool(re.fullmatch(r"\d{4}-\d\d-\d\d \d\d:\d\d UTC", gen)), gen)
    m = re.search(r"historicalData\.js\?v=(\d+)", dash.static_html)
    res.check(s, "historicalData.js cache-bust stamp matches the build stamp", bool(m) and gen[:16].replace("-", "").replace(" ", "").replace(":", "") == m.group(1), f"{m and m.group(1)} vs {gen}")
    no_errors(res, s, page)
    dash.close(page)


def cmd_responsive(args, res: Results, dash: Dashboard):
    s = "responsive"
    print("== responsive")
    for width, height in ((390, 844), (820, 1180), (1440, 900)):
        page = dash.new_page(width=width, height=height)
        dash.open(page)
        m = page.evaluate("() => ({doc: document.documentElement.scrollWidth, body: document.body.scrollWidth, vw: window.innerWidth})")
        wide = page.evaluate("""() => [...document.querySelectorAll('body *')].filter(el => {
            const r = el.getBoundingClientRect(); if (!r.width || r.right <= window.innerWidth + 1) return false;
            return !el.closest('.table-responsive, .soc-table-wrap, .ticker-viewport, .visually-hidden, dialog, .hud');
          }).slice(0, 5).map(el => el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (typeof el.className === 'string' && el.className ? '.' + el.className.trim().split(/\\s+/).join('.') : ''))""")
        ok = max(m["doc"], m["body"]) <= m["vw"] + 1
        res.check(s, f"{width}px: no horizontal page scroll", ok, f"scrollWidth {m}" + (f"; overflowing {wide}" if wide else ""))
        res.check(s, f"{width}px: no element pokes out of the viewport", not wide, str(wide))
        charts = dash.charts(page)
        res.check(s, f"{width}px: all six charts fit their panels", all(
            page.evaluate("(id) => { const c = document.getElementById(id); const r = c.getBoundingClientRect(); return r.width > 150 && r.right <= window.innerWidth + 1; }", i) for i in CANVAS_IDS.values()))
        bars = page.evaluate("""() => { const b = document.querySelector('.terminal-command-bar'); const r = b.getBoundingClientRect();
            return {right: r.right, vw: window.innerWidth, scroll: b.scrollWidth, client: b.clientWidth}; }""")
        res.check(s, f"{width}px: command bar fits", bars["right"] <= bars["vw"] + 1 and bars["scroll"] <= bars["client"] + 1, json.dumps(bars))
        # social panels on every board
        bad = []
        for mode in ("servers", "accounts"):
            pick(page, mode=mode)
            for bid, wins, _, _ in SOC_BOARDS[mode]:
                pick(page, board=bid, win=(wins or [None])[0])
                dm = page.evaluate("() => ({doc: document.documentElement.scrollWidth, vw: window.innerWidth})")
                if dm["doc"] > dm["vw"] + 1:
                    bad.append(f"{mode}/{bid}: {dm}")
        res.check(s, f"{width}px: no horizontal page scroll on any leaderboard", not bad, "; ".join(bad)[:300])
        inner = page.evaluate("() => { const w = document.querySelector('#soc-ldr-wrap'); return w ? [w.scrollWidth, w.clientWidth] : null; }")
        if inner and inner[0] > inner[1] + 1:
            res.warn(s, f"{width}px: leaderboard table scrolls inside its own region", f"{inner[0]} > {inner[1]}")
        no_errors(res, s, page, f"{width}px: no console errors")
        dash.shot(page, f"responsive-{width}")
        dash.shot(page, f"responsive-{width}-full", full_page=True)
        if width == 390:
            pick(page, mode="accounts", board="followed")
            dash.shot_el(page, "#section-ldr", "responsive-390-social")
        dash.close(page)


def cmd_guide(args, res: Results, dash: Dashboard):
    s = "guide"
    print("== guide")
    a = dash.arch
    page = dash.new_page()
    dash.open(page)
    dialog = page.locator("#guide-dialog")
    res.check(s, "guide closed on load", not dialog.is_visible() and dialog.evaluate("d => d.open === false"))
    btn = page.locator("#open-guide-btn")
    res.check(s, "GUIDE button announces a dialog", btn.get_attribute("aria-haspopup") == "dialog")
    btn.click()
    res.check(s, "GUIDE opens a modal dialog", dialog.is_visible() and dialog.evaluate("d => d.open === true && d.matches(':modal')"))
    text = norm(dialog.text_content())
    for needle, why in ((r"MAU HEALTH", "velocity modes"), (r"SIGNUPS", "signups mode"), (r"GROWTH %", "growth mode"), (r"COMPARE", "compare"),
                        (r"7D MA|7-day", "moving average"), (r"LOG", "log scale"), (r"LDR", "leaderboards"), (r"PST", "top posts"), (r"DEC", "decentralization"),
                        (r"FediDB", "FediDB source"), (r"10,000 followers", "follower guardrail"), (r"ARCHIVE", "status ARCHIVE"), (r"LIVE", "status LIVE"),
                        (r"Esc", "Esc to close"), (r"FLAGGED", "flagged days"), (r"joinmastodon", "data source")):
        res.check(s, f"guide covers {why}", bool(re.search(needle, text)))
    rows = page.locator("#guide-ranges-body tr").count()
    want_rows = 7 + len(a.year_ranges()[2:]) + 1
    res.check(s, "guide range table is generated from the live range list", rows == want_rows, f"{rows} rows vs {want_rows}")
    res.check(s, "guide HUD example is filled from the newest reading", norm(page.locator("#hud-demo-value").text_content()) == fmt_int(a.last_valid("active")[1]),
              norm(page.locator("#hud-demo-value").text_content()))
    dash.shot(page, "guide-open")
    page.keyboard.press("Escape")
    res.check(s, "Esc closes the guide", not dialog.is_visible())
    btn.click()
    page.locator("#close-guide-btn").click()
    res.check(s, "the header close button closes it", not dialog.is_visible())
    btn.click()
    page.locator("#guide-dismiss-btn").click()
    res.check(s, "the footer CLOSE button closes it", not dialog.is_visible())
    btn.click()
    page.mouse.click(2, 2)
    res.check(s, "clicking the backdrop closes it", not dialog.is_visible())
    page.locator('.time-btn[data-range="1Y"]').focus()
    page.keyboard.press("C")
    page.locator("#section-velocity-chart .chart-comparison-legend").click()
    res.check(s, "the Prior period legend badge opens the guide", dialog.is_visible())
    page.keyboard.press("Escape")
    no_errors(res, s, page)
    dash.close(page)


def cmd_meta(args, res: Results, dash: Dashboard):
    s = "meta"
    print("== meta")
    a = dash.arch
    html = dash.static_html
    m = re.search(r"""<script[^>]*id=["']jsonld["'][^>]*>([\s\S]*?)</script>""", html)
    ld = None
    try:
        ld = json.loads(m.group(1)) if m else None
    except json.JSONDecodeError as e:
        res.check(s, "JSON-LD parses", False, str(e))
    if m and ld is not None:
        res.check(s, "JSON-LD parses", True)
        graph = {n.get("@type"): n for n in ld.get("@graph", [])}
        res.check(s, "JSON-LD has WebApplication, FAQPage and Dataset", {"WebApplication", "FAQPage", "Dataset"} <= set(graph), str(list(graph)))
        ds = graph.get("Dataset", {})
        res.check(s, "JSON-LD Dataset covers the whole archive", ds.get("temporalCoverage") == f"{a.first}/{a.last}", ds.get("temporalCoverage", ""))
        csv_url = (ds.get("distribution") or [{}])[0].get("contentUrl", "")
        res.check(s, "JSON-LD CSV distribution points at the published data/mastodon-daily.csv", csv_url == SITE_URL + "data/mastodon-daily.csv", csv_url)
    elif not m:
        res.check(s, "JSON-LD script#jsonld present", False)

    page = dash.new_page(feed="stale")
    dash.open(page)
    faq = """(src) => {
        const faqOf = (root) => [...root.querySelectorAll('details[class*="faq"]')].map(d => {
          const sum = d.querySelector('summary');
          const q = sum ? [...sum.childNodes].filter(n => !(n.nodeType === 1 && (n.getAttribute('aria-hidden') === 'true' || n.classList.contains('faq-arrow')))).map(n => n.textContent).join(' ') : '';
          return [q, [...d.childNodes].filter(n => n !== sum).map(n => n.textContent).join(' ')];
        });
        const ldOf = (text) => { try { const g = JSON.parse(text)['@graph'].find(n => n['@type'] === 'FAQPage'); return g.mainEntity.map(q => [q.name, q.acceptedAnswer.text]); } catch (e) { return null; } };
        const live = document.getElementById('jsonld').textContent;
        return {visible: faqOf(document), ldLive: ldOf(live), ldStatic: ldOf(src),
                head: {jsonld: !!document.querySelector('head script#jsonld'), og: document.querySelectorAll('head meta[property^="og:"]').length,
                       strays: [...document.querySelectorAll('body meta, body link[rel=stylesheet], body title')].map(e => e.outerHTML.slice(0, 80)),
                       canonical: (document.querySelector('head link[rel=canonical]') || {}).href || ''}};
      }"""
    r = page.evaluate(faq, m.group(1) if m else "{}")
    sq = lambda pairs: [(squash(q), squash(t)) for q, t in (pairs or [])]
    res.check(s, "visible FAQ has entries", len(r["visible"]) >= 5, str(len(r["visible"])))
    res.check(s, "JSON-LD FAQ in the served HTML matches the visible FAQ (static)", sq(r["ldStatic"]) == sq(r["visible"]),
              f"{len(r['ldStatic'] or [])} vs {len(r['visible'])}")
    res.check(s, "JSON-LD FAQ matches the visible FAQ after script.js paints", sq(r["ldLive"]) == sq(r["visible"]))
    res.check(s, "head intact (JSON-LD and og: tags in <head>, nothing pushed into <body>)", r["head"]["jsonld"] and r["head"]["og"] > 0 and not r["head"]["strays"], str(r["head"]["strays"])[:200])
    res.check(s, "canonical URL is the published site", r["head"]["canonical"] == SITE_URL, r["head"]["canonical"])
    # every local href/src in the served HTML resolves
    refs = sorted({u for u in re.findall(r"""(?:href|src)=["']([^"'#][^"']*)["']""", html) if not re.match(r"^(https?:|mailto:|data:|//)", u)})
    bad = []
    for u in refs:
        resp = page.request.get(urllib.parse.urljoin(dash.url(), u))
        if not resp.ok:
            bad.append(f"{u} -> {resp.status}")
    res.check(s, f"all {len(refs)} local links and assets resolve", not bad, "; ".join(bad))
    for f in ("robots.txt", "sitemap.xml", "favicon.svg", "og-image.png"):
        resp = page.request.get(urllib.parse.urljoin(dash.url(), f))
        res.check(s, f"{f} is served", resp.ok, f"HTTP {resp.status}")
    sm = page.request.get(urllib.parse.urljoin(dash.url(), "sitemap.xml"))
    if sm.ok:
        lm = re.search(r"<lastmod>([^<]+)</lastmod>", sm.text())
        res.check(s, "sitemap lastmod is the last archive day", bool(lm) and lm.group(1) == a.last, lm.group(1) if lm else "no lastmod")
    no_errors(res, s, page)
    dash.close(page)


SUITES = {
    "smoke": cmd_smoke, "status": cmd_status, "kpi": cmd_kpi, "ranges": cmd_ranges, "toggles": cmd_toggles, "compare": cmd_compare,
    "keyboard": cmd_keyboard, "modes": cmd_modes, "surges": cmd_surges, "gaps": cmd_gaps, "hud": cmd_hud, "exports": cmd_exports,
    "table": cmd_table, "social": cmd_social, "prerender": cmd_prerender, "responsive": cmd_responsive, "guide": cmd_guide, "meta": cmd_meta,
}


def run_suite(name, args, res: Results, dash: Dashboard):
    try:
        SUITES[name](args, res, dash)
    except Exception as e:  # noqa: BLE001 - one broken suite must not hide the others
        res.check(name, "suite ran to completion", False, f"{type(e).__name__}: {str(e).splitlines()[0][:300]}")
    # The expected values were read once at the start; a data file that changed since makes this suite's answers moot.
    now = dash.fetch_text(urllib.parse.urljoin(dash.base, dash._asset_url(r"historicalData\.js")), allow_missing=True)
    if now is not None and now != dash.data_text:
        res.check(name, "historicalData.js did not change while the suite ran", False, "re-run: the expected values are from the earlier file")


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    sub = parser.add_subparsers(dest="command", required=True)
    for name in ["doctor", *SUITES, "all"]:
        p = sub.add_parser(name)
        p.add_argument("--url", help="drive this URL instead of serving the repo (e.g. https://obsesivegamer.github.io/Mastodon-User-Trends/)")
        p.add_argument("--port", type=int, default=0, help="local server port (default: a free port)")
        p.add_argument("--out", help=f"screenshot directory (default: {ARTIFACTS.relative_to(REPO_ROOT)})")
        p.add_argument("--headed", action="store_true", help="show the browser")
        p.add_argument("--slow-mo", type=int, default=0, help="ms delay between browser actions")
        p.add_argument("--json", help="also write the results to this JSON file")
    args = parser.parse_args(argv)

    res = Results()
    if args.command in ("doctor", "all"):
        cmd_doctor(args, res)
    names = list(SUITES) if args.command == "all" else ([] if args.command == "doctor" else [args.command])
    if names:
        if sync_playwright is None:
            print(f"Playwright is not installed for {sys.executable}. Use a Python that has it, e.g.\n"
                  "  /Users/jeremylichtman/Documents/amber-archive/.venv/bin/python -I scripts/verify-dashboard.py all", file=sys.stderr)
            return 2
        try:
            with Dashboard(args) as dash:
                print(f"target: {dash.base}  archive: {dash.arch.first} → {dash.arch.last} ({dash.arch.row_count} rows)")
                for name in names:
                    run_suite(name, args, res, dash)
        except (RuntimeError, PlaywrightError, subprocess.CalledProcessError) as e:
            res.check(args.command, "dashboard reachable", False, str(e).splitlines()[0][:300])

    counts = {k: sum(1 for r in res.rows if r[1] == k) for k in ("PASS", "FAIL", "WARN")}
    print(f"\n{counts['PASS']} passed, {counts['FAIL']} failed, {counts['WARN']} warnings")
    for suite, status, name, detail in res.rows:
        if status in ("FAIL", "WARN"):
            print(f"  {status} {suite}: {name}" + (f" -- {detail}" if detail else ""))
    if args.json:
        Path(args.json).write_text(json.dumps([dict(zip(("suite", "status", "check", "detail"), r)) for r in res.rows], indent=2))
    return 1 if res.failed else 0


if __name__ == "__main__":
    sys.exit(main())
