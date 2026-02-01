const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const WhatsappIntegration = sequelize.define('WhatsappIntegration', {
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
  waba_id: {
    type: DataTypes.STRING(64),
    allowNull: true,
  },
  phone_number_id: {
    type: DataTypes.STRING(64),
    allowNull: false,
    unique: true,
    comment: 'Webhook payload ile resolve için',
  },
  token_encrypted: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  status: {
    type: DataTypes.STRING(32),
    allowNull: false,
    defaultValue: 'active',
    comment: 'active | disconnected',
  },
}, {
  tableName: 'whatsapp_integrations',
});

module.exports = WhatsappIntegration;
