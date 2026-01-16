const { getAdviceByType } = require('./src/services/dataStorage');

async function testFallback() {
    console.log('Testing Supabase Fallback...');

    // We expect this to fall back to local data because the test environment 
    // might not have the correct Supabase credentials or the host might be blocked.
    // Even if it succeeds with Supabase, we can verify it works.

    try {
        const advice = await getAdviceByType('gym');
        if (advice && advice.length > 0) {
            console.log('Success! Received', advice.length, 'advice items.');
            console.log('First item title:', advice[0].title);

            // Check if it's the expected data from advice_content.json
            if (advice[0].adviceId === 'gym-red-flags') {
                console.log('Verified: Data matches bundled advice_content.json');
            }
        } else {
            console.error('Failed: No advice items returned.');
        }
    } catch (err) {
        console.error('Test failed with error:', err);
    }
}

testFallback();
