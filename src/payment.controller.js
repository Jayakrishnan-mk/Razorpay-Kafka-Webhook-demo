// src/payment.controller.js

const Razorpay = require('razorpay');
const crypto = require('crypto');
const kafka = require('./kafka');
const userService = require('./user.service');
require('dotenv').config();

const {
    RAZORPAY_KEY_ID,
    RAZORPAY_KEY_SECRET,
    RAZORPAY_WEBHOOK_SECRET,
} = process.env;

// Initialize Razorpay client
const razorpay = new Razorpay({
    key_id: RAZORPAY_KEY_ID,
    key_secret: RAZORPAY_KEY_SECRET,
});


async function initiatePayment(req, res) {
    try {
        const { amount, currency = 'INR', receipt, userId } = req.body;
        if (!amount || !receipt || !userId) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Create an Order in Razorpay
        const options = {
            amount: amount * 100,            // amount in smallest unit (paisa)
            currency,
            receipt,
            notes: { user_id: userId },      // pass userId for later mapping
        };
        const order = await razorpay.orders.create(options);

        return res.status(201).json({
            orderId: order.id,
            amount: order.amount,
            currency: order.currency,
            receipt: order.receipt,
        });
    } catch (err) {
        console.error('❌ Error creating Razorpay order:', err);
        return res.status(500).json({ error: 'Could not initiate payment' });
    }
}


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
    initiatePayment,
};
