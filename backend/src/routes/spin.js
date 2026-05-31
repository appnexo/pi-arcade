const express = require('express');
const router = express.Router();
const pool = require('../db/pool');
const { spin, calculatePayout } = require('../services/slotsEngine');

const SPIN_COST = parseFloat(process.env.SPIN_COST || '0.1');

// POST /api/spin — paid with Pi (after payment verified)
router.post('/spin', async (req, res) => {
  const { pi_user_id, paid_with, payment_id } = req.body;
  if (!pi_user_id) return res.status(400).json({ error: 'Missing pi_user_id.' });

  const validMethods = ['pi', 'ads'];
  if (!validMethods.includes(paid_with)) return res.status(400).json({ error: 'Invalid paid_with.' });

  try {
    const cost = paid_with === 'ads' ? 0 : SPIN_COST;
    const { reels, result } = spin();
    const payout = calculatePayout(result, SPIN_COST);

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      if (paid_with === 'pi') {
        if (!payment_id) {
          await client.query('ROLLBACK');
          return res.status(400).json({ error: 'Missing payment_id.' });
        }

        const paymentRecord = await client.query(`
          SELECT status, consumed_at
          FROM payment_records
          WHERE payment_id = $1 AND user_id = $2
          FOR UPDATE
        `, [payment_id, pi_user_id]);

        if (!paymentRecord.rows[0]) {
          await client.query('ROLLBACK');
          return res.status(402).json({ error: 'Payment was not approved by this app.' });
        }

        if (paymentRecord.rows[0].status !== 'completed') {
          await client.query('ROLLBACK');
          return res.status(402).json({ error: 'Payment is not completed yet.' });
        }

        if (paymentRecord.rows[0].consumed_at) {
          await client.query('ROLLBACK');
          return res.status(409).json({ error: 'Payment already used.' });
        }
      }

      await client.query(`
        INSERT INTO spins (user_id, cost, paid_with, symbols, result, payout, payment_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [pi_user_id, cost, paid_with, JSON.stringify(reels.map(r => r.id)), result, payout, payment_id || null]);

      if (paid_with === 'pi') {
        await client.query(`
          UPDATE payment_records
          SET consumed_at = NOW(), updated_at = NOW()
          WHERE payment_id = $1
        `, [payment_id]);
      }

      // Update user balance
      await client.query(`
        UPDATE users SET
          balance = balance + $1,
          total_spins = total_spins + 1,
          total_won = total_won + $2,
          total_spent = total_spent + $3,
          last_active = NOW()
        WHERE pi_user_id = $4
      `, [payout, payout, cost, pi_user_id]);

      // Update house ledger
      const profit = cost - payout;
      await client.query(`
        INSERT INTO house (date, total_in, total_out, profit)
        VALUES (CURRENT_DATE, $1, $2, $3)
        ON CONFLICT (date) DO UPDATE SET
          total_in  = house.total_in  + $1,
          total_out = house.total_out + $2,
          profit    = house.profit    + $3
      `, [cost, payout, profit]);

      await client.query('COMMIT');
    } catch(err) {
      await client.query('ROLLBACK');
      if (err.code === '23505') return res.status(409).json({ error: 'Payment already used.' });
      throw err;
    } finally {
      client.release();
    }

    const { rows } = await pool.query('SELECT balance FROM users WHERE pi_user_id=$1', [pi_user_id]);

    res.json({ reels, result, payout, balance: parseFloat(rows[0].balance) });
  } catch (err) {
    console.error('Spin error:', err.message);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

module.exports = router;
