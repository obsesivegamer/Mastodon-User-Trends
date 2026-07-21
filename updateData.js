const fs = require('fs');
const path = require('path');

const FILE_PATH = process.env.HIST_FILE_OVERRIDE || path.join(__dirname, 'historicalData.js');
const API_URL = "https://api.joinmastodon.org/statistics";

async function updateData() {
    console.log(`Fetching latest data from ${API_URL}...`);

    try {
        const response = await fetch(API_URL);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const apiData = await response.json();

        // Map API data
        let mappedData = [];
        if (Array.isArray(apiData)) {
            mappedData = apiData.map(item => ({
                date: item.period || item.date || item.created_at,
                total: parseInt(item.user_count || item.total_users || 0, 10),
                active: parseInt(item.active_user_count || item.active_users || 0, 10)
            })).filter(item => item.date && !isNaN(item.total));
        }

        if (mappedData.length === 0) {
            throw new Error("No valid data received from API.");
        }

        console.log(`Received ${mappedData.length} records from the live API.`);

        // Guard 1: Skip today's (incomplete) date — the API routinely
        // returns partial aggregates for the day still in progress.
        const todayUTC = new Date().toISOString().split('T')[0];
        const beforeSkip = mappedData.length;
        mappedData = mappedData.filter(item => {
            const itemDate = new Date(item.date).toISOString().split('T')[0];
            return itemDate !== todayUTC;
        });
        if (mappedData.length < beforeSkip) {
            console.log(`Skipped ${beforeSkip - mappedData.length} record(s) for today (${todayUTC}) — data is still incomplete.`);
        }

        // Read existing historical data
        let historicalData = [];
        if (fs.existsSync(FILE_PATH)) {
            const content = fs.readFileSync(FILE_PATH, 'utf8');
            // Extract the JSON portion from the JS file
            const jsonStr = content.replace('const historicalData = ', '').replace(/;\s*$/, '');
            historicalData = JSON.parse(jsonStr);
            console.log(`Loaded ${historicalData.length} existing historical records.`);
        }

        // Guard 2: Sanity check — reject API records whose total or active
        // count drops by more than 20% compared to the most recent trusted
        // archived value.  This catches partial-day data that slipped past
        // the today-filter (e.g. timezone edge cases).
        const SANITY_THRESHOLD = 0.20;
        if (historicalData.length > 0) {
            const sorted = [...historicalData].sort((a, b) => new Date(a.date) - new Date(b.date));
            const lastTrusted = sorted[sorted.length - 1];
            const saneData = [];
            for (const rec of mappedData) {
                const totalDrop = (lastTrusted.total - rec.total) / lastTrusted.total;
                const activeDrop = (lastTrusted.active - rec.active) / lastTrusted.active;
                if (totalDrop >= SANITY_THRESHOLD || activeDrop >= SANITY_THRESHOLD) {
                    console.warn(`⚠ Rejected outlier for ${rec.date}: total=${rec.total}, active=${rec.active} (>${SANITY_THRESHOLD * 100}% drop from last trusted record).`);
                } else {
                    saneData.push(rec);
                }
            }
            mappedData = saneData;
        }

        // Guard 3: Reverse dedup priority — existing archived values take
        // precedence over newly fetched API values for the same date.
        // This prevents a partial re-fetch from overwriting a previously
        // complete record.  API data goes in first, then archive overwrites.
        const combinedData = [...mappedData, ...historicalData];

        // Remove duplicates by date (archive wins because it's added last)
        const uniqueDataMap = new Map();
        combinedData.forEach(item => {
            // Standardize the date string key
            const dateKey = new Date(item.date).toISOString().split('T')[0];
            uniqueDataMap.set(dateKey, item);
        });

        // Convert back to array and sort chronologically
        const finalData = Array.from(uniqueDataMap.values());
        finalData.sort((a, b) => new Date(a.date) - new Date(b.date));

        // Write back to file
        const jsContent = `const historicalData = ${JSON.stringify(finalData, null, 2)};`;
        fs.writeFileSync(FILE_PATH, jsContent);

        console.log(`Successfully merged and saved ${finalData.length} total records to historicalData.js!`);
        console.log(`Data archival complete.`);

    } catch (error) {
        console.error("Error updating data:", error);
        process.exitCode = 1;
    }
}

updateData();
