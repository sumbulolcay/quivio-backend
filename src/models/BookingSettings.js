const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const BookingSettings = sequelize.define('BookingSettings', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  business_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    unique: true,
    references: { model: 'businesses', key: 'id' },
    onDelete: 'CASCADE',
  },
  auto_approve: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },
  notify_email: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  notify_sms: {
    type: DataTypes.STRING(32),
    allowNull: true,
  },
  queue_requires_employee: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    comment: 'true ise sıraya girerken çalışan seçimi gösterilir',
  },
}, {
  tableName: 'booking_settings',
});

module.exports = BookingSettings;
