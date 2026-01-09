const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://nzwmoewutowpkdlzzgty.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im56d21vZXd1dG93cGtkbHp6Z3R5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDUxMDUzNSwiZXhwIjoyMDgwMDg2NTM1fQ.PAyDm1YQMMSb_xZz9ctBYt0evdWzp2kGIGJpJBB4BCQ';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
    try {
        console.log('Testing Supabase connection...');
        // Try to fetch users or something simple. Service role should allow access to auth.users or public tables.
        // Let's check a public table 'users' (from schema.sql)
        const { data, error } = await supabase.from('users').select('count', { count: 'exact', head: true });

        if (error) {
            console.error('Connection failed:', error.message);
        } else {
            console.log('Connection successful!');
        }
    } catch (err) {
        console.error('Unexpected error:', err.message);
    }
}

testConnection();
