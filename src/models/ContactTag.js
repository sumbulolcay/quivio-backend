const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const ContactTag = sequelize.define('ContactTag', {
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
  name: {
    type: DataTypes.STRING(64),
    allowNull: false,
  },
}, {
  tableName: 'contact_tags',
});

module.exports = ContactTag;
