const express = require('express');
const router = express.Router();
const pool = require('../db/pool');
const { verifyUser } = require('../services/piService');

router.post('/session', async (req, res) => {
  const { authResult } = req.body;
  const accessToken = authResult?.accessToken;

  if (!accessToken) return res.status(400).json({ error: 'Missing authResult.accessToken.' });

  try {
    const me = await verifyUser(accessToken);
    const pi_user_id = me.uid || me.user?.uid || authResult.user?.uid;
    const username = me.username || me.user?.username || authResult.user?.username;

    if (!pi_user_id || !username) {
      return res.status(401).json({ error: 'User not authorized.' });
    }

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
    const status = err.response?.status === 401 ? 401 : 500;
    console.error('Session error:', err.response?.data || err.message);
    res.status(status).json({ error: status === 401 ? 'User not authorized.' : 'Internal server error.' });
  }
});

module.exports = router;
