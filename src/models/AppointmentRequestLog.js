const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const AppointmentRequestLog = sequelize.define('AppointmentRequestLog', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  appointment_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'appointments', key: 'id' },
    onDelete: 'CASCADE',
  },
  action: {
    type: DataTypes.STRING(64),
    allowNull: false,
    comment: 'created | approved | rejected | status_change',
  },
  actor_type: {
    type: DataTypes.STRING(32),
    allowNull: true,
    comment: 'business | system | customer',
  },
  payload_json: {
    type: DataTypes.JSONB,
    allowNull: true,
  },
}, {
  tableName: 'appointment_request_logs',
  timestamps: true,
  updatedAt: false,
});

module.exports = AppointmentRequestLog;
