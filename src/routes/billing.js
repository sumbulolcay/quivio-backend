const express = require('express');
const router = express.Router();
const billingController = require('../controllers/billingController');
const { authMiddleware, attachBusiness } = require('../middlewares/auth');

router.get('/subscription', authMiddleware, attachBusiness, billingController.getSubscription);
router.post('/start-trial', authMiddleware, attachBusiness, billingController.startTrial);
router.post('/checkout', authMiddleware, attachBusiness, billingController.checkout);

router.post('/webhook/paytr', billingController.webhookPaytr);
router.post('/webhook/iyzico', billingController.webhookIyzico);

module.exports = router;
