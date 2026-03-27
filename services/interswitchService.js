const interswitchApi = require('./interswitchApi');
require('dotenv').config();

const MOCK_MODE = process.env.MOCK_INTERSWITCH === 'true';

/**
 * Interswitch Service Wrapper
 * Handles Mocking vs. Real API Logic
 */
const interswitchService = {
    /**
     * Top-up / Payment Logic
     */
    pay: async (amount, paymentDetails) => {
        if (MOCK_MODE) {
            console.log(`[MOCK INTERSWITCH] Processing top-up of ${amount}`);
            await new Promise(resolve => setTimeout(resolve, 1000));
            return {
                status: 200,
                success: true,
                transactionReference: `ISW_MOCK_${Date.now()}`,
                message: 'Payment Successful'
            };
        }
        
        // Real API Call
        const response = await interswitchApi.initiatePayment(amount);
        return response.data;
    },

    /**
     * Withdrawal / NIP Transfer Logic
     */
    transfer: async (amount, bankDetails) => {
        if (MOCK_MODE) {
            console.log(`[MOCK INTERSWITCH] Processing withdrawal of ${amount}`);
            await new Promise(resolve => setTimeout(resolve, 1000));
            return {
                status: 200,
                success: true,
                transactionReference: `ISW_MOCK_TR_${Date.now()}`,
                message: 'Transfer Successful'
            };
        }
        
        // Real API Call
        const { account, bankCode } = bankDetails;
        const response = await interswitchApi.sendNIPTransfer(account, bankCode, amount);
        return response.data;
    },

    /**
     * Identity / BVN Verification Logic
     */
    verifyIdentity: async (bvn, nin) => {
        if (MOCK_MODE) {
            console.log(`[MOCK INTERSWITCH] Verifying identity for BVN: ${bvn}`);
            await new Promise(resolve => setTimeout(resolve, 1000));
            return {
                status: 200,
                success: true,
                message: 'Identity Verified Successfully'
            };
        }
        
        // Real API Call
        const response = await interswitchApi.verifyCustomer(bvn);
        return response.data;
    }
};

module.exports = interswitchService;
