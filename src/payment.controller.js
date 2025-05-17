// src/payment.controller.js
const crypto = require('crypto');
const kafka = require('./kafka');
const userService = require('./user.service');
require('dotenv').config();

const RAZORPAY_WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET;

/**
 * Verify Razorpay webhook signature
 * @param {string} bodyRaw - raw request body string
 * @param {string} signature - value of 'x-razorpay-signature' header
 * @returns {boolean}
 */
function verifySignature(bodyRaw, signature) {
    const expectedSignature = crypto
        .createHmac('sha256', RAZORPAY_WEBHOOK_SECRET)
        .update(bodyRaw)
        .digest('hex');
    return expectedSignature === signature;
}

const handleRazorpayWebhook = async (req, res) => {
    try {
        const signature = req.headers['x-razorpay-signature'];
        const bodyRaw = JSON.stringify(req.body); // raw string for verification

        if (!verifySignature(bodyRaw, signature)) {
            console.warn('⚠️ Invalid Razorpay webhook signature');
            return res.status(400).json({ error: 'Invalid signature' });
        }

        const event = req.body;

        console.log('📩 Received Razorpay webhook:', event);

        // Extract payment info
        const paymentId = event.payload?.payment?.entity?.id;
        const userId = event.payload?.payment?.entity?.notes?.user_id;

        if (!paymentId || !userId) {
            return res.status(400).json({ error: 'Invalid webhook payload' });
        }

        // Simulate updating user record
        await userService.markPaymentSuccess(userId, paymentId);

        // Send to Kafka topic
        await kafka.producePaymentSuccess({
            userId,
            paymentId,
            eventType: event.event,
            receivedAt: new Date().toISOString(),
        });

        return res.status(200).json({ status: 'Webhook handled successfully' });
    } catch (error) {
        console.error('❌ Error handling webhook:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
};

module.exports = {
    handleRazorpayWebhook,
};
