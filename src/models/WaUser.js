const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const WaUser = sequelize.define('WaUser', {
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
  display_name: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  first_seen_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  last_seen_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
}, {
  tableName: 'wa_users',
  indexes: [
    { unique: true, fields: ['business_id', 'wa_id'] },
  ],
});

module.exports = WaUser;
