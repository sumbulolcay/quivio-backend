const express = require('express');
const router = express.Router();
const contactController = require('../controllers/contactController');
const { authMiddleware, requireBusinessId, attachBusiness } = require('../middlewares/auth');

router.use(authMiddleware);
router.use(requireBusinessId);
router.use(attachBusiness);

router.get('/', contactController.list);
router.post('/', contactController.create);
router.patch('/:id', contactController.patch);

module.exports = router;
