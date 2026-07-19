const fs = require('fs');
const vm = require('vm');

async function extract() {
    const text = fs.readFileSync('test.html', 'utf8');
    const start = text.indexOf('analytics = [');
    const end = text.indexOf('];\n', start);
    
    if (start !== -1 && end !== -1) {
        const arrayStr = text.substring(start + 'analytics = '.length, end + 1);
        
        const sandbox = {};
        vm.createContext(sandbox);
        vm.runInContext(`var data = ${arrayStr};`, sandbox);
        
        const rawData = sandbox.data;
        
        const finalData = rawData.map(item => ({
             date: item.period.split('T')[0],
             total: parseInt(String(item.user_count).trim(), 10) || 0,
             active: item.active_user_count ? parseInt(String(item.active_user_count).trim(), 10) : 0
        })).filter(item => item.date && item.total > 0);
        
        const uniqueMap = new Map();
        finalData.forEach(item => uniqueMap.set(item.date, item));
        
        const sorted = Array.from(uniqueMap.values()).sort((a,b) => new Date(a.date) - new Date(b.date));
        
        fs.writeFileSync('historicalData.js', `const historicalData = ${JSON.stringify(sorted, null, 2)};`);
        console.log(`Extracted ${sorted.length} records.`);
    } else {
        console.log("Could not find boundaries.");
    }
}
extract();
