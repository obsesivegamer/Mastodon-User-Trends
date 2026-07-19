const fs = require('fs');
const path = require('path');

const FILE_PATH = path.join(__dirname, 'historicalData.js');
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
            console.error("No valid data received from API.");
            return;
        }

        console.log(`Received ${mappedData.length} records from the live API.`);

        // Read existing historical data
        let historicalData = [];
        if (fs.existsSync(FILE_PATH)) {
            const content = fs.readFileSync(FILE_PATH, 'utf8');
            // Extract the JSON portion from the JS file
            const jsonStr = content.replace('const historicalData = ', '').replace(/;[\s]*$/, '');
            historicalData = JSON.parse(jsonStr);
            console.log(`Loaded ${historicalData.length} existing historical records.`);
        }

        // Combine data
        const combinedData = [...historicalData, ...mappedData];
        
        // Remove duplicates by date, preferring the latest API data (since mappedData is added last, Map will overwrite)
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
    }
}

updateData();
