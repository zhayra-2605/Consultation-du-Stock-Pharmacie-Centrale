/**
 * routes/auth.js
 * Définition des routes liées à l'authentification.
 */
const express = require('express');
const router = express.Router();
const { login, forgotPassword, resetPassword } = require('../controllers/authController');

// Route de connexion : reçoit matricule, email et password
router.post('/login', login);

// Route de demande de réinitialisation de mot de passe : envoie un code par e-mail
router.post('/forgot-password', forgotPassword);

// Route de réinitialisation de mot de passe : valide le code et change le mot de passe
router.post('/reset-password', resetPassword);

module.exports = router;

