const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { updateUser, getUserById } = require('../services/dataStorage');
const {
    initializeTransaction,
    verifyWebhook,
    PRICING
} = require('../services/paystack');

/**
 * POST /payments/create-checkout
 * Create Paystack checkout session
 */
router.post('/create-checkout', authenticateToken, async (req, res) => {
    try {
        const { type } = req.body; // 'subscription' or 'one-time'
        const user = await getUserById(req.user.userId);

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const amount = type === 'subscription' ? PRICING.premium.amount : PRICING.perScan.amount;

        const paymentData = await initializeTransaction(
            user.email,
            amount,
            {
                userId: user.userId,
                type: type
            }
        );

        // Paystack returns { authorization_url, access_code, reference }
        res.json({
            url: paymentData.authorization_url,
            data: {
                reference: paymentData.reference,
                access_code: paymentData.access_code
            }
        });
    } catch (error) {
        console.error('Create checkout error:', error);
        res.status(500).json({ error: 'Failed to create checkout', message: error.message });
    }
});

/**
 * POST /payments/notify
 * Handle Paystack Webhook
 */
router.post('/notify', express.json(), async (req, res) => {
    try {
        const signature = req.headers['x-paystack-signature'];

        if (!verifyWebhook(signature, req.body)) {
            console.error('Invalid Paystack signature');
            return res.status(400).send('Invalid signature');
        }

        const event = req.body;
        console.log('Paystack event received:', event.event);

        if (event.event === 'charge.success') {
            const { userId, type } = event.data.metadata;
            const reference = event.data.reference;

            if (type === 'subscription') {
                // Activate premium lifetime access
                await updateUser(userId, {
                    subscriptionTier: 'premium',
                    subscriptionExpiry: null,
                    payfastToken: reference // Reusing field for Paystack reference
                });
                console.log('Premium lifetime access activated for user:', userId);
            } else if (type === 'one-time') {
                // Add scan credits
                const user = await getUserById(userId);
                const currentCredits = user.scanCredits || 0;

                await updateUser(userId, {
                    scanCredits: currentCredits + 1
                });
                console.log('Scan credit added for user:', userId);
            }
        }

        res.status(200).send('OK');
    } catch (error) {
        console.error('Webhook processing error:', error);
        res.status(500).send('Internal Server Error');
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
