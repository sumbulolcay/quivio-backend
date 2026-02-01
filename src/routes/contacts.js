const express = require('express');
const router = express.Router();
const contactController = require('../controllers/contactController');
const { authMiddleware, attachBusiness } = require('../middlewares/auth');

router.use(authMiddleware);
router.use(attachBusiness);

router.get('/', contactController.list);
router.post('/', contactController.create);
router.patch('/:id', contactController.patch);

module.exports = router;
