require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');

const sessionRoute    = require('./routes/session');
const spinRoute       = require('./routes/spin');
const paymentRoute    = require('./routes/payment');
const withdrawalRoute = require('./routes/withdrawal');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
  crossOriginOpenerPolicy: false,
  crossOriginResourcePolicy: false,
  frameguard: false,
}));

app.use(cors({ origin: '*' }));

app.use((req, res, next) => {
  res.removeHeader('X-Frame-Options');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  res.setHeader('Cross-Origin-Embedder-Policy', 'unsafe-none');
  res.setHeader('Cross-Origin-Opener-Policy', 'unsafe-none');
  next();
});

app.use(express.json());
app.use(express.static(path.join(__dirname, '../../frontend/public')));

app.use('/api', sessionRoute);
app.use('/api', spinRoute);
app.use('/api', paymentRoute);
app.use('/api', withdrawalRoute);

app.get('/api/config', (req, res) => res.json({
  sandbox: false,
  piSandbox: process.env.PI_SANDBOX === 'true',
  spinCost: parseFloat(process.env.SPIN_COST || '0.1'),
}));

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.post('/api/log', (req, res) => {
  console.log('=== CLIENT LOG ===', JSON.stringify(req.body));
  res.json({ ok: true });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../../frontend/public/index.html'));
});

app.listen(PORT, () => {
  console.log(`\n🎰  Pi Arcade running at http://localhost:${PORT}`);
  console.log(`    Mode: ${process.env.NODE_ENV || 'development'}`);
  console.log(`    Pi Sandbox: ${process.env.PI_SANDBOX}`);
});
