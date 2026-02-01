const express = require('express');
const router = express.Router();
const employeeController = require('../controllers/employeeController');
const { authMiddleware, attachBusiness } = require('../middlewares/auth');

router.use(authMiddleware);
router.use(attachBusiness);

router.get('/', employeeController.list);
router.post('/', employeeController.create);
router.patch('/:id', employeeController.patch);

module.exports = router;
