const express = require('express');
const router = express.Router();
const integrationController = require('../controllers/integrationController');
const { authMiddleware, attachBusiness } = require('../middlewares/auth');

router.use(authMiddleware);
router.use(attachBusiness);

router.get('/whatsapp', integrationController.getWhatsapp);
router.post('/whatsapp/connect', integrationController.connectWhatsapp);
router.post('/whatsapp/disconnect', integrationController.disconnectWhatsapp);

module.exports = router;
