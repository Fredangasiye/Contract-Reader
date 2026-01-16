const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');

const SUPABASE_URL = 'https://nzwmoewutowpkdlzzgty.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im56d21vZXd1dG93cGtkbHp6Z3R5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDUxMDUzNSwiZXhwIjoyMDgwMDg2NTM1fQ.PAyDm1YQMMSb_xZz9ctBYt0evdWzp2kGIGJpJBB4BCQ';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkAndCreateDemo() {
    const email = 'demo@example.com';
    const password = 'password123';

    console.log(`Checking for user: ${email}...`);

    const { data: user, error: fetchError } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
        console.error('Error fetching user:', fetchError);
        return;
    }

    if (user) {
        console.log('Demo user already exists. Upgrading to premium...');
        const { error: updateError } = await supabase
            .from('users')
            .update({
                subscription_tier: 'premium',
                subscription_expiry: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
            })
            .eq('email', email);

        if (updateError) {
            console.error('Error updating user:', updateError);
        } else {
            console.log('Demo user upgraded successfully.');
        }
    } else {
        console.log('Demo user does not exist. Creating...');
        const passwordHash = await bcrypt.hash(password, 10);
        const { error: insertError } = await supabase
            .from('users')
            .insert({
                user_id: crypto.randomUUID(),
                email: email,
                password_hash: passwordHash,
                subscription_tier: 'premium',
                subscription_expiry: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
                scan_count: 0,
                created_at: new Date().toISOString()
            });

        if (insertError) {
            console.error('Error creating user:', insertError);
        } else {
            console.log('Demo user created successfully.');
        }
    }
}

checkAndCreateDemo();
