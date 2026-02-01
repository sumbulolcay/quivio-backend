const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Contact = sequelize.define('Contact', {
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
  full_name: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  phone_e164: {
    type: DataTypes.STRING(32),
    allowNull: false,
  },
  source_channel: {
    type: DataTypes.STRING(32),
    allowNull: true,
    comment: 'web | whatsapp',
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  last_appointment_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
}, {
  tableName: 'contacts',
});

module.exports = Contact;
