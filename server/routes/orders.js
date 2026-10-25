const express = require('express');
const QRCode = require('qrcode');

const auth = require('../middleware/auth');
const { orderCreateSchema } = require('../lib/validators');
const { getProvider, getProviderName } = require('../lib/payments');
const { toPublicOrder, markOrderPaid } = require('../lib/orders');
const Order = require('../models/Order');
const Asset = require('../models/Asset');
const User = require('../models/User');

const router = express.Router();

const INCLUDE = [
  {
    model: Asset,
    as: 'asset',
    include: [{ model: User, as: 'author', attributes: ['id', 'username', 'avatarUrl'] }],
  },
  { model: User, as: 'buyer', attributes: ['id', 'username', 'avatarUrl'] },
  { model: User, as: 'seller', attributes: ['id', 'username', 'avatarUrl'] },
];

function appUrl() {
  return (process.env.APP_URL || 'http://localhost:5173').replace(/\/$/, '');
}

async function attachQr(order) {
  if (order.qrData || !order.confirmationUrl) return;
  try {
    order.qrData = await QRCode.toDataURL(order.confirmationUrl, { width: 340, margin: 1 });
    await order.save();
  } catch {
    /* оставляем без QR */
  }
}

// GET /api/orders?role=buyer|seller
router.get('/', auth, async (req, res, next) => {
  try {
    const role = req.query.role === 'seller' ? 'seller' : 'buyer';
    const where = role === 'seller' ? { sellerId: req.user.id } : { buyerId: req.user.id };
    const orders = await Order.findAll({ where, include: INCLUDE, order: [['createdAt', 'DESC']] });
    res.json(orders.map(toPublicOrder));
  } catch (err) {
    next(err);
  }
});

// POST /api/orders — создать заказ и платёж
router.post('/', auth, async (req, res, next) => {
  let order = null;
  try {
    const { assetId } = orderCreateSchema.parse(req.body);

    const asset = await Asset.findByPk(assetId, {
      include: [{ model: User, as: 'author', attributes: ['id', 'username', 'avatarUrl'] }],
    });
    if (!asset) return res.status(404).json({ error: 'Ассет не найден' });
    if (asset.UserId === req.user.id) {
      return res.status(400).json({ error: 'Нельзя купить собственный ассет' });
    }
    if (asset.isFree || Number(asset.price) <= 0) {
      return res.status(400).json({ error: 'Ассет бесплатный — скачайте напрямую' });
    }

    const existingPaid = await Order.findOne({
      where: { buyerId: req.user.id, assetId: asset.id, status: 'paid' },
    });
    if (existingPaid) {
      return res.json({ order: toPublicOrder(existingPaid), alreadyOwned: true });
    }

    const provider = getProvider();
    order = await Order.create({
      buyerId: req.user.id,
      sellerId: asset.UserId,
      assetId: asset.id,
      amount: asset.price,
      currency: 'RUB',
      provider: provider.name,
      status: 'pending',
    });

    const payment = await provider.createPayment({
      order,
      asset,
      buyer: req.user,
      returnUrl: `${appUrl()}/marketplace`,
    });

    order.providerPaymentId = payment.providerPaymentId;
    order.confirmationUrl = payment.confirmationUrl;
    order.qrData = payment.qrData || null;
    order.status = payment.status === 'paid' ? 'paid' : 'pending';
    await order.save();

    if (order.status === 'paid') {
      await markOrderPaid(order, req.app);
    } else {
      await attachQr(order);
    }

    const full = await Order.findByPk(order.id, { include: INCLUDE });
    res.status(201).json({ order: toPublicOrder(full) });
  } catch (err) {
    if (err.name === 'ZodError') {
      return res.status(400).json({ error: 'Ошибка валидации', details: err.errors });
    }
    if (order) {
      order.status = 'failed';
      order.save().catch(() => undefined);
    }
    if (err.message && err.message.includes('не настроена')) {
      return res.status(503).json({ error: 'Платёжный провайдер не настроен' });
    }
    console.error('Ошибка создания заказа:', err);
    res.status(502).json({ error: 'Не удалось создать платёж' });
  }
});

// GET /api/orders/:id
router.get('/:id', auth, async (req, res, next) => {
  try {
    const order = await Order.findByPk(req.params.id, { include: INCLUDE });
    if (!order) return res.status(404).json({ error: 'Заказ не найден' });
    if (order.buyerId !== req.user.id && order.sellerId !== req.user.id) {
      return res.status(403).json({ error: 'Нет доступа к заказу' });
    }
    res.json(toPublicOrder(order));
  } catch (err) {
    next(err);
  }
});

// POST /api/orders/:id/sync — синхронизировать статус с провайдером
router.post('/:id/sync', auth, async (req, res, next) => {
  try {
    const order = await Order.findByPk(req.params.id, { include: INCLUDE });
    if (!order) return res.status(404).json({ error: 'Заказ не найден' });
    if (order.buyerId !== req.user.id && order.sellerId !== req.user.id) {
      return res.status(403).json({ error: 'Нет доступа к заказу' });
    }

    if (order.status === 'pending' && order.providerPaymentId) {
      const provider = getProvider(order.provider);
      try {
        const payment = await provider.getPayment(order.providerPaymentId);
        if (payment?.status === 'succeeded') {
          await markOrderPaid(order, req.app);
        } else if (payment?.status === 'canceled') {
          order.status = 'canceled';
          await order.save();
        }
      } catch {
        /* игнорируем — вернём текущее состояние */
      }
    }

    const full = await Order.findByPk(order.id, { include: INCLUDE });
    res.json(toPublicOrder(full));
  } catch (err) {
    next(err);
  }
});

// POST /api/orders/:id/mock-pay — только для dev-провайдера mock
router.post('/:id/mock-pay', auth, async (req, res, next) => {
  try {
    if (getProviderName() !== 'mock' || process.env.NODE_ENV === 'production') {
      return res.status(403).json({ error: 'Оплата недоступна' });
    }
    const order = await Order.findByPk(req.params.id, { include: INCLUDE });
    if (!order) return res.status(404).json({ error: 'Заказ не найден' });
    if (order.buyerId !== req.user.id) {
      return res.status(403).json({ error: 'Нет доступа к заказу' });
    }
    await markOrderPaid(order, req.app);
    const full = await Order.findByPk(order.id, { include: INCLUDE });
    res.json(toPublicOrder(full));
  } catch (err) {
    next(err);
  }
});

module.exports = router;
