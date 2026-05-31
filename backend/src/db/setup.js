const pool = require('./pool');

async function setup() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        pi_user_id   TEXT PRIMARY KEY,
        username     TEXT NOT NULL,
        balance      NUMERIC(12,4) NOT NULL DEFAULT 0,
        total_spins  INTEGER NOT NULL DEFAULT 0,
        total_won    NUMERIC(12,4) NOT NULL DEFAULT 0,
        total_spent  NUMERIC(12,4) NOT NULL DEFAULT 0,
        created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        last_active  TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS spins (
        id           SERIAL PRIMARY KEY,
        user_id      TEXT NOT NULL REFERENCES users(pi_user_id),
        cost         NUMERIC(12,4) NOT NULL DEFAULT 0,
        paid_with    TEXT NOT NULL DEFAULT 'pi' CHECK (paid_with IN ('pi','ads')),
        symbols      JSONB NOT NULL,
        result       TEXT NOT NULL CHECK (result IN ('jackpot','big','medium','small','lose')),
        payout       NUMERIC(12,4) NOT NULL DEFAULT 0,
        payment_id   TEXT,
        created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS withdrawals (
        id           SERIAL PRIMARY KEY,
        user_id      TEXT NOT NULL REFERENCES users(pi_user_id),
        amount       NUMERIC(12,4) NOT NULL,
        status       TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','completed','failed')),
        payment_id   TEXT,
        created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS payment_records (
        payment_id   TEXT PRIMARY KEY,
        user_id      TEXT NOT NULL REFERENCES users(pi_user_id),
        amount       NUMERIC(12,4) NOT NULL,
        memo         TEXT,
        txid         TEXT,
        status       TEXT NOT NULL DEFAULT 'approved'
          CHECK (status IN ('approved','completed','cancelled','failed')),
        consumed_at  TIMESTAMPTZ,
        created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS house (
        id           SERIAL PRIMARY KEY,
        date         DATE NOT NULL UNIQUE DEFAULT CURRENT_DATE,
        total_in     NUMERIC(12,4) NOT NULL DEFAULT 0,
        total_out    NUMERIC(12,4) NOT NULL DEFAULT 0,
        profit       NUMERIC(12,4) NOT NULL DEFAULT 0
      );
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_spins_user ON spins(user_id);
      CREATE INDEX IF NOT EXISTS idx_spins_date ON spins(created_at);
      CREATE UNIQUE INDEX IF NOT EXISTS idx_spins_payment_unique
        ON spins(payment_id)
        WHERE payment_id IS NOT NULL;
      CREATE INDEX IF NOT EXISTS idx_payment_records_user ON payment_records(user_id);
    `);

    await client.query('COMMIT');
    console.log('✅  Tablas creadas correctamente.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌  Error:', err.message);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

setup().catch(() => process.exit(1));
