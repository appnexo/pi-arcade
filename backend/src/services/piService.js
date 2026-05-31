const axios = require('axios');
require('dotenv').config();

const PI_API_BASE = process.env.PI_SANDBOX === 'true'
  ? 'https://api.testnet.minepi.com'
  : 'https://api.minepi.com';

const headers = () => ({
  Authorization: `Key ${process.env.PI_API_KEY}`,
  'Content-Type': 'application/json',
});

async function verifyPayment(paymentId) {
  const res = await axios.get(`${PI_API_BASE}/v2/payments/${paymentId}`, { headers: headers() });
  return res.data;
}

async function completePayment(paymentId) {
  try {
    const res = await axios.post(`${PI_API_BASE}/v2/payments/${paymentId}/complete`, {}, { headers: headers() });
    return res.data;
  } catch(err) {
    console.log('completePayment error (non-fatal):', err.response?.data?.message || err.message);
    return null;
  }
}

async function createAppToUserPayment(uid, amount, memo) {
  const res = await axios.post(`${PI_API_BASE}/v2/payments`, {
    amount, memo,
    metadata: { type: 'withdrawal' },
    uid,
  }, { headers: headers() });
  return res.data;
}

function isSandbox() {
  return process.env.PI_SANDBOX === 'true';
}

module.exports = { verifyPayment, completePayment, createAppToUserPayment, isSandbox };
