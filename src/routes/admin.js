const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authMiddleware, requireRole } = require('../middlewares/auth');

router.use(authMiddleware);
router.use(requireRole('super_admin'));

router.get('/businesses', adminController.listBusinesses);
router.post('/businesses', adminController.createBusiness);
router.patch('/businesses/:id', adminController.updateBusiness);
router.delete('/businesses/:id', adminController.deleteBusiness);

module.exports = router;
