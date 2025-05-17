// __tests__/payment.controller.test.js
const request = require('supertest');
const express = require('express');
const bodyParser = require('body-parser');
const crypto = require('crypto');

// Create an express app for testing
const app = express();
app.use(bodyParser.json());

// Mock env
process.env.RAZORPAY_WEBHOOK_SECRET = 'test_secret';

// Mock modules before requiring the controller
jest.mock('../src/user.service.js', () => ({
    markPaymentSuccess: jest.fn().mockResolvedValue(),
}));
jest.mock('../src/kafka.js', () => ({
    producePaymentSuccess: jest.fn().mockResolvedValue(),
}));

const controller = require('../src/payment.controller');
app.post('/webhook/razorpay', controller.handleRazorpayWebhook);

describe('payment.controller', () => {
    const payload = {
        entity: 'event',
        event: 'payment.captured',
        payload: {
            payment: {
                entity: {
                    id: 'pay_test123',
                    notes: { user_id: 'user_1' },
                },
            },
        },
    };

    // Helper to generate signature
    function genSignature(body) {
        return crypto
            .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET)
            .update(body)
            .digest('hex');
    }

    it('should return 400 for invalid signature', async () => {
        await request(app)
            .post('/webhook/razorpay')
            .set('x-razorpay-signature', 'bad_sig')
            .send(payload)
            .expect(400)
            .expect(res => {
                expect(res.body.error).toBe('Invalid signature');
            });
    });

    it('should process valid webhook and return 200', async () => {
        const bodyStr = JSON.stringify(payload);
        const sig = genSignature(bodyStr);

        await request(app)
            .post('/webhook/razorpay')
            .set('x-razorpay-signature', sig)
            .send(payload)
            .expect(200)
            .expect(res => {
                expect(res.body.status).toBe('Webhook handled successfully');
            });
    });

    it('should return 400 for missing fields', async () => {
        const badPayload = { foo: 'bar' };
        const sig = genSignature(JSON.stringify(badPayload));

        await request(app)
            .post('/webhook/razorpay')
            .set('x-razorpay-signature', sig)
            .send(badPayload)
            .expect(400)
            .expect(res => {
                expect(res.body.error).toBe('Invalid webhook payload');
            });
    });
});
