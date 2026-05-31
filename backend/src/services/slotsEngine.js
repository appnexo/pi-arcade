// ── Símbolos del ecosistema Pi ────────────────────────────────
const SYMBOLS = [
  { id: 'pi',       emoji: 'π',  weight: 30, label: 'Pi'       },
  { id: 'node',     emoji: '🖥️', weight: 20, label: 'Node'     },
  { id: 'pioneer',  emoji: '⛏️', weight: 20, label: 'Pioneer'  },
  { id: 'moon',     emoji: '🌕', weight: 15, label: 'Moon'     },
  { id: 'diamond',  emoji: '💎', weight: 10, label: 'Diamond'  },
  { id: 'fire',     emoji: '🔥', weight:  5, label: 'Fire'     },
];

const TOTAL_WEIGHT = SYMBOLS.reduce((s, sym) => s + sym.weight, 0);

// ── Payout multipliers ────────────────────────────────────────
const PAYOUTS = {
  jackpot: 20,   // 3x fire
  big:     10,   // 3x diamond
  medium:   5,   // 3x moon
  small:    2,   // 3x any other / 2x fire or diamond
  lose:     0,
};

function weightedRandom() {
  let rand = Math.random() * TOTAL_WEIGHT;
  for (const sym of SYMBOLS) {
    rand -= sym.weight;
    if (rand <= 0) return sym;
  }
  return SYMBOLS[0];
}

function spin() {
  const reels = [weightedRandom(), weightedRandom(), weightedRandom()];
  const [a, b, c] = reels;

  let result = 'lose';

  if (a.id === b.id && b.id === c.id) {
    if (a.id === 'fire')    result = 'jackpot';
    else if (a.id === 'diamond') result = 'big';
    else if (a.id === 'moon')    result = 'medium';
    else                         result = 'small';
  } else if (
    (a.id === 'fire' || a.id === 'diamond') &&
    (b.id === 'fire' || b.id === 'diamond') &&
    a.id !== b.id
  ) {
    result = 'small';
  }

  return { reels, result };
}

function calculatePayout(result, cost) {
  const multiplier = PAYOUTS[result] || 0;
  return parseFloat((cost * multiplier).toFixed(4));
}

module.exports = { SYMBOLS, PAYOUTS, spin, calculatePayout };
