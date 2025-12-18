const express = require('express');
const router = express.Router();
const authController = require('../controller/authController');
const { verifyToken } = require('../middleware/auth');

router.post('/register', authController.registerAdmin); // admin registration
router.post('/login', authController.login);            // login
router.post('/logout', verifyToken, authController.logout); // logout
router.post('/reset-password', verifyToken, authController.resetPassword); // reset password

module.exports = router;
