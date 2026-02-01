const config = require('../../config');

let paytr = null;
let iyzico = null;

function getPaymentProvider() {
  const name = config.payment.provider || 'paytr';
  if (name === 'paytr') {
    if (!paytr) paytr = require('./paytr');
    return paytr;
  }
  if (name === 'iyzico') {
    if (!iyzico) iyzico = require('./iyzico');
    return iyzico;
  }
  throw new Error(`Payment provider not implemented: ${name}`);
}

module.exports = { getPaymentProvider };
