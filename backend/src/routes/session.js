const express = require('express');
const router = express.Router();
const pool = require('../db/pool');

router.post('/session', async (req, res) => {
  const { pi_user_id, username } = req.body;
  if (!pi_user_id || !username) return res.status(400).json({ error: 'Missing fields.' });

  try {
    await pool.query(`
      INSERT INTO users (pi_user_id, username, last_active)
      VALUES ($1, $2, NOW())
      ON CONFLICT (pi_user_id) DO UPDATE SET username=$2, last_active=NOW()
    `, [pi_user_id, username]);

    const { rows } = await pool.query(
      'SELECT pi_user_id, username, balance, total_spins, total_won FROM users WHERE pi_user_id=$1',
      [pi_user_id]
    );

    res.json({ user: rows[0] });
  } catch (err) {
    console.error('Session error:', err.message);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

module.exports = router;
