window.SANDBOX_MODE = false;
window.SPIN_COST = 0.1;

async function _log(data) {
  await API.log(data).catch(() => {});
}

function isPiBrowser() {
  return typeof window.Pi !== 'undefined' &&
         typeof window.Pi.authenticate === 'function' &&
         typeof window.Pi.createPayment === 'function';
}

async function waitForPiSDK(maxWait = 5000) {
  const start = Date.now();
  while (Date.now() - start < maxWait) {
    if (isPiBrowser()) return true;
    await new Promise(r => setTimeout(r, 300));
  }
  return false;
}

function showPiRequired() {
  document.getElementById('loadingOverlay').style.display = 'none';
  const el = document.getElementById('piRequired');
  el.style.display = 'flex';
}

function hideLoading() {
  document.getElementById('loadingOverlay').style.display = 'none';
}

async function boot() {
  try {
    // Load config from server
    const config = await API.config();
    window.SANDBOX_MODE = config.sandbox;
    window.SPIN_COST = config.spinCost || 0.1;

    if (window.Pi) {
      Pi.init({ version: "2.0", sandbox: config.piSandbox });
    }

    await _log({ msg: 'boot started', ua: navigator.userAgent });

    const piAvailable = await waitForPiSDK(5000);
    await _log({ msg: 'piAvailable', value: piAvailable });

    if (!piAvailable) {
      showPiRequired();
      return;
    }

    // Authenticate with Pi
    let user = null;
    try {
      const auth = await window.Pi.authenticate(
        ['username', 'payments'],
        async (payment) => {
          await _log({ msg: 'incomplete payment', payment });
          await API.incompletePayment({ payment }).catch((err) => (
            _log({ msg: 'incomplete payment ERROR', error: err.message })
          ));
        }
      );
      await _log({ msg: 'auth success', uid: auth.user.uid });
      const session = await API.session({ authResult: auth });
      await _log({ msg: 'session loaded', balance: session.user.balance });
      user = session.user;
    } catch (authErr) {
      await _log({ msg: 'auth FAILED', error: authErr.message });
      hideLoading();
      document.body.innerHTML = `
        <div style="text-align:center; padding:40px; color:#e8c97a; font-family:system-ui;">
          <div style="font-size:32px; margin-bottom:12px;">🎰 π ARCADE</div>
          <div style="color:#9b8ec4; margin-bottom:16px;">Could not authenticate with Pi Network.<br>Please reload.</div>
          <button onclick="location.reload()" style="padding:10px 24px; background:#4a3a8a; color:#fff; border:none; border-radius:8px; cursor:pointer;">Retry</button>
        </div>`;
      return;
    }

    UI.updateUser(user);
    Game.init(user.pi_user_id);

    // Update spin cost display
    document.getElementById('spinCost').textContent = window.SPIN_COST + ' π';
    document.querySelector('.btn-spin span:last-child').textContent = `SPIN — ${window.SPIN_COST} π`;

  } catch (err) {
    await _log({ msg: 'boot ERROR', error: err.message });
    hideLoading();
    document.body.innerHTML = `
      <div style="text-align:center; padding:40px; color:#e8c97a; font-family:system-ui;">
        <div style="font-size:32px; margin-bottom:12px;">🎰 π ARCADE</div>
        <div style="color:#9b8ec4;">Error: ${err.message}</div>
        <button onclick="location.reload()" style="margin-top:20px; padding:10px 24px; background:#4a3a8a; color:#fff; border:none; border-radius:8px; cursor:pointer;">Retry</button>
      </div>`;
  } finally {
    hideLoading();
  }
}

document.addEventListener('DOMContentLoaded', boot);
