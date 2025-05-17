// routes.js
const express = require('express');
const router = express.Router();
const controller = require('./payment.controller');

// Initiate a payment (create Razorpay Order)
router.post('/payment/initiate', controller.initiatePayment);

// Razorpay will send POST requests to this endpoint
router.post('/razorpay', controller.handleRazorpayWebhook);     // webhook endpoint

module.exports = router;
