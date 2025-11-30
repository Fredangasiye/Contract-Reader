const { createUser, getUserByEmail } = require('../backend/src/services/dataStorage');
const bcrypt = require('bcryptjs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../backend/.env') });

async function seedDemoUser() {
    console.log('Seeding demo user...');

    const email = 'demo@example.com';
    const password = 'password123';

    try {
        const existingUser = await getUserByEmail(email);
        if (existingUser) {
            console.log('Demo user already exists.');
            return;
        }

        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        await createUser({
            email,
            passwordHash,
            subscriptionTier: 'premium', // Give them premium for testing!
            subscriptionExpiry: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString() // 1 year
        });

        console.log('✅ Demo user created successfully!');
        console.log('Email:', email);
        console.log('Password:', password);
    } catch (error) {
        console.error('Failed to seed demo user:', error);
    }
}

seedDemoUser();
