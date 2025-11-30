const crypto = require('crypto');

/**
 * PayFast Payment Service
 * PayFast is South Africa's leading payment gateway
 */

const PAYFAST_MERCHANT_ID = process.env.PAYFAST_MERCHANT_ID || '10000100';
const PAYFAST_MERCHANT_KEY = process.env.PAYFAST_MERCHANT_KEY || '46f0cd694581a';
const PAYFAST_PASSPHRASE = process.env.PAYFAST_PASSPHRASE || '';
const PAYFAST_MODE = process.env.PAYFAST_MODE || 'sandbox'; // 'sandbox' or 'live'

const PAYFAST_HOST = PAYFAST_MODE === 'live'
    ? 'https://www.payfast.co.za/eng/process'
    : 'https://sandbox.payfast.co.za/eng/process';

const PRICING = {
    premium: {
        amount: 199.99, // R199.99 per month
        currency: 'ZAR',
        interval: 'month',
        cycles: 0 // 0 = recurring indefinitely
    },
    perScan: {
        amount: 99.99, // R99.99 per scan
        currency: 'ZAR'
    }
};

/**
 * Generate MD5 signature for PayFast
 */
function generateSignature(data, passPhrase = null) {
    // Create parameter string
    let pfOutput = '';
    for (let key in data) {
        if (data.hasOwnProperty(key)) {
            if (data[key] !== '') {
                pfOutput += `${key}=${encodeURIComponent(data[key].toString().trim()).replace(/%20/g, '+')}&`;
            }
        }
    }

    // Remove last ampersand
    let getString = pfOutput.slice(0, -1);

    if (passPhrase !== null) {
        getString += `&passphrase=${encodeURIComponent(passPhrase.trim()).replace(/%20/g, '+')}`;
    }

    return crypto.createHash('md5').update(getString).digest('hex');
}

/**
 * Create PayFast payment data for subscription
 */
function createSubscriptionPayment(userId, email, returnUrl, cancelUrl, notifyUrl) {
    const data = {
        // Merchant details
        merchant_id: PAYFAST_MERCHANT_ID,
        merchant_key: PAYFAST_MERCHANT_KEY,
        return_url: returnUrl,
        cancel_url: cancelUrl,
        notify_url: notifyUrl,

        // Buyer details
        email_address: email,

        // Transaction details
        m_payment_id: `sub_${userId}_${Date.now()}`,
        amount: PRICING.premium.amount.toFixed(2),
        item_name: 'Contract Reader Premium Subscription',
        item_description: 'Monthly subscription for unlimited scans and letter generation',

        // Subscription details
        subscription_type: 1, // 1 = subscription
        billing_date: new Date().toISOString().split('T')[0],
        recurring_amount: PRICING.premium.amount.toFixed(2),
        frequency: 3, // 3 = monthly
        cycles: PRICING.premium.cycles,

        // Custom fields
        custom_str1: userId,
        custom_str2: 'subscription'
    };

    // Generate signature
    data.signature = generateSignature(data, PAYFAST_PASSPHRASE);

    return {
        url: PAYFAST_HOST,
        data: data
    };
}

/**
 * Create PayFast payment data for one-time payment
 */
function createOneTimePayment(userId, email, returnUrl, cancelUrl, notifyUrl) {
    const data = {
        // Merchant details
        merchant_id: PAYFAST_MERCHANT_ID,
        merchant_key: PAYFAST_MERCHANT_KEY,
        return_url: returnUrl,
        cancel_url: cancelUrl,
        notify_url: notifyUrl,

        // Buyer details
        email_address: email,

        // Transaction details
        m_payment_id: `scan_${userId}_${Date.now()}`,
        amount: PRICING.perScan.amount.toFixed(2),
        item_name: 'Contract Reader - Single Scan',
        item_description: 'One-time payment for contract analysis',

        // Custom fields
        custom_str1: userId,
        custom_str2: 'per_scan'
    };

    // Generate signature
    data.signature = generateSignature(data, PAYFAST_PASSPHRASE);

    return {
        url: PAYFAST_HOST,
        data: data
    };
}

/**
 * Verify PayFast ITN (Instant Transaction Notification)
 */
function verifyITN(postData, headers) {
    // Verify signature
    const signature = postData.signature;
    delete postData.signature;

    const calculatedSignature = generateSignature(postData, PAYFAST_PASSPHRASE);

    if (signature !== calculatedSignature) {
        throw new Error('Invalid signature');
    }

    // Verify payment status
    if (postData.payment_status !== 'COMPLETE') {
        return {
            valid: false,
            status: postData.payment_status
        };
    }

    return {
        valid: true,
        userId: postData.custom_str1,
        paymentType: postData.custom_str2,
        amount: parseFloat(postData.amount_gross),
        paymentId: postData.m_payment_id,
        payfastId: postData.pf_payment_id,
        status: postData.payment_status
    };
}

/**
 * Cancel subscription (requires API credentials)
 */
async function cancelSubscription(token) {
    // Note: PayFast subscription cancellation requires merchant to do it manually
    // or use their API with special credentials
    // For now, we'll just mark it in our system
    console.log('Subscription cancellation requested for token:', token);
    return {
        message: 'Subscription will be cancelled. Please contact support if you need immediate cancellation.'
    };
}

module.exports = {
    createSubscriptionPayment,
    createOneTimePayment,
    verifyITN,
    cancelSubscription,
    PRICING,
    PAYFAST_HOST
};
