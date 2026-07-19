# Mastodon Statistics Dashboard

A sleek, premium, financial-style dashboard to track Mastodon's total user growth and active user trends over time. Built with Vanilla HTML/JS/CSS, it is incredibly fast, visually stunning, and works entirely client-side.

## Features

### 📈 Financial-Style Analytics
- **Time Scale Selector:** Filter the data seamlessly using an interactive toggle to view trends over specific timeframes (**1W, 1M, 6M, YTD, 1Y, and ALL**).
- **Dynamic Portfolio Metrics:** The metric cards act like a stock portfolio. When a timeframe is selected, they instantly calculate the exact **percentage change** (e.g., `+15.2%`) and the raw numerical difference between the start and end of that period.
- **Auto-Cropping Charts:** Filtering the time scale automatically crops the X-axis of both charts, allowing you to clearly see recent micro-trends without them being compressed by the massive multi-year dataset.

### 🎨 Premium UI & Interactive Layout
- **Full-Width Vertical Stacking:** Both the "Total Users" and "Active Users" charts span 100% of the screen width, maximizing the X-axis for viewing years of dense historical data.
- **Interactive Zoom & Pan:** Integrated with `chartjs-plugin-zoom`. Use your mouse wheel (or pinch gesture) to zoom deep into specific months or days, and click-and-drag to pan across the timeline.
- **Aesthetics:** A stunning dark-mode layout with a deep background (`#121420`), glassmorphism effects (`backdrop-filter: blur`), and glowing gradient chart lines.

### ⚙️ Architecture & Permanent Data Archival
To ensure maximum speed and resilience against API outages, this dashboard does **not** fetch live data directly on load. Instead, it reads from a local static file (`historicalData.js`) containing a permanent archive of over 1,000 daily records stretching back to 2017.

---

## 🚀 How to Run the Dashboard

Since this is built with Vanilla HTML/JS/CSS, no complex build steps (like Webpack or Vite) are required!

1. Open your terminal and navigate to the directory:
   ```bash
   cd /Users/jeremylichtman/Documents/antigravity/eager-bardeen
   ```
2. Start a simple local HTTP server:
   ```bash
   python3 -m http.server 8000
   ```
3. Open your browser and navigate to [http://localhost:8000](http://localhost:8000).

*(Alternatively, you can just double-click `index.html` in your file explorer to open it directly in a browser, though running a local server is recommended to prevent strict CORS/file protocol restrictions in some browsers).*

---

## 🔄 How to Update the Data

The dashboard's data archive is completely separated from the UI. To fetch the latest statistics from the live Mastodon API and permanently merge them into your local history, use the included Node.js updater script.

### Manual Update
Open your terminal and run:
```bash
node updateData.js
```
The script will fetch the latest 30 days of data from `api.joinmastodon.org`, safely merge it into your massive historical dataset (overwriting duplicates and appending new days), and save it permanently to `historicalData.js`.

### Easy Daily Refresh
For one-command daily updates, use the helper script:
```bash
./updateDaily.sh
```
This is equivalent to `node updateData.js`, but wrapped in a simple executable shell script.

### Automated Updates (Cron Job)
You can configure a cron job to automatically run this script every day so your archive is always up to date without manual intervention.

*Note: If you are using the Antigravity AI assistant, you can simply type `/schedule run node updateData.js every day` in the chat, and the agent will manage the background task for you!*

### Fully Automated macOS Updates
On macOS, you can install a LaunchAgent to run the updater every day at 03:00 local time:
```bash
./installLaunchAgent.sh
```

To remove the scheduled task later:
```bash
./uninstallLaunchAgent.sh
```

### Fully Automated Windows Updates
On Windows, use PowerShell to install a scheduled task that runs every day at 03:00 local time:
```powershell
.\installTaskScheduler.ps1
```

To remove the scheduled task later:
```powershell
.\uninstallTaskScheduler.ps1
```
