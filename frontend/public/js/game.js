const SYMBOL_EMOJIS = {
  pi:      'π',
  node:    '🖥️',
  pioneer: '⛏️',
  moon:    '🌕',
  diamond: '💎',
  fire:    '🔥',
};

const Game = (() => {
  let _userId = null;
  let _spinning = false;

  function init(userId) {
    _userId = userId;
  }

  async function spin(method) {
    if (_spinning) return;
    _spinning = true;
    UI.setSpinning(true);

    try {
      if (method === 'pi') {
        await _spinWithPi();
      }
    } catch (err) {
      UI.showToast('❌ ' + err.message);
      UI.setSpinning(false);
      _spinning = false;
    }
  }

  async function _spinWithPi() {
    if (!window.Pi) {
      UI.showToast('❌ Pi SDK not available.');
      UI.setSpinning(false);
      _spinning = false;
      return;
    }

    let paymentId = null;

    try {
      await window.Pi.createPayment({
        amount: window.SPIN_COST,
        memo: 'Pi Arcade — spin',
        metadata: { type: 'spin', user_id: _userId },
      }, {
        onReadyForServerApproval: async (pId) => {
          paymentId = pId;
          await API.log({ msg: 'onReadyForServerApproval', paymentId: pId });
          try {
            await API.verifyPayment({ pi_user_id: _userId, payment_id: pId });
            await _executeSpin('pi', pId);
          } catch (err) {
            await API.log({ msg: 'verifyPayment ERROR', error: err.message });
            UI.showToast('❌ Payment error: ' + err.message);
            UI.setSpinning(false);
            _spinning = false;
          }
        },
        onReadyForServerCompletion: async (pId) => {
          await API.log({ msg: 'onReadyForServerCompletion', paymentId: pId });
          await API.completePayment({ payment_id: pId }).catch(() => {});
        },
        onCancel: () => {
          UI.showToast('❌ Payment cancelled.');
          UI.setSpinning(false);
          _spinning = false;
        },
        onError: (err) => {
          UI.showToast('❌ Error: ' + (err?.message || 'unknown'));
          UI.setSpinning(false);
          _spinning = false;
        },
      });
    } catch (err) {
      UI.showToast('❌ ' + err.message);
      UI.setSpinning(false);
      _spinning = false;
    }
  }

  async function spinAds() {
    if (_spinning) return;
    _spinning = true;
    UI.setSpinning(true);

    // ADS not yet available — simulate for now
    UI.showToast('📺 Ads coming soon! Free spin granted for testing.');
    await _executeSpin('ads', null);
  }

  async function _executeSpin(paidWith, paymentId) {
    try {
      const res = await API.spin({ pi_user_id: _userId, paid_with: paidWith, payment_id: paymentId });

      const finalEmojis = res.reels.map(r => SYMBOL_EMOJIS[r.id] || r.emoji || '?');

      UI.spinReels(finalEmojis, () => {
        UI.showResult(res.result, res.payout, window.SPIN_COST);
        UI.updateBalance(res.balance);

        // Update stats
        const spins = parseInt(document.getElementById('totalSpins').textContent) + 1;
        const wonEl = document.getElementById('totalWon');
        const prevWon = parseFloat(wonEl.textContent) || 0;
        UI.updateStats(spins, prevWon + res.payout);

        UI.setSpinning(false);
        _spinning = false;
      });
    } catch (err) {
      UI.showToast('❌ Spin error: ' + err.message);
      UI.setSpinning(false);
      _spinning = false;
    }
  }

  async function withdraw() {
    const amt = parseFloat(document.getElementById('withdrawAmt').value);
    if (!amt || amt < 0.5) {
      UI.showToast('❌ Minimum withdrawal is 0.5 π');
      return;
    }
    try {
      const res = await API.withdraw({ pi_user_id: _userId, amount: amt });
      UI.updateBalance(res.balance);
      UI.hideModal('withdrawModal');
      UI.showToast(`✅ Withdrawal of ${amt} π requested!`);
    } catch (err) {
      UI.showToast('❌ ' + err.message);
    }
  }

  return { init, spin, spinAds, withdraw };
})();
