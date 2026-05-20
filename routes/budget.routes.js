const express = require('express');
const router = express.Router();
const budgetController = require('../controllers/budget.controller');
const authenticate = require('../middleware/auth.middleware');

router.get('/', authenticate, budgetController.getBudgets);
router.post('/', authenticate, budgetController.createBudget);
router.put('/:id', authenticate, budgetController.updateBudget);
router.delete('/:id', authenticate, budgetController.deleteBudget);

module.exports = router;
