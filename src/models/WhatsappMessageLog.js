const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const WhatsappMessageLog = sequelize.define('WhatsappMessageLog', {
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
  direction: {
    type: DataTypes.STRING(16),
    allowNull: false,
    comment: 'inbound | outbound',
  },
  message_id: {
    type: DataTypes.STRING(128),
    allowNull: true,
    comment: 'Idempotency için',
  },
  payload_json: {
    type: DataTypes.JSONB,
    allowNull: true,
  },
}, {
  tableName: 'whatsapp_message_logs',
  timestamps: true,
  updatedAt: false,
  indexes: [
    { unique: true, fields: ['business_id', 'message_id'] },
  ],
});

module.exports = WhatsappMessageLog;
