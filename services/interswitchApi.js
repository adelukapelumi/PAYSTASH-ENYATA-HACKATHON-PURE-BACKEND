const axios = require('axios');
const crypto = require('crypto');
require('dotenv').config();

const INTERSWITCH_CLIENT_ID = process.env.INTERSWITCH_CLIENT_ID;
const INTERSWITCH_CLIENT_SECRET = process.env.INTERSWITCH_CLIENT_SECRET;
const BASE_URL = 'https://sandbox.interswitchng.com';

// Custom Axios Instance
const interswitchClient = axios.create({
    baseURL: BASE_URL,
    timeout: 10000,
});

/**
 * Generate Interswitch Authorization Header (Signature-based)
 * Standard Sandbox signature pattern: 
 * Base64(SHA-512(METHOD + URL + TIMESTAMP + NONCE + CLIENT_ID + SECRET))
 * Note: Specific Interswitch APIs may require slightly different signature strings.
 */
function generateAuthHeaders(method, url) {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const nonce = crypto.randomBytes(16).toString('hex');
    const signatureBase = `${method.toUpperCase()}${url}${timestamp}${nonce}${INTERSWITCH_CLIENT_ID}${INTERSWITCH_CLIENT_SECRET}`;
    
    const signature = crypto.createHash('sha512').update(signatureBase).digest('base64');

    return {
        'Authorization': `InterswitchAuth ${Buffer.from(INTERSWITCH_CLIENT_ID).toString('base64')}`,
        'Timestamp': timestamp,
        'Nonce': nonce,
        'Signature': signature,
        'SignatureMethod': 'SHA512',
        'Content-Type': 'application/json'
    };
}

// Request Logger Interceptor
interswitchClient.interceptors.request.use(config => {
    const headers = generateAuthHeaders(config.method, config.baseURL + config.url);
    config.headers = { ...config.headers, ...headers };

    console.log(`[Interswitch Request] ${config.method.toUpperCase()} ${config.url}`);
    console.log(`Headers:`, config.headers);
    if (config.data) console.log(`Body:`, config.data);
    
    return config;
}, error => {
    console.error(`[Interswitch Request Error]`, error);
    return Promise.reject(error);
});

// Response Logger Interceptor
interswitchClient.interceptors.response.use(response => {
    console.log(`[Interswitch Response] ${response.status} ${response.config.url}`);
    console.log(`Data:`, response.data);
    return response;
}, error => {
    if (error.response) {
        console.error(`[Interswitch Response Error] ${error.response.status} ${error.response.config.url}`);
        console.error(`Data:`, error.response.data);
    } else {
        console.error(`[Interswitch Network Error]`, error.message);
    }
    return Promise.reject(error);
});

/**
 * KYC / Customer Verification
 */
async function verifyCustomer(bvn) {
    return interswitchClient.post('/api/v1/kyc/verify', { bvn });
}

/**
 * Payment Initiation (Collections)
 */
async function initiatePayment(amount) {
    return interswitchClient.post('/api/v1/payments/initiate', {
        amount,
        currency: 'NGN',
        paymentType: 'COLLECTION'
    });
}

/**
 * NIP Transfer (Payouts)
 */
async function sendNIPTransfer(account, bankCode, amount) {
    return interswitchClient.post('/api/v1/transfers', {
        beneficiaryAccountNumber: account,
        beneficiaryBankCode: bankCode,
        amount,
        description: 'PayStash Wallet Withdrawal'
    });
}

module.exports = {
    verifyCustomer,
    initiatePayment,
    sendNIPTransfer
};
