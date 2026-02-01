const express = require('express');
const router = express.Router();
const businessController = require('../controllers/businessController');
const { authMiddleware, attachBusiness } = require('../middlewares/auth');

router.use(authMiddleware);
router.use(attachBusiness);

router.get('/settings', businessController.getSettings);
router.put('/settings', businessController.putSettings);
router.get('/booking-settings', businessController.getBookingSettings);
router.put('/booking-settings', businessController.putBookingSettings);

module.exports = router;
