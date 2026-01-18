require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();
const port = 8080;

const uploadRouter = require('./routes/upload');
const analyzeRouter = require('./routes/analyze');
const adminRouter = require('./routes/admin');
const usersRouter = require('./routes/users');
const paymentsRouter = require('./routes/payments');
const lettersRouter = require('./routes/letters');
const adviceRouter = require('./routes/advice');

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.get('/', (req, res) => {
    res.send('Contract Reader Backend is running');
});

app.get('/favicon.ico', (req, res) => res.status(204).end());

app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/debug-config', (req, res) => {
    console.log('Debug endpoint hit');
    const openRouterKey = process.env.OPENROUTER_API_KEY || '';
    const supabaseUrl = process.env.SUPABASE_URL || '';
    const supabaseKey = process.env.SUPABASE_KEY || '';
    const jwtSecret = process.env.JWT_SECRET || '';

    res.json({
        openRouter: {
            configured: !!openRouterKey,
            length: openRouterKey.length,
            last4: openRouterKey.slice(-4)
        },
        supabase: {
            configured: !!(supabaseUrl && supabaseKey),
            url: supabaseUrl,
            keyLength: supabaseKey.length,
            keyLast4: supabaseKey.slice(-4)
        },
        jwt: {
            configured: !!jwtSecret,
            isDefault: jwtSecret === 'your-secret-key-change-in-production'
        },
        env: process.env.NODE_ENV,
        vercel: !!process.env.VERCEL,
        timestamp: new Date().toISOString()
    });
});

app.get('/test-db', async (req, res) => {
    try {
        const { getUserByEmail } = require('./services/dataStorage');
        const demoUser = await getUserByEmail('demo@example.com');
        res.json({
            success: true,
            demoUserFound: !!demoUser,
            demoUser: demoUser ? { email: demoUser.email, tier: demoUser.subscriptionTier } : null,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
            stack: error.stack,
            timestamp: new Date().toISOString()
        });
    }
});

app.use('/upload', uploadRouter);
app.use('/analyze', analyzeRouter);
app.use('/admin', adminRouter);
app.use('/users', usersRouter);
app.use('/payments', paymentsRouter);
app.use('/letters', lettersRouter);
app.use('/advice', adviceRouter);

const { getUserByEmail, createUser } = require('./services/dataStorage');
const bcrypt = require('bcryptjs');

// Seed Demo User
async function seedDemoUser() {
    try {
        const demoEmail = 'demo@example.com';
        const existingUser = await getUserByEmail(demoEmail);

        if (!existingUser) {
            console.log('Seeding demo user...');
            const passwordHash = await bcrypt.hash('password123', 10);
            await createUser({
                email: demoEmail,
                passwordHash,
                subscriptionTier: 'premium',
                subscriptionExpiry: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
            });
            console.log('Demo user created successfully');
        } else {
            console.log('Demo user already exists, ensuring premium status...');
            const { updateUser } = require('./services/dataStorage');
            await updateUser(existingUser.userId, {
                subscriptionTier: 'premium',
                subscriptionExpiry: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
                scanCredits: 99
            });
            console.log('Demo user updated to premium');
        }
    } catch (error) {
        console.error('Failed to seed demo user:', error);
    }
}

// Run seed for serverless environments
seedDemoUser();

// Start server
if (process.env.NODE_ENV !== 'test' && !process.env.VERCEL) {
    app.listen(port, () => {
        console.log(`Backend listening on port ${port}`);
        console.log(`Health check: http://localhost:${port}/health`);
        console.log(`Analyze endpoint: http://localhost:${port}/analyze`);
        console.log(`Admin insights: http://localhost:${port}/admin/insights`);
    });
}

module.exports = app;
