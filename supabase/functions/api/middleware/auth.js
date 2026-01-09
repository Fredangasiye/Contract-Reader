const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

/**
 * Middleware to verify JWT token and attach user to request
 */
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Invalid or expired token' });
        }
        req.user = user;
        next();
    });
};

/**
 * Middleware to check if user has premium subscription
 */
const requirePremium = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    if (req.user.subscriptionTier === 'free') {
        return res.status(403).json({
            error: 'Premium subscription required',
            upgradeUrl: '/pricing'
        });
    }

    // Check if subscription is still valid
    if (req.user.subscriptionExpiry && new Date(req.user.subscriptionExpiry) < new Date()) {
        return res.status(403).json({
            error: 'Subscription expired',
            upgradeUrl: '/pricing'
        });
    }

    next();
};

/**
 * Optional authentication - attaches user if token present but doesn't require it
 */
const optionalAuth = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return next();
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (!err) {
            req.user = user;
        }
        next();
    });
};

/**
 * Generate JWT token for user
 */
const generateToken = (user) => {
    return jwt.sign(
        {
            userId: user.userId,
            email: user.email,
            subscriptionTier: user.subscriptionTier,
            subscriptionExpiry: user.subscriptionExpiry
        },
        JWT_SECRET,
        { expiresIn: '7d' }
    );
};

module.exports = {
    authenticateToken,
    requirePremium,
    optionalAuth,
    generateToken,
    JWT_SECRET
};
