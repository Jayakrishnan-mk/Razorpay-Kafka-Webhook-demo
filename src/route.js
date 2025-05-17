// routes.js
const express = require('express');
const router = express.Router();
const controller = require('./payment.controller');

// Razorpay will send POST requests to this endpoint
router.post('/razorpay', controller.handleRazorpayWebhook);

module.exports = router;
