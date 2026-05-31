const express = require('express');
const router = express.Router();
const pool = require('../db/pool');
const { verifyPayment, approvePayment, completePayment } = require('../services/piService');

const SPIN_COST = parseFloat(process.env.SPIN_COST || '0.1');

function getPaymentUserId(payment) {
  return payment?.metadata?.user_id || payment?.metadata?.userId || payment?.user_uid;
}

function validateSpinPayment(payment, piUserId) {
  if (!payment) return 'Payment not found.';
  if (!Number.isFinite(parseFloat(payment.amount)) || parseFloat(payment.amount) < SPIN_COST) {
    return 'Payment amount is too low.';
  }
  if (payment.memo && !String(payment.memo).toLowerCase().includes('spin')) return 'Payment memo is not valid.';
  if (payment.metadata?.type && payment.metadata.type !== 'spin') return 'Payment metadata is not valid.';

  const paymentUserId = getPaymentUserId(payment);
  if (paymentUserId && paymentUserId !== piUserId) return 'Payment user does not match.';

  return null;
}

router.post('/payment/approve', async (req, res) => {
  const { pi_user_id, payment_id } = req.body;
  if (!pi_user_id || !payment_id) return res.status(400).json({ error: 'Missing fields.' });

  try {
    const payment = await verifyPayment(payment_id);
    const invalid = validateSpinPayment(payment, pi_user_id);
    if (invalid) return res.status(402).json({ error: invalid });

    await approvePayment(payment_id);

    await pool.query(`
      INSERT INTO payment_records (payment_id, user_id, amount, memo, status)
      VALUES ($1, $2, $3, $4, 'approved')
      ON CONFLICT (payment_id) DO UPDATE SET
        user_id = EXCLUDED.user_id,
        amount = EXCLUDED.amount,
        memo = EXCLUDED.memo,
        status = CASE
          WHEN payment_records.status = 'completed' THEN payment_records.status
          ELSE 'approved'
        END,
        updated_at = NOW()
    `, [payment_id, pi_user_id, payment.amount, payment.memo || null]);

    res.json({ success: true, approved: true });
  } catch (err) {
    console.error('Payment approve error:', err.response?.data || err.message);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

router.post('/payment/complete', async (req, res) => {
  const { pi_user_id, payment_id, txid } = req.body;
  if (!pi_user_id || !payment_id || !txid) return res.status(400).json({ error: 'Missing fields.' });

  try {
    const payment = await verifyPayment(payment_id);
    const invalid = validateSpinPayment(payment, pi_user_id);
    if (invalid) return res.status(402).json({ error: invalid });

    await completePayment(payment_id, txid);

    await pool.query(`
      INSERT INTO payment_records (payment_id, user_id, amount, memo, txid, status)
      VALUES ($1, $2, $3, $4, $5, 'completed')
      ON CONFLICT (payment_id) DO UPDATE SET
        user_id = EXCLUDED.user_id,
        amount = EXCLUDED.amount,
        memo = EXCLUDED.memo,
        txid = EXCLUDED.txid,
        status = 'completed',
        updated_at = NOW()
    `, [payment_id, pi_user_id, payment.amount, payment.memo || null, txid]);

    res.json({ success: true, completed: true });
  } catch (err) {
    console.error('Payment complete error:', err.response?.data || err.message);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

router.post('/payment/cancelled', async (req, res) => {
  const { payment_id } = req.body;
  if (!payment_id) return res.status(400).json({ error: 'Missing payment_id.' });

  await pool.query(`
    UPDATE payment_records
    SET status = 'cancelled', updated_at = NOW()
    WHERE payment_id = $1 AND status <> 'completed'
  `, [payment_id]);

  res.json({ success: true });
});

router.post('/payment/incomplete', async (req, res) => {
  const { payment } = req.body;
  const paymentId = payment?.identifier;
  const txid = payment?.transaction?.txid;
  const piUserId = payment?.metadata?.user_id || payment?.metadata?.userId;

  if (!paymentId || !txid || !piUserId) {
    return res.status(400).json({ error: 'Incomplete payment data.' });
  }

  try {
    await completePayment(paymentId, txid);

    await pool.query(`
      INSERT INTO payment_records (payment_id, user_id, amount, memo, txid, status)
      VALUES ($1, $2, $3, $4, $5, 'completed')
      ON CONFLICT (payment_id) DO UPDATE SET
        txid = EXCLUDED.txid,
        status = 'completed',
        updated_at = NOW()
    `, [paymentId, piUserId, payment.amount || SPIN_COST, payment.memo || null, txid]);

    res.json({ success: true, completed: true });
  } catch (err) {
    console.error('Incomplete payment error:', err.response?.data || err.message);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

module.exports = router;
