const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const BusinessSettings = sequelize.define('BusinessSettings', {
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
  working_hours: {
    type: DataTypes.JSONB,
    allowNull: true,
    comment: 'Genel çalışma saatleri { mon: { start, end }, ... }',
  },
  slot_duration: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 30,
    comment: 'Dakika',
  },
  max_parallel: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 1,
  },
}, {
  tableName: 'business_settings',
});

module.exports = BusinessSettings;
