const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const { createUser, getUserByEmail, getUserById, updateUser } = require('../services/dataStorage');
const { generateToken, authenticateToken } = require('../middleware/auth');

/**
 * POST /users/register
 * Register a new user
 */
router.post('/register', [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { email, password } = req.body;

        // Check if user already exists
        const existingUser = await getUserByEmail(email);
        if (existingUser) {
            return res.status(409).json({ error: 'User already exists' });
        }

        // Hash password
        const passwordHash = await bcrypt.hash(password, 10);

        // Create user
        const user = await createUser({
            email,
            passwordHash,
            subscriptionTier: 'free'
        });

        // Generate token
        const token = generateToken(user);

        res.status(201).json({
            message: 'User created successfully',
            token,
            user: {
                userId: user.userId,
                email: user.email,
                subscriptionTier: user.subscriptionTier,
                scanCount: user.scanCount
            }
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Registration failed', message: error.message });
    }
});

/**
 * POST /users/login
 * Authenticate user and return token
 */
router.post('/login', [
    body('email').isEmail().normalizeEmail(),
    body('password').exists()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { email, password } = req.body;

        // Find user
        const user = await getUserByEmail(email);
        if (!user) {
            return res.status(401).json({ error: 'Invalid email/password' });
        }

        // Verify password
        const validPassword = await bcrypt.compare(password, user.passwordHash);
        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid email/password' });
        }

        // Generate token
        const token = generateToken(user);

        res.json({
            message: 'Login successful',
            token,
            user: {
                userId: user.userId,
                email: user.email,
                subscriptionTier: user.subscriptionTier,
                subscriptionExpiry: user.subscriptionExpiry,
                scanCount: user.scanCount
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed', message: error.message });
    }
});

/**
 * GET /users/profile
 * Get current user profile
 */
router.get('/profile', authenticateToken, async (req, res) => {
    try {
        const user = await getUserById(req.user.userId);

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({
            userId: user.userId,
            email: user.email,
            subscriptionTier: user.subscriptionTier,
            subscriptionExpiry: user.subscriptionExpiry,
            scanCount: user.scanCount,
            createdAt: user.createdAt
        });
    } catch (error) {
        console.error('Profile error:', error);
        res.status(500).json({ error: 'Failed to get profile', message: error.message });
    }
});

/**
 * PUT /users/profile
 * Update user profile
 */
router.put('/profile', authenticateToken, [
    body('email').optional().isEmail().normalizeEmail()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const updates = {};
        if (req.body.email) updates.email = req.body.email;

        const updatedUser = await updateUser(req.user.userId, updates);

        if (!updatedUser) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({
            message: 'Profile updated successfully',
            user: {
                userId: updatedUser.userId,
                email: updatedUser.email,
                subscriptionTier: updatedUser.subscriptionTier,
                scanCount: updatedUser.scanCount
            }
        });
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({ error: 'Failed to update profile', message: error.message });
    }
});

module.exports = router;
