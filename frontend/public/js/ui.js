const UI = (() => {
  let _toastTimer = null;

  function showToast(msg, duration = 4000) {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(_toastTimer);
    if (duration > 0) _toastTimer = setTimeout(() => t.classList.remove('show'), duration);
  }

  function showModal(id) { document.getElementById(id).style.display = 'flex'; }
  function hideModal(id) { document.getElementById(id).style.display = 'none'; }

  function updateBalance(balance) {
    document.getElementById('balance').textContent = parseFloat(balance).toFixed(4) + ' π';
    document.getElementById('withdrawAvail').textContent = parseFloat(balance).toFixed(4) + ' π';
  }

  function updateStats(spins, won) {
    document.getElementById('totalSpins').textContent = spins;
    document.getElementById('totalWon').textContent = parseFloat(won).toFixed(4) + ' π';
  }

  function updateUser(user) {
    document.getElementById('username').textContent = '@' + user.username;
    updateBalance(user.balance);
    updateStats(user.total_spins, user.total_won);
  }

  function showResult(result, payout, cost) {
    const el = document.getElementById('resultMsg');
    el.className = 'result-msg ' + result;
    const msgs = {
      jackpot: `🔥 JACKPOT! +${payout.toFixed(4)} π`,
      big:     `💎 BIG WIN! +${payout.toFixed(4)} π`,
      medium:  `🌕 Nice! +${payout.toFixed(4)} π`,
      small:   `✨ Winner! +${payout.toFixed(4)} π`,
      lose:    `No luck this time...`,
    };
    el.textContent = msgs[result] || '';
  }

  function spinReels(finalSymbols, callback) {
    const reelEls = [
      document.getElementById('reel0'),
      document.getElementById('reel1'),
      document.getElementById('reel2'),
    ];

    const allEmojis = ['π','🖥️','⛏️','🌕','💎','🔥'];
    
    reelEls.forEach(r => r.classList.add('spinning'));

    let elapsed = 0;
    const interval = setInterval(() => {
      reelEls.forEach(r => {
        r.textContent = allEmojis[Math.floor(Math.random() * allEmojis.length)];
      });
      elapsed += 80;
      if (elapsed >= 1200) {
        clearInterval(interval);
        reelEls.forEach((r, i) => {
          r.classList.remove('spinning');
          r.textContent = finalSymbols[i];
        });
        if (callback) callback();
      }
    }, 80);
  }

  function setSpinning(spinning) {
    const btn = document.getElementById('btnSpin');
    const ads = document.getElementById('btnAds');
    btn.disabled = spinning;
    ads.disabled = spinning;
    btn.textContent = spinning ? '⏳ Spinning...' : '🎰 SPIN — 0.1 π';
  }

  return { showToast, showModal, hideModal, updateBalance, updateUser, showResult, spinReels, setSpinning, updateStats };
})();
