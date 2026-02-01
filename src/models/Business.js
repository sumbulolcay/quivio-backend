const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Business = sequelize.define('Business', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  slug: {
    type: DataTypes.STRING(64),
    allowNull: false,
    unique: true,
  },
  name: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  email: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  phone_e164: {
    type: DataTypes.STRING(32),
    allowNull: false,
    comment: 'İşletme iletişim telefonu, E.164 (+90...)',
  },
  password_hash: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
}, {
  tableName: 'businesses',
});

module.exports = Business;
