const express = require('express');
const router = express.Router();
const { login, forgotPassword, resetPassword } = require('../controllers/authController');

// Route de connexion
router.post('/login', login);

// Route de demande de réinitialisation de mot de passe
router.post('/forgot-password', forgotPassword);

// Route de réinitialisation de mot de passe
router.post('/reset-password', resetPassword);

module.exports = router;
