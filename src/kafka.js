// src/kafka.js
const { Kafka } = require('kafkajs');

// Configure Kafka client (adjust broker list if needed)
const kafka = new Kafka({
    clientId: 'razorpay-kafka-demo',
    brokers: ['localhost:9092'], // Change if your Kafka runs elsewhere
});

const producer = kafka.producer();

async function connectProducer() {
    await producer.connect();
    console.log('⚡ Kafka producer connected');
}

// Immediately connect producer on module load
connectProducer().catch(console.error);

/**
 * Produces a payment success event to Kafka topic
 * @param {Object} paymentEvent
 * @param {string} paymentEvent.userId
 * @param {string} paymentEvent.paymentId
 * @param {string} paymentEvent.eventType
 * @param {string} paymentEvent.receivedAt
 */

async function producePaymentSuccess(paymentEvent, retries = 3) {
    try {
        await producer.send({
            topic: 'payment_success',
            messages: [
                {
                    key: paymentEvent.userId,
                    value: JSON.stringify(paymentEvent),
                },
            ],
        });

        console.log(`📤 Payment event sent to Kafka for user ${paymentEvent.userId}`);
    } catch (err) {
        if (retries > 0) {
            console.warn(`⚠️ Kafka send failed, retrying... attempts left: ${retries}`);
            await new Promise((res) => setTimeout(res, 1000)); // wait 1 sec before retry
            return producePaymentSuccess(paymentEvent, retries - 1);
        } else {
            console.error('❌ Failed to send payment event to Kafka after retries:', err);
            throw err;
        }
    }
}

module.exports = {
    producePaymentSuccess,
};
