const express = require('express');
const router = express.Router();
const expenseController = require('../controllers/expense.controller');
const authenticate = require('../middleware/auth.middleware');

router.get('/', authenticate, expenseController.getExpenses);
router.post('/', authenticate, expenseController.createExpense);
router.delete('/:id', authenticate, expenseController.deleteExpense);

module.exports = router;
