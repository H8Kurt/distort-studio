const { notify } = require('./notify');

function toPublicOrder(order) {
  const json = typeof order.toJSON === 'function' ? order.toJSON() : { ...order };
  json.amount = Number(json.amount);
  return json;
}

// Помечает заказ оплаченным, шлёт уведомления и socket-событие. Идемпотентно.
async function markOrderPaid(order, app) {
  if (order.status === 'paid') return order;

  order.status = 'paid';
  order.paidAt = new Date();
  await order.save();

  const io = app.get('io');
  const payload = toPublicOrder(order);
  if (io) {
    io.to(`user_${order.sellerId}`).emit('order:paid', payload);
    io.to(`user_${order.buyerId}`).emit('order:paid', payload);
  }

  await notify(app, {
    userId: order.sellerId,
    actorId: order.buyerId,
    type: 'order_paid',
    message: `Ваш ассет купили за ${Number(order.amount)} ₽`,
  });
  await notify(app, {
    userId: order.buyerId,
    actorId: order.sellerId,
    type: 'order_paid',
    message: 'Оплата прошла — покупка оформлена',
  });

  return order;
}

module.exports = { toPublicOrder, markOrderPaid };
