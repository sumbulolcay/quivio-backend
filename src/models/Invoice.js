const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Invoice = sequelize.define('Invoice', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  business_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'businesses', key: 'id' },
    onDelete: 'CASCADE',
  },
  subscription_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: 'subscriptions', key: 'id' },
    onDelete: 'SET NULL',
  },
  amount: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
  },
  currency: {
    type: DataTypes.STRING(3),
    allowNull: false,
    defaultValue: 'TRY',
  },
  status: {
    type: DataTypes.STRING(32),
    allowNull: false,
    comment: 'pending | paid | failed | refunded',
  },
  provider: {
    type: DataTypes.STRING(32),
    allowNull: true,
  },
  external_invoice_id: {
    type: DataTypes.STRING(128),
    allowNull: true,
  },
}, {
  tableName: 'invoices',
  timestamps: true,
  updatedAt: false,
});

module.exports = Invoice;
