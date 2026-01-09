const { findRedFlags, detectContractType } = require('./src/services/rulesEngine');
const fs = require('fs');

async function testAnalysis() {
    try {
        const resultData = JSON.parse(fs.readFileSync('analysis_result.json', 'utf8'));
        const text = resultData.full_text;

        console.log('--- Testing Contract Type Detection ---');
        const type = detectContractType(text);
        console.log('Detected Type:', type);

        console.log('\n--- Testing Rules Engine (findRedFlags) ---');
        const flags = await findRedFlags(text, type);
        console.log('Number of flags found:', flags.length);

        if (flags.length > 0) {
            console.log('\nFirst 3 flags:');
            flags.slice(0, 3).forEach(f => {
                console.log(`- [${f.category}] ${f.title} (Severity: ${f.severity})`);
                console.log(`  Evidence: ${f.evidence.substring(0, 100)}...`);
            });
        } else {
            console.log('No flags found by the rules engine.');
        }
    } catch (error) {
        console.error('Test failed:', error);
    }
}

testAnalysis();
