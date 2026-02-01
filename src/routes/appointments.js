const express = require('express');
const router = express.Router();
const appointmentController = require('../controllers/appointmentController');
const { authMiddleware, requireBusinessId, attachBusiness } = require('../middlewares/auth');

router.use(authMiddleware);
router.use(requireBusinessId);
router.use(attachBusiness);

router.get('/', appointmentController.list);
router.get('/requests', appointmentController.listRequests);
router.patch('/:id/status', appointmentController.patchStatus);
router.patch('/:id/approve', appointmentController.approve);
router.patch('/:id/reject', appointmentController.reject);

module.exports = router;
