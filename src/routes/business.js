const express = require('express');
const router = express.Router();
const businessController = require('../controllers/businessController');
const { authMiddleware, requireBusinessId, attachBusiness } = require('../middlewares/auth');

router.use(authMiddleware);
router.use(requireBusinessId);
router.use(attachBusiness);

router.get('/settings', businessController.getSettings);
router.put('/settings', businessController.putSettings);
router.get('/languages', businessController.getAvailableLanguagesForWhatsApp);
router.post('/logo', businessController.uploadLogo);
router.get('/booking-settings', businessController.getBookingSettings);
router.put('/booking-settings', businessController.putBookingSettings);

module.exports = router;
