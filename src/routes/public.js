const express = require('express');
const router = express.Router();
const publicController = require('../controllers/publicController');
const { recaptchaMiddleware } = require('../middlewares/recaptcha');
const { otpLimiter } = require('../middlewares/rateLimit');

router.get('/business/:slug', publicController.getBusinessBySlug);
router.get('/employees', publicController.getEmployees);
router.get('/availability', publicController.getAvailability);
router.get('/appointments/my-upcoming', publicController.getMyUpcomingAppointments);

router.post('/otp/start', otpLimiter, recaptchaMiddleware, publicController.otpStart);
router.post('/otp/verify', publicController.otpVerify);

router.post('/appointments', recaptchaMiddleware, publicController.createAppointment);
router.patch('/appointments/:id', recaptchaMiddleware, publicController.updateMyAppointment);
router.post('/appointments/:id/cancel', recaptchaMiddleware, publicController.cancelMyAppointment);
router.post('/queue', recaptchaMiddleware, publicController.createQueueEntry);

module.exports = router;
