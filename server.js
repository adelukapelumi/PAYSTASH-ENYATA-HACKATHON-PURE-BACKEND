const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const auth = require('./middleware/auth');
const User = require('./models/User');
const interswitchService = require('./services/interswitchService');

const app = express();

// Standard Middleware
app.use(cors({ origin: '*' }));
app.use(express.json());

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('MongoDB connected successfully for PayStash'))
    .catch(err => console.error('MongoDB connection error:', err));

// Route Mounting
app.use('/api/auth', require('./routes/auth'));
app.use('/api/wallet', require('./routes/wallet'));
app.use('/api/sync', require('./routes/sync'));

/**
 * Explicit Alias for Interswitch-specific demo routes
 * Maps /api/interswitch/fund to our wallet funding logic
 */
app.use('/api/interswitch', require('./routes/wallet'));

/**
 * NEW: Demo routes for Frontend Co-Founder (Interswitch Mocking)
 */

// POST /api/wallet/topup
app.post('/api/wallet/topup', auth, async (req, res) => {
    const { amount, cardNumber, expiry, cvv } = req.body;
    try {
        const response = await interswitchService.pay(amount, { cardNumber, expiry, cvv });
        if (response.success) {
            await User.findByIdAndUpdate(req.user.id, { $inc: { walletBalance: amount } });
            return res.json({ msg: 'Top-up successful', balance_update: true, ...response });
        }
        res.status(400).json({ msg: 'Payment failed' });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

// POST /api/wallet/withdraw
app.post('/api/wallet/withdraw', auth, async (req, res) => {
    const { amount, accountNumber, bankCode } = req.body;
    try {
        const user = await User.findById(req.user.id);
        if (user.walletBalance < amount) return res.status(400).json({ msg: 'Insufficient funds' });
        
        const response = await interswitchService.transfer(amount, { accountNumber, bankCode });
        if (response.success) {
            user.walletBalance -= amount;
            await user.save();
            return res.json({ msg: 'Withdrawal successful', balance_update: true, ...response });
        }
        res.status(400).json({ msg: 'Withdrawal failed' });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

// POST /api/identity/verify
app.post('/api/identity/verify', auth, async (req, res) => {
    const { bvn, nin } = req.body;
    try {
        const response = await interswitchService.verifyIdentity(bvn, nin);
        if (response.success) {
            await User.findByIdAndUpdate(req.user.id, { isVerified: true });
            return res.json({ msg: 'Identity verified', profile_update: true, ...response });
        }
        res.status(400).json({ msg: 'Verification failed' });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

// Initial route
app.get('/', (req, res) => {
    res.json({
        message: 'PayStash Backend is active',
        status: 'demo-ready',
        routes: [
            '/api/auth/register',
            '/api/auth/login',
            '/api/wallet/balance',
            '/api/wallet/fund',
            '/api/interswitch/fund',
            '/api/sync/reconcile'
        ]
    });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`========================================`);
    console.log(`PayStash Server running on port ${PORT}`);
    console.log(`Ready for Offline Sync and Interswitch Demo`);
    console.log(`========================================`);
});
