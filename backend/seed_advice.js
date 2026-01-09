require('dotenv').config();
const { saveAdvice } = require('./src/services/dataStorage');
const fs = require('fs').promises;
const path = require('path');

async function seed() {
    console.log('Starting advice seeding...');

    try {
        const adviceFilePath = path.join(__dirname, 'data/advice_content.json');
        const adviceJson = await fs.readFile(adviceFilePath, 'utf8');
        const adviceContent = JSON.parse(adviceJson);

        console.log(`Found ${adviceContent.length} advice items. Uploading to Supabase...`);

        await saveAdvice(adviceContent);

        console.log('✅ Seeding completed successfully!');
    } catch (error) {
        console.error('❌ Seeding failed:', error);
        process.exit(1);
    }
}

seed();
