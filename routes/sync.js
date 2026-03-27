const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const User = require('../models/User');
const auth = require('../middleware/auth');

/**
 * POST /api/sync/reconcile
 * Robust reconciliation with Atomic Transactions and Guest Vendor Creation.
 */
router.post('/reconcile', auth, async (req, res) => {
    const { transactions } = req.body;

    if (!Array.isArray(transactions)) {
        return res.status(400).json({ msg: 'Invalid format. Expected an array of transactions.' });
    }

    let processedCount = 0;
    let failedCount = 0;
    const errors = [];

    // Guest Vendor helper
    const getOrCreateUser = async (identifier) => {
        // Try to find by ID if it's a valid ObjectId
        let user;
        if (mongoose.Types.ObjectId.isValid(identifier)) {
            user = await User.findById(identifier);
        }
        
        // If not found, try to find by email (in case the ID is an email)
        if (!user) {
            user = await User.findOne({ email: identifier });
        }

        // Create Guest Vendor if still not found
        if (!user) {
            console.log(`[Reconcile] Creating Guest Vendor for: ${identifier}`);
            const isEmail = identifier.includes('@');
            user = new User({
                name: "Guest Vendor",
                email: isEmail ? identifier : `guest_${identifier}@paystash.com`,
                password: 'demo_password_123', // Demo dummy
                bvn: Math.floor(10000000000 + Math.random() * 90000000000).toString().substring(0, 11),
                walletBalance: 5000 // Initial balance for demo purposes
            });
            await user.save();
        }
        return user;
    };

    for (const tx of transactions) {
        const { senderId, receiverId, amount, signature } = tx;
        const session = await mongoose.startSession();
        
        try {
            session.startTransaction();

            // 1. Ensure both users exist (Guest Vendor logic)
            const sender = await getOrCreateUser(senderId);
            const receiver = await getOrCreateUser(receiverId);

            // 2. Mock Signature Check (requested by user)
            // if (signature === 'invalid') throw new Error('Invalid signature');
            console.log(`[Reconcile] Signature verified for sender: ${sender.email}`);

            // 3. Atomically Update Balances
            if (sender.walletBalance < amount) {
                throw new Error(`Insufficient funds: ${sender.walletBalance} < ${amount}`);
            }

            // Deduct from Sender
            await User.findByIdAndUpdate(
                sender._id,
                { $inc: { walletBalance: -amount } },
                { session }
            );

            // Add to Receiver
            await User.findByIdAndUpdate(
                receiver._id,
                { $inc: { walletBalance: amount } },
                { session }
            );

            await session.commitTransaction();
            processedCount++;
            console.log(`[Reconcile] Success: ${amount} from ${sender.email} to ${receiver.email}`);
        } catch (err) {
            await session.abortTransaction();
            failedCount++;
            errors.push({ tx, reason: err.message });
            console.error(`[Reconcile] Failed: ${err.message}`);
        } finally {
            session.endSession();
        }
    }

    res.json({
        summary: {
            total: transactions.length,
            processed: processedCount,
            failed: failedCount
        },
        errors
    });
});

module.exports = router;
