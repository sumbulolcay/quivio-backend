const path = require('path');
const fs = require('fs');
const { Sequelize } = require('sequelize');
const config = require('./index');

const isProduction = config.env === 'production';
const caPath = path.join(__dirname, 'ca-certificate.crt');
const hasCaFile = fs.existsSync(caPath);

/**
 * URL'deki sslmode/ssl parametrelerini kaldırır; SSL sadece dialectOptions.ssl (CA ile) uygulanır.
 * Böylece pg, connection string'den gelen sslmode ile kendi doğrulamasını yapmaz, CA kullanılır.
 */
function getDatabaseUrlWithoutSslParams(url) {
  if (!url || !isProduction) return url;
  return url.replace(/\?([^#]*)$/, (_, q) => {
    const params = q.split('&').filter((p) => {
      const key = p.split('=')[0].toLowerCase();
      return !['sslmode', 'ssl', 'sslcert', 'sslkey', 'sslrootcert', 'sslcrl', 'no-verify', 'uselibpqcompat'].includes(key);
    });
    return params.length ? '?' + params.join('&') : '';
  });
}

const databaseUrl = getDatabaseUrlWithoutSslParams(config.database.url);

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

const sequelize = new Sequelize(databaseUrl, {
  dialect: 'postgres',
  logging: config.env === 'development' ? console.log : false,
  dialectOptions: Object.keys(dialectOptions).length ? dialectOptions : undefined,
  define: {
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
  hooks: config.timezone
    ? {
        afterConnect: (connection) => {
          return connection.query(`SET time zone '${config.timezone.replace(/'/g, "''")}'`);
        },
      }
    : undefined,
});

module.exports = { sequelize };
