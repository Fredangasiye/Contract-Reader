const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://nzwmoewutowpkdlzzgty.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im56d21vZXd1dG93cGtkbHp6Z3R5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDUxMDUzNSwiZXhwIjoyMDgwMDg2NTM1fQ.PAyDm1YQMMSb_xZz9ctBYt0evdWzp2kGIGJpJBB4BCQ';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function upgradeDemo() {
    console.log('Upgrading demo@example.com to premium (minimal)...');
    const { data, error } = await supabase
        .from('users')
        .update({
            subscription_tier: 'premium',
            subscription_expiry: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
        })
        .eq('email', 'demo@example.com');

    if (error) {
        console.error('Failed to upgrade demo user:', error);
    } else {
        console.log('Demo user upgraded successfully');
    }
}

upgradeDemo();
