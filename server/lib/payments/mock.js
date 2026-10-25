// Заглушка платёжного провайдера для локальной разработки.
// Создаёт «платёж», который подтверждается вручную через POST /api/orders/:id/mock-pay.

async function createPayment({ order }) {
  const providerPaymentId = `mock_${order.id}_${Date.now()}`;
  const confirmationUrl = `${process.env.APP_URL || 'http://localhost:5173'}/marketplace?pay=${order.id}`;
  return {
    providerPaymentId,
    status: 'pending',
    confirmationUrl,
    qrData: null,
  };
}

async function getPayment(id) {
  return { id, status: 'pending' };
}

module.exports = { name: 'mock', isConfigured: () => true, createPayment, getPayment };
