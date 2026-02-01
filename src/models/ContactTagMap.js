const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const ContactTagMap = sequelize.define('ContactTagMap', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  contact_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'contacts', key: 'id' },
    onDelete: 'CASCADE',
  },
  tag_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'contact_tags', key: 'id' },
    onDelete: 'CASCADE',
  },
}, {
  tableName: 'contact_tag_maps',
});

module.exports = ContactTagMap;
