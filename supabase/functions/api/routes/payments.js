const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { updateUser, getUserById } = require('../services/dataStorage');
const {
    createSubscriptionPayment,
    createOneTimePayment,
    verifyITN,
    cancelSubscription,
    PRICING
} = require('../services/payment');

/**
 * POST /payments/create-checkout
 * Create PayFast payment form data
 */
router.post('/create-checkout', authenticateToken, async (req, res) => {
    try {
        const { type } = req.body; // 'subscription' or 'one-time'
        const user = await getUserById(req.user.userId);

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        const backendUrl = process.env.BACKEND_URL || 'http://localhost:8080';

        const returnUrl = `${frontendUrl}/payment-success`;
        const cancelUrl = `${frontendUrl}/pricing`;
        const notifyUrl = `${backendUrl}/payments/notify`;

        let paymentData;
        if (type === 'subscription') {
            paymentData = createSubscriptionPayment(
                user.userId,
                user.email,
                returnUrl,
                cancelUrl,
                notifyUrl
            );
        } else {
            paymentData = createOneTimePayment(
                user.userId,
                user.email,
                returnUrl,
                cancelUrl,
                notifyUrl
            );
        }

        res.json(paymentData);
    } catch (error) {
        console.error('Create checkout error:', error);
        res.status(500).json({ error: 'Failed to create checkout', message: error.message });
    }
});

/**
 * POST /payments/notify
 * Handle PayFast ITN (Instant Transaction Notification)
 */
router.post('/notify', express.urlencoded({ extended: true }), async (req, res) => {
    try {
        console.log('PayFast ITN received:', req.body);

        const verification = verifyITN(req.body, req.headers);

        if (!verification.valid) {
            console.log('Invalid ITN or incomplete payment:', verification.status);
            return res.status(200).send('OK'); // Still return 200 to PayFast
        }

        const { userId, paymentType, amount } = verification;

        if (paymentType === 'premium_lifetime' || paymentType === 'subscription') {
            // Activate premium lifetime access (no expiry)
            await updateUser(userId, {
                subscriptionTier: 'premium',
                subscriptionExpiry: null, // Lifetime access - no expiry
                payfastToken: verification.payfastId
            });

            console.log('Premium lifetime access activated for user:', userId);
        } else if (paymentType === 'per_scan') {
            // Add scan credits
            const user = await getUserById(userId);
            const currentCredits = user.scanCredits || 0;

            await updateUser(userId, {
                scanCredits: currentCredits + 1
            });

            console.log('Scan credit added for user:', userId);
        }

        res.status(200).send('OK');
    } catch (error) {
        console.error('ITN processing error:', error);
        res.status(200).send('OK'); // Still return 200 to prevent retries
    }
});

/**
 * GET /payments/subscription-status
 * Get current subscription status
 */
router.get('/subscription-status', authenticateToken, async (req, res) => {
    try {
        const user = await getUserById(req.user.userId);

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const isActive = user.subscriptionTier !== 'free' &&
            (!user.subscriptionExpiry || new Date(user.subscriptionExpiry) > new Date());

        res.json({
            subscriptionTier: user.subscriptionTier,
            subscriptionExpiry: user.subscriptionExpiry,
            scanCredits: user.scanCredits || 0,
            isActive
        });
    } catch (error) {
        console.error('Subscription status error:', error);
        res.status(500).json({ error: 'Failed to get subscription status', message: error.message });
    }
});

/**
 * POST /payments/cancel-subscription
 * Cancel current subscription
 */
router.post('/cancel-subscription', authenticateToken, async (req, res) => {
    try {
        const user = await getUserById(req.user.userId);

        if (!user || !user.payfastToken) {
            return res.status(404).json({ error: 'No active subscription found' });
        }

        await cancelSubscription(user.payfastToken);

        res.json({
            message: 'Subscription cancellation requested',
            note: 'Your subscription will remain active until the end of the current billing period'
        });
    } catch (error) {
        console.error('Cancel subscription error:', error);
        res.status(500).json({ error: 'Failed to cancel subscription', message: error.message });
    }
});

/**
 * GET /payments/pricing
 * Get pricing information
 */
router.get('/pricing', (req, res) => {
    res.json({
        subscription: {
            amount: PRICING.premium.amount,
            currency: PRICING.premium.currency,
            interval: PRICING.premium.interval,
            features: [
                'Unlimited contract scans forever',
                'AI-powered letter generation',
                'Full contract advice library',
                'Lifetime access - no recurring fees',
                'Priority support'
            ]
        },
        perScan: {
            amount: PRICING.perScan.amount,
            currency: PRICING.perScan.currency,
            features: [
                'Single contract scan',
                'Full red flag analysis',
                'Contract type-specific insights'
            ]
        }
    });
});

module.exports = router;
