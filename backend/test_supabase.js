const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './backend/.env' });

const supabaseUrl = process.env.SUPABASE_URL || 'https://nzwmoewutowpkdlzzgty.supabase.co';
const supabaseKey = process.env.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im56d21vZXd1dG93cGtkbHp6Z3R5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDUxMDUzNSwiZXhwIjoyMDgwMDg2NTM1fQ.PAyDm1YQMMSb_xZz9ctBYt0evdWzp2kGIGJpJBB4BCQ';

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
    console.log('Testing Supabase connection...');
    try {
        const { data, error } = await supabase.from('advice').select('*').limit(1);
        if (error) {
            console.error('Error fetching advice:', error);
        } else {
            console.log('Success! Data:', data);
        }
    } catch (err) {
        console.error('Fetch failed:', err);
    }
}

test();
