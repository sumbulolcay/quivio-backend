const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { recaptchaMiddleware } = require('../middlewares/recaptcha');

router.post('/login', authController.login);
router.post('/register', recaptchaMiddleware, authController.register);

module.exports = router;
