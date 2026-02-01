const express = require('express');
const router = express.Router();
const billingController = require('../controllers/billingController');
const { authMiddleware, requireBusinessId, attachBusiness } = require('../middlewares/auth');

router.get('/subscription', authMiddleware, requireBusinessId, attachBusiness, billingController.getSubscription);
router.post('/start-trial', authMiddleware, requireBusinessId, attachBusiness, billingController.startTrial);
router.post('/checkout', authMiddleware, requireBusinessId, attachBusiness, billingController.checkout);

router.post('/webhook/paytr', billingController.webhookPaytr);
router.post('/webhook/iyzico', billingController.webhookIyzico);

module.exports = router;
