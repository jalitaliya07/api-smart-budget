const express = require('express');
const router = express.Router();
const delegateController = require('../controllers/delegate.controller');
const authenticate = require('../middleware/auth.middleware');

// Public route – User2 uses passkey to access User1's account (no auth required)
router.post('/access', delegateController.accessViaPasskey);

// Protected routes – User1 must be logged in to generate/view their passkey
router.post('/generate-passkey', authenticate, delegateController.generatePasskey);
router.post('/regenerate-passkey', authenticate, delegateController.regeneratePasskey);
router.get('/my-passkey', authenticate, delegateController.getMyPasskey);

module.exports = router;
