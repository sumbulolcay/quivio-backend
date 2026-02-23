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
  employee_selection_label: {
    type: DataTypes.STRING(255),
    allowNull: true,
    comment: 'Çalışan seçim ekranı için dinamik metin (örn. \"Masa seçin\", \"Hekim seçin\")',
  },
  logo_url: {
    type: DataTypes.STRING(512),
    allowNull: true,
    comment: 'İşletme logosu (Cloudinary secure_url)',
  },
  whatsapp_lang: {
    type: DataTypes.STRING(8),
    allowNull: false,
    defaultValue: 'tr',
    comment: 'WhatsApp mesajları için dil (tr, en). Tek dil seçilir.',
  },
}, {
  tableName: 'business_settings',
});

module.exports = BusinessSettings;
