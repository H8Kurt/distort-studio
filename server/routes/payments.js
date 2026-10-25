const express = require('express');

const { markOrderPaid } = require('../lib/orders');
const Order = require('../models/Order');
const Asset = require('../models/Asset');
const User = require('../models/User');

const router = express.Router();

const INCLUDE = [
  { model: Asset, as: 'asset' },
  { model: User, as: 'buyer', attributes: ['id', 'username'] },
  { model: User, as: 'seller', attributes: ['id', 'username'] },
];

// POST /api/payments/webhook/:provider — уведомления платёжного провайдера.
// Отвечаем 200 даже при ошибке, чтобы провайдер не повторял запрос бесконечно.
router.post('/webhook/:provider', async (req, res) => {
  res.status(200).json({ ok: true });

  try {
    const provider = req.params.provider;
    if (provider !== 'yookassa') return;

    const event = req.body?.event;
    const object = req.body?.object;
    if (!object?.id) return;

    let order = await Order.findOne({ where: { providerPaymentId: object.id }, include: INCLUDE });
    if (!order && object.metadata?.orderId) {
      order = await Order.findByPk(Number(object.metadata.orderId), { include: INCLUDE });
    }
    if (!order) return;

    if (event === 'payment.succeeded' || object.status === 'succeeded') {
      await markOrderPaid(order, req.app);
    } else if (event === 'payment.canceled' || object.status === 'canceled') {
      if (order.status === 'pending') {
        order.status = 'canceled';
        await order.save();
      }
    }
  } catch (err) {
    console.error('Ошибка обработки вебхука:', err);
  }
});

module.exports = router;
