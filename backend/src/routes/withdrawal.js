const express = require('express');
const router = express.Router();
const pool = require('../db/pool');
const { createAppToUserPayment, isSandbox } = require('../services/piService');

const MIN_WITHDRAWAL = 0.5;

router.post('/withdraw', async (req, res) => {
  const { pi_user_id, amount } = req.body;
  const amt = parseFloat(amount);

  if (!pi_user_id || !amt) return res.status(400).json({ error: 'Missing fields.' });
  if (amt < MIN_WITHDRAWAL) return res.status(400).json({ error: `Minimum withdrawal is ${MIN_WITHDRAWAL} π` });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows } = await client.query(
      'SELECT balance FROM users WHERE pi_user_id=$1 FOR UPDATE',
      [pi_user_id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'User not found.' });

    const balance = parseFloat(rows[0].balance);
    if (balance < amt) return res.status(400).json({ error: 'Insufficient balance.' });

    await client.query(
      'UPDATE users SET balance = balance - $1 WHERE pi_user_id=$2',
      [amt, pi_user_id]
    );

    let paymentId = null;
    if (!isSandbox()) {
      const payment = await createAppToUserPayment(pi_user_id, amt, 'Pi Arcade withdrawal');
      paymentId = payment?.identifier;
    }

    await client.query(`
      INSERT INTO withdrawals (user_id, amount, status, payment_id)
      VALUES ($1, $2, $3, $4)
    `, [pi_user_id, amt, isSandbox() ? 'completed' : 'pending', paymentId]);

    await client.query('COMMIT');

    const updated = await pool.query('SELECT balance FROM users WHERE pi_user_id=$1', [pi_user_id]);
    res.json({ success: true, balance: parseFloat(updated.rows[0].balance) });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Withdraw error:', err.message);
    res.status(500).json({ error: 'Internal server error.' });
  } finally {
    client.release();
  }
});

module.exports = router;
