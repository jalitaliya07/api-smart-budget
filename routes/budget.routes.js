const express = require('express');
const router = express.Router();
const budgetController = require('../controllers/budget.controller');
const authenticate = require('../middleware/auth.middleware');

router.get('/', authenticate, budgetController.getBudgets);
router.post('/', authenticate, budgetController.createBudget);

module.exports = router;
