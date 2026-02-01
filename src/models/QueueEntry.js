const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const QueueEntry = sequelize.define('QueueEntry', {
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
    allowNull: true,
    references: { model: 'employees', key: 'id' },
    onDelete: 'SET NULL',
    comment: 'Opsiyonel; işletme isterse çalışana bağlanır',
  },
  customer_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: 'customers', key: 'id' },
    onDelete: 'SET NULL',
  },
  wa_user_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: 'wa_users', key: 'id' },
    onDelete: 'SET NULL',
  },
  status: {
    type: DataTypes.STRING(32),
    allowNull: false,
    defaultValue: 'waiting',
    comment: 'waiting | called | served | cancelled',
  },
  queue_date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    comment: 'Sıranın geçerli olduğu gün (YYYY-MM-DD); her gün sıra 1’den başlar',
  },
  position: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'O güne özel sıra numarası (0, 1, 2, ...); her gün 0\'dan başlar',
  },
  source_channel: {
    type: DataTypes.STRING(32),
    allowNull: true,
    comment: 'web | whatsapp',
  },
}, {
  tableName: 'queue_entries',
});

module.exports = QueueEntry;
