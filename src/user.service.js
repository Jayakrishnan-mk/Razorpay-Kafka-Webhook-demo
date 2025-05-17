// src/userService.js

// Simulate a simple in-memory user database
const usersDB = new Map();

// Initialize a few users for demo
usersDB.set('user_1', { id: 'user_1', name: 'Alice', payments: [] });
usersDB.set('user_2', { id: 'user_2', name: 'Bob', payments: [] });

/**
 * Simulates updating the user record to mark payment success.
 * @param {string} userId
 * @param {string} paymentId
 * @returns {Promise<void>}
 */
async function markPaymentSuccess(userId, paymentId) {
    return new Promise((resolve, reject) => {
        const user = usersDB.get(userId);
        if (!user) {
            return reject(new Error(`User with id ${userId} not found`));
        }

        // Add paymentId to user's payments
        user.payments.push({ paymentId, status: 'success', date: new Date().toISOString() });

        console.log(`✅ Payment ${paymentId} marked successful for user ${userId}`);

        resolve();
    });
}

module.exports = {
    markPaymentSuccess,
};
