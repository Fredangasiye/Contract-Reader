const { findRedFlags } = require('./backend/src/services/rulesEngine');

async function test() {
    const text = "Premiums are subject to review.";
    const flags = await findRedFlags(text, 'insurance');
    console.log('Test text:', text);
    console.log('Flags found:', flags.length);
    console.log('Flags:', flags.map(f => f.id));

    // Test the pattern directly
    const pattern = "(?:review|subject\\s+to).*premium";
    const regex = new RegExp(pattern, 'gi');
    const match = regex.exec(text);
    console.log('\nPattern:', pattern);
    console.log('Match:', match);
}

test().catch(console.error);
