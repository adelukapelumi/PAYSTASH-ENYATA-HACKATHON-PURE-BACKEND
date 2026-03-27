require('dotenv').config();

const INTERSWITCH_API_BASE = 'https://sandbox.interswitchng.com/api/v1'; // Example sandbox URL
const MOCK_MODE = process.env.MOCK_MODE === 'true';

const fundWallet = async (amount, paymentDetails) => {
    if (MOCK_MODE) {
        console.log(`[MOCK] Interswitch Collection: Funding wallet with NGN ${amount}`);
        // Simulate network delay
        await new Promise(res => setTimeout(res, 500));
        return { success: true, transactionId: `MOCK_FUND_${Date.now()}` };
    }

    try {
        const response = await fetch(`${INTERSWITCH_API_BASE}/collections`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.INTERSWITCH_TOKEN || 'DUMMY_TOKEN'}`
            },
            body: JSON.stringify({ amount, ...paymentDetails })
        });
        const data = await response.json();
        return { success: response.ok, ...data };
    } catch (error) {
        console.error("Interswitch fundWallet error", error);
        throw error;
    }
};

const payout = async (amount, bankDetails) => {
    if (MOCK_MODE) {
        console.log(`[MOCK] Interswitch NIP Payout: Transferring NGN ${amount} to ${bankDetails?.accountNumber || 'unknown account'}`);
        // Simulate network delay
        await new Promise(res => setTimeout(res, 500));
        return { success: true, transactionId: `MOCK_PAYOUT_${Date.now()}` };
    }

    try {
        const response = await fetch(`${INTERSWITCH_API_BASE}/transfers`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.INTERSWITCH_TOKEN || 'DUMMY_TOKEN'}`
            },
            body: JSON.stringify({ amount, ...bankDetails })
        });
        const data = await response.json();
        return { success: response.ok, ...data };
    } catch (error) {
        console.error("Interswitch payout error", error);
        throw error;
    }
};

module.exports = {
    fundWallet,
    payout
};
