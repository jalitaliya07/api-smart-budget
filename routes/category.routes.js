const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/category.controller');
const authenticate = require('../middleware/auth.middleware');

router.get('/', authenticate, categoryController.getAllCategories);
router.post('/', authenticate, categoryController.createCategory);
router.delete('/:id', authenticate, categoryController.deleteCategory);

module.exports = router;
