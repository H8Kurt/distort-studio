const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const Order = sequelize.define('Order', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  buyerId: { type: DataTypes.INTEGER, allowNull: false },
  sellerId: { type: DataTypes.INTEGER, allowNull: false },
  assetId: { type: DataTypes.INTEGER, allowNull: false },
  amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
  currency: { type: DataTypes.STRING, allowNull: false, defaultValue: 'RUB' },
  status: {
    type: DataTypes.ENUM('pending', 'paid', 'canceled', 'refunded', 'failed'),
    allowNull: false,
    defaultValue: 'pending',
  },
  provider: { type: DataTypes.STRING, allowNull: false, defaultValue: 'mock' },
  providerPaymentId: { type: DataTypes.STRING },
  confirmationUrl: { type: DataTypes.STRING },
  qrData: { type: DataTypes.TEXT },
  paidAt: { type: DataTypes.DATE },
  meta: { type: DataTypes.JSON, defaultValue: {} },
});

module.exports = Order;
