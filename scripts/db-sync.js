#!/usr/bin/env node
/**
 * Veritabanı şemasını Sequelize modellerine göre senkronize eder.
 * Kullanım: npm run db:sync
 * Alter (mevcut tabloları güncelle): npm run db:sync -- --alter
 * veya SEQUELIZE_ALTER=true npm run db:sync
 */
require('dotenv').config();
const { sequelize } = require('../src/models');
const config = require('../src/config');

async function main() {
  const alterFlag = process.argv.includes('--alter') || config.database.alter;
  if (config.env === 'production' && alterFlag) {
    console.error('Production ortamında --alter kullanılmamalı.');
    process.exit(1);
  }
  try {
    await sequelize.authenticate();
    console.log('Veritabanı bağlantısı OK.');
    await sequelize.sync({ alter: alterFlag });
    console.log(alterFlag ? 'Sync tamamlandı (alter: true).' : 'Sync tamamlandı.');
  } catch (err) {
    console.error('DB sync hatası:', err.message);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

main();
