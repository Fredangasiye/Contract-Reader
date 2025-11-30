const { loadRules, findRedFlags } = require('./backend/src/services/rulesEngine');

async function test() {
    // Test loading rules
    const rules = loadRules('insurance');
    console.log('Number of rules loaded:', Object.keys(rules).length);
    console.log('First few rule IDs:', Object.keys(rules).slice(0, 5));

    // Test a simple match
    const text = "The maximum payable amount is R20 000.";
    const flags = await findRedFlags(text, 'insurance');
    console.log('\nTest text:', text);
    console.log('Flags found:', flags.length);
    if (flags.length > 0) {
        console.log('First flag:', flags[0]);
    }

    // Test roadworthiness
    const text2 = "Tyres must be in good condition.";
    const flags2 = await findRedFlags(text2, 'insurance');
    console.log('\nTest text 2:', text2);
    console.log('Flags found:', flags2.length);
    if (flags2.length > 0) {
        console.log('First flag:', flags2[0]);
    }
}

test().catch(console.error);
