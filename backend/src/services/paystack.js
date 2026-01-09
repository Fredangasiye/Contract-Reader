const axios = require('axios');
const crypto = require('crypto');

/**
 * Paystack Payment Service
 */

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY || 'sk_test_mock_key';
const PAYSTACK_BASE_URL = 'https://api.paystack.co';

const PRICING = {
    premium: {
        amount: 15000, // R150.00 (Paystack uses kobo/cents, so multiply by 100)
        currency: 'ZAR'
    },
    perScan: {
        amount: 1000, // R10.00
        currency: 'ZAR'
    }
};

/**
 * Initialize a transaction
 * @param {string} email - User email
 * @param {number} amount - Amount in cents (ZAR)
 * @param {Object} metadata - Custom metadata (userId, type)
 * @returns {Promise<Object>} - Paystack response with authorization_url
 */
async function initializeTransaction(email, amount, metadata) {
    try {
        const response = await axios.post(
            `${PAYSTACK_BASE_URL}/transaction/initialize`,
            {
                email,
                amount,
                currency: 'ZAR',
                metadata,
                callback_url: `${process.env.FRONTEND_URL}/payment-success`
            },
            {
                headers: {
                    Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        return response.data.data;
    } catch (error) {
        console.error('Paystack initialize error:', error.response?.data || error.message);
        throw new Error(error.response?.data?.message || 'Failed to initialize Paystack transaction');
    }
}

/**
 * Verify Paystack Webhook Signature
 * @param {string} signature - x-paystack-signature header
 * @param {Object} body - Request body
 * @returns {boolean}
 */
function verifyWebhook(signature, body) {
    const hash = crypto
        .createHmac('sha512', PAYSTACK_SECRET_KEY)
        .update(JSON.stringify(body))
        .digest('hex');

    return hash === signature;
}

module.exports = {
    initializeTransaction,
    verifyWebhook,
    PRICING
};
