const API = (() => {
  const BASE = '/api';

  async function request(method, path, body) {
    const opts = { method, headers: { 'Content-Type': 'application/json' } };
    if (body) opts.body = JSON.stringify(body);
    const res = await fetch(BASE + path, opts);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Request failed');
    return data;
  }

  return {
    session:         (p) => request('POST', '/session', p),
    spin:            (p) => request('POST', '/spin', p),
    verifyPayment:   (p) => request('POST', '/payment/verify', p),
    completePayment: (p) => request('POST', '/payment/complete', p),
    withdraw:        (p) => request('POST', '/withdraw', p),
    config:          ()  => request('GET',  '/config'),
    log:             (p) => request('POST', '/log', p).catch(() => {}),
  };
})();
