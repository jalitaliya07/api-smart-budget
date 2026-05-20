const express = require('express');
const router = express.Router();
const bankController = require('../controllers/bank.controller');
const authenticate = require('../middleware/auth.middleware');

router.get('/', authenticate, bankController.getAllBanks);
router.post('/', authenticate, bankController.createBank);
router.delete('/:id', authenticate, bankController.deleteBank);

module.exports = router;
