require('dotenv').config();
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
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    next();
});

// Routes
app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

app.use('/upload', uploadRouter);
app.use('/analyze', analyzeRouter);
app.use('/admin', adminRouter);
app.use('/users', usersRouter);
app.use('/payments', paymentsRouter);
app.use('/letters', lettersRouter);
app.use('/advice', adviceRouter);

app.listen(port, () => {
    console.log(`Backend listening on port ${port}`);
    console.log(`Health check: http://localhost:${port}/health`);
    console.log(`Analyze endpoint: http://localhost:${port}/analyze`);
    console.log(`Admin insights: http://localhost:${port}/admin/insights`);
});
