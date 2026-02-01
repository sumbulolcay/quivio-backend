const express = require('express');
const router = express.Router();
const { whatsappLimiter } = require('../middlewares/rateLimit');
const whatsappWebhookController = require('../controllers/whatsappWebhookController');
const config = require('../config');

router.get('/', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  if (mode === 'subscribe' && token === config.whatsapp.verifyToken) {
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

router.post('/', express.json(), whatsappLimiter, whatsappWebhookController.handleIncoming);

module.exports = router;
