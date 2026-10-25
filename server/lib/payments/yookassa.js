const { randomUUID } = require('crypto');

const API_BASE = 'https://api.yookassa.ru/v3';

function isConfigured() {
  return !!(process.env.YOOKASSA_SHOP_ID && process.env.YOOKASSA_SECRET_KEY);
}

function authHeader() {
  const shopId = process.env.YOOKASSA_SHOP_ID;
  const secret = process.env.YOOKASSA_SECRET_KEY;
  if (!shopId || !secret) throw new Error('ЮKassa не настроена (YOOKASSA_SHOP_ID/SECRET_KEY)');
  return 'Basic ' + Buffer.from(`${shopId}:${secret}`).toString('base64');
}

async function request(method, path, body) {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      Authorization: authHeader(),
      'Content-Type': 'application/json',
      'Idempotence-Key': randomUUID(),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data?.description || data?.error || `ЮKassa: HTTP ${res.status}`;
    const err = new Error(msg);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

// Оплата через СБП: создаём платёж с confirmation.type = qr.
async function createPayment({ order, asset, buyer, returnUrl, description }) {
  const data = await request('POST', '/payments', {
    amount: { value: Number(order.amount).toFixed(2), currency: order.currency || 'RUB' },
    capture: true,
    confirmation: { type: 'qr', return_url: returnUrl },
    payment_method_data: { type: 'sbp' },
    description: (description || `Покупка «${asset.title}»`).slice(0, 128),
    metadata: {
      orderId: String(order.id),
      assetId: String(asset.id),
      buyerId: String(buyer.id),
    },
  });

  return {
    providerPaymentId: data.id,
    status: data.status === 'succeeded' ? 'paid' : 'pending',
    confirmationUrl: data.confirmation?.confirmation_url || null,
    qrData: data.confirmation?.qr_data || null,
    raw: data,
  };
}

async function getPayment(id) {
  return request('GET', `/payments/${id}`);
}

module.exports = { name: 'yookassa', isConfigured, createPayment, getPayment, authHeader };
