const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const ROLES = ['business', 'super_admin'];

const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  email: {
    type: DataTypes.STRING(255),
    allowNull: false,
    unique: true,
  },
  password_hash: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  role: {
    type: DataTypes.STRING(32),
    allowNull: false,
    defaultValue: 'business',
    comment: 'business | super_admin',
  },
  business_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: 'businesses', key: 'id' },
    onDelete: 'CASCADE',
    comment: 'business rolü için zorunlu, super_admin için null',
  },
}, {
  tableName: 'users',
  indexes: [
    { unique: true, fields: ['email'] },
  ],
});

User.ROLES = ROLES;

module.exports = User;
