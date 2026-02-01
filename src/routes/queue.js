const express = require('express');
const router = express.Router();
const queueController = require('../controllers/queueController');
const { authMiddleware, requireBusinessId, attachBusiness } = require('../middlewares/auth');

router.use(authMiddleware);
router.use(requireBusinessId);
router.use(attachBusiness);

router.get('/', queueController.list);
router.patch('/:id/status', queueController.patchStatus);

module.exports = router;
