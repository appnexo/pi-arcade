const express = require('express');
const router = express.Router();
const { verifyPayment, completePayment, isSandbox } = require('../services/piService');

const SPIN_COST = parseFloat(process.env.SPIN_COST || '0.1');

router.post('/payment/verify', async (req, res) => {
  const { pi_user_id, payment_id } = req.body;
  console.log('payment/verify called:', { pi_user_id, payment_id });

  if (!pi_user_id || !payment_id) return res.status(400).json({ error: 'Missing fields.' });

  try {
    if (!isSandbox()) {
      const piPayment = await verifyPayment(payment_id);
      console.log('Pi payment response:', JSON.stringify(piPayment));
      if (!piPayment || parseFloat(piPayment.amount) < SPIN_COST) {
        return res.status(402).json({ error: 'Payment not valid.' });
      }
    }
    res.json({ success: true, verified: true });
  } catch (err) {
    console.error('Payment verify error:', err.message);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

router.post('/payment/complete', async (req, res) => {
  const { payment_id } = req.body;
  console.log('payment/complete called:', payment_id);
  await completePayment(payment_id);
  res.json({ success: true });
});

module.exports = router;
