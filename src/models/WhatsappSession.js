const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const WhatsappSession = sequelize.define('WhatsappSession', {
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
  wa_id: {
    type: DataTypes.STRING(64),
    allowNull: false,
  },
  state: {
    type: DataTypes.STRING(32),
    allowNull: false,
    defaultValue: 'WELCOME',
    comment: 'WELCOME | EMPLOYEE_SELECT | DATE_SELECT | TIME_SELECT | CONFIRM | DONE | CANCELLED',
  },
  context_json: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: {},
    comment: 'intent, selectedEmployeeId, selectedDate, selectedSlot vb.',
  },
  last_message_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  expires_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
}, {
  tableName: 'whatsapp_sessions',
  indexes: [
    { unique: true, fields: ['business_id', 'wa_id'] },
  ],
});

module.exports = WhatsappSession;
