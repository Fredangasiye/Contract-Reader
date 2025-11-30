-- Insert Demo User
INSERT INTO public.users (
    email,
    password_hash,
    subscription_tier,
    subscription_expiry,
    scan_count,
    created_at
) VALUES (
    'demo@example.com',
    '$2b$10$DWTL.5kMPQt3zckXRErf4OpQY/JCPRlnCloIudezRmI6Bc7p5eMpC', -- Hash for 'password123'
    'premium',
    NOW() + INTERVAL '1 year',
    0,
    NOW()
) ON CONFLICT (email) DO NOTHING;
