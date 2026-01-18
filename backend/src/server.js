require('dotenv').config();
console.log('🚀 BACKEND INITIALIZING - VERSION: ' + new Date().toISOString());
const express = require('express');
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
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS for frontend
// CORS and CSP
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Content-Security-Policy', "default-src 'self'; img-src 'self' data:; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'");
    next();
});

// Routes
app.get('/', (req, res) => {
    res.send(`!!! NEW BACKEND VERSION !!! (v${new Date().toISOString()})`);
});

app.get('/favicon.ico', (req, res) => res.status(204).end());

app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/debug-config', (req, res) => {
    console.log('Debug endpoint hit');
    const key = process.env.OPENROUTER_API_KEY || '';
    console.log('Key configured:', !!key);
    res.json({
        keyConfigured: !!key,
        keyLast4: key.length > 4 ? key.slice(-4) : 'too-short',
        keyLength: key.length,
        timestamp: new Date().toISOString()
    });
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
