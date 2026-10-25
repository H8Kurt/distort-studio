const mock = require('./mock');
const yookassa = require('./yookassa');

const PROVIDERS = { mock, yookassa };

function getProviderName() {
  return (process.env.PAYMENT_PROVIDER || 'mock').toLowerCase();
}

function getProvider(name) {
  const key = (name || getProviderName()).toLowerCase();
  return PROVIDERS[key] || mock;
}

module.exports = { getProvider, getProviderName, PROVIDERS };
