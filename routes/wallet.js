const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const User = require('../models/User');
const interswitchApi = require('../services/interswitchApi');

// GET /api/wallet/balance
// Fetch user's real-time wallet balance
router.get('/balance', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        if (!user) {
            return res.status(404).json({ msg: 'User not found' });
        }

        res.json({ balance: user.walletBalance });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// POST /api/wallet/fund
// Process inbound collection via Interswitch Axios Service
router.post('/fund', auth, async (req, res) => {
    try {
        const { amount } = req.body;
        
        if (!amount || amount <= 0) {
            return res.status(400).json({ msg: 'Invalid amount' });
        }

        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ msg: 'User not found' });

        // Check MOCK_MODE for local demo
        if (process.env.MOCK_MODE === 'true') {
            console.log(`[MOCK] Funding wallet with NGN ${amount}`);
            user.walletBalance += Number(amount);
            await user.save();
            return res.json({ msg: 'Deposit successful (MOCK)', balance: user.walletBalance });
        }

        const response = await interswitchApi.initiatePayment(amount);

        if (response.status === 200) {
            user.walletBalance += Number(amount);
            await user.save();
            return res.json({ msg: 'Deposit successful', balance: user.walletBalance, interswitch: response.data });
        } else {
            return res.status(400).json({ msg: 'Interswitch transaction failed', details: response.data });
        }
    } catch (err) {
        console.error('Wallet Fund Error:', err.message);
        res.status(500).send('Server error');
    }
});

// POST /api/wallet/withdraw
// Process outbound NIP transfer via Interswitch
router.post('/withdraw', auth, async (req, res) => {
    try {
        const { amount, bankDetails } = req.body;
        
        if (!amount || amount <= 0) {
            return res.status(400).json({ msg: 'Invalid amount' });
        }

        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ msg: 'User not found' });

        if (user.walletBalance < amount) {
            return res.status(400).json({ msg: 'Insufficient balance' });
        }

        // Check MOCK_MODE for local demo
        if (process.env.MOCK_MODE === 'true') {
            console.log(`[MOCK] Withdrawing wallet with NGN ${amount}`);
            user.walletBalance -= Number(amount);
            await user.save();
            return res.json({ msg: 'Withdrawal successful (MOCK)', balance: user.walletBalance });
        }

        const { account, bankCode } = bankDetails || {};
        const response = await interswitchApi.sendNIPTransfer(account, bankCode, amount);

        if (response.status === 200) {
            user.walletBalance -= Number(amount);
            await user.save();
            return res.json({ msg: 'Withdrawal successful', balance: user.walletBalance, interswitch: response.data });
        } else {
            return res.status(400).json({ msg: 'Interswitch transfer failed', details: response.data });
        }
    } catch (err) {
        console.error('Wallet Withdrawal Error:', err.message);
        res.status(500).send('Server error');
    }
});

module.exports = router;
