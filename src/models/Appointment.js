const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Appointment = sequelize.define('Appointment', {
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
  employee_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'employees', key: 'id' },
    onDelete: 'RESTRICT',
  },
  customer_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: 'customers', key: 'id' },
    onDelete: 'SET NULL',
    comment: 'Web kanalı için',
  },
  wa_user_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: 'wa_users', key: 'id' },
    onDelete: 'SET NULL',
    comment: 'WhatsApp kanalı için',
  },
  starts_at: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  status: {
    type: DataTypes.STRING(32),
    allowNull: false,
    defaultValue: 'scheduled',
    comment: 'scheduled | completed | cancelled | no_show',
  },
  approval_status: {
    type: DataTypes.STRING(32),
    allowNull: false,
    defaultValue: 'pending',
    comment: 'pending | approved | rejected',
  },
  requested_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  approved_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  source_channel: {
    type: DataTypes.STRING(32),
    allowNull: true,
    comment: 'web | whatsapp',
  },
}, {
  tableName: 'appointments',
});

module.exports = Appointment;
