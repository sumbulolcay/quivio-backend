const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authMiddleware } = require('../middlewares/auth');
const { recaptchaMiddleware } = require('../middlewares/recaptcha');

router.post('/login', authController.login);
router.post('/register', recaptchaMiddleware, authController.register);
router.put('/change-password', authMiddleware, authController.changePassword);

module.exports = router;
