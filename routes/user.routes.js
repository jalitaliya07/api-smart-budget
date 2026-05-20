const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const authenticate = require('../middleware/auth.middleware');

router.get('/', authenticate, userController.getUsers);
router.put('/:id/status', authenticate, userController.updateUserStatus);

module.exports = router;
