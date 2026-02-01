const express = require('express');
const router = express.Router();
const employeeController = require('../controllers/employeeController');
const { authMiddleware, requireBusinessId, attachBusiness } = require('../middlewares/auth');

router.use(authMiddleware);
router.use(requireBusinessId);
router.use(attachBusiness);

router.get('/', employeeController.list);
router.post('/', employeeController.create);
router.patch('/:id', employeeController.patch);

module.exports = router;
