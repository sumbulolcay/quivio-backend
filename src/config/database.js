const path = require('path');
const fs = require('fs');
const { Sequelize } = require('sequelize');
const config = require('./index');

const isProduction = config.env === 'production';
const caPath = path.join(__dirname, 'ca-certificate.crt');
const hasCaFile = fs.existsSync(caPath);

const dialectOptions = {};
if (isProduction && config.database.url) {
  dialectOptions.ssl = {
    require: true,
    rejectUnauthorized: true,
  };
  if (hasCaFile) {
    dialectOptions.ssl.ca = fs.readFileSync(caPath).toString();
  } else {
    dialectOptions.ssl.rejectUnauthorized = false;
  }
}

const sequelize = new Sequelize(config.database.url, {
  dialect: 'postgres',
  logging: config.env === 'development' ? console.log : false,
  dialectOptions: Object.keys(dialectOptions).length ? dialectOptions : undefined,
  define: {
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
});

module.exports = { sequelize };
