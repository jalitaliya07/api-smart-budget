const express = require('express');
const router = express.Router();
const voiceExpenseController = require('../controllers/voiceExpense.controller');
const authenticate = require('../middleware/auth.middleware');

router.post('/parse', authenticate, voiceExpenseController.parseVoiceText);
router.post('/save', authenticate, voiceExpenseController.saveVoiceTransaction);
router.get('/history', authenticate, voiceExpenseController.getVoiceHistory);
router.get('/analytics', authenticate, voiceExpenseController.getVoiceAnalytics);

module.exports = router;
