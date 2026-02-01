const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const OtpChallenge = sequelize.define('OtpChallenge', {
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
  phone_e164: {
    type: DataTypes.STRING(32),
    allowNull: false,
  },
  otp_hash: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  expires_at: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  attempts: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
  consumed_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  channel: {
    type: DataTypes.STRING(16),
    allowNull: false,
    defaultValue: 'web',
  },
}, {
  tableName: 'otp_challenges',
});

module.exports = OtpChallenge;
