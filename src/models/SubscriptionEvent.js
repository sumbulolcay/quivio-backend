const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const SubscriptionEvent = sequelize.define('SubscriptionEvent', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  subscription_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'subscriptions', key: 'id' },
    onDelete: 'CASCADE',
  },
  type: {
    type: DataTypes.STRING(64),
    allowNull: false,
  },
  payload_json: {
    type: DataTypes.JSONB,
    allowNull: true,
  },
}, {
  tableName: 'subscription_events',
  timestamps: true,
  updatedAt: false,
});

module.exports = SubscriptionEvent;
