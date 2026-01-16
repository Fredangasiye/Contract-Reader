const fs = require('fs').promises;
const path = require('path');

async function test() {
    const adviceFilePath = path.join(__dirname, 'data/advice_content.json');
    console.log('Checking path:', adviceFilePath);
    try {
        const data = await fs.readFile(adviceFilePath, 'utf8');
        const json = JSON.parse(data);
        console.log('Success! Found', json.length, 'advice items.');
    } catch (err) {
        console.error('Failed to read local advice data:', err.message);
    }
}

test();
