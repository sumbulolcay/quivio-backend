const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Subscription = sequelize.define('Subscription', {
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
  plan_code: {
    type: DataTypes.STRING(64),
    allowNull: false,
  },
  status: {
    type: DataTypes.STRING(32),
    allowNull: false,
    defaultValue: 'trial_active',
    comment: 'trial_active | active | past_due | inactive | expired',
  },
  trial_ends_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  current_period_end: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  payment_provider: {
    type: DataTypes.STRING(32),
    allowNull: true,
    comment: 'paytr | iyzico',
  },
  external_subscription_id: {
    type: DataTypes.STRING(128),
    allowNull: true,
  },
  external_customer_id: {
    type: DataTypes.STRING(128),
    allowNull: true,
  },
}, {
  tableName: 'subscriptions',
});

module.exports = Subscription;
