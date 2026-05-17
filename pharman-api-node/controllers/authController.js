/**
 * controllers/authController.js
 * Contrôleur pour la gestion de l'authentification.
 * Responsabilité : Gérer la connexion des utilisateurs, l'envoi de codes de récupération et le changement de mot de passe.
 */

const bcrypt = require('bcrypt'); // Bibliothèque pour le hachage sécurisé des mots de passe
const nodemailer = require('nodemailer'); // Bibliothèque pour l'envoi d'e-mails
const { pool } = require('../utils/db'); // Import de la connexion DB

/**
 * Gère la connexion de l'utilisateur (Login).
 */
const login = async (req, res) => {
    const { matricule, password, email } = req.body;

    // Vérification des champs requis
    if (!matricule || !password || !email) {
        return res.status(400).json({ message: 'Veuillez fournir un matricule, un e-mail et un mot de passe' });
    }

    try {
        // 1. On cherche l'utilisateur dans la base par son matricule
        const [rows] = await pool.execute('SELECT * FROM users WHERE matricule = ?', [matricule]);

        if (rows.length === 0) {
            return res.status(401).json({ message: 'Matricule, e-mail ou mot de passe incorrect' });
        }

        const user = rows[0];

        // 2. Vérification de l'e-mail (double sécurité)
        if (user.email !== email) {
            return res.status(401).json({ message: 'Matricule, e-mail ou mot de passe incorrect' });
        }

        // 3. Comparaison du mot de passe saisi avec le hash stocké en base
        const isMatch = await bcrypt.compare(password, user.password_hash);

        if (!isMatch) {
            return res.status(401).json({ message: 'Matricule, e-mail ou mot de passe incorrect' });
        }

        // 4. On utilise le matricule comme jeton de session (Token simplifié)
        const token = user.matricule;

        // 5. Réponse au client avec les informations nécessaires
        res.json({
            token,
            role: user.role,
            message: 'Authentification réussie'
        });

    } catch (error) {
        console.error('[AUTH ERROR] Login:', error.message);
        res.status(500).json({ message: 'Erreur lors de l\'authentification' });
    }
};

// Configuration du transporteur d'e-mails (Gmail dans cet exemple)
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

/**
 * Gère la demande de mot de passe oublié (Envoi de code par e-mail).
 */
const forgotPassword = async (req, res) => {
    const { matricule, email } = req.body;

    if (!matricule || !email) return res.status(400).json({ message: 'Veuillez fournir votre matricule et votre e-mail.' });

    try {
        // Vérifier si l'utilisateur existe avec ce matricule et cet email
        const [rows] = await pool.execute('SELECT * FROM users WHERE matricule = ? AND email = ?', [matricule, email]);
        if (rows.length === 0) {
            return res.status(404).json({ message: 'Matricule ou e-mail introuvable ou incorrect.' });
        }

        const user = rows[0];

        // Génération d'un code aléatoire à 6 chiffres
        const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
        // Le code expire dans 15 minutes
        const expires = new Date(Date.now() + 15 * 60 * 1000);

        // Enregistrer le code et son expiration en base de données
        await pool.execute('UPDATE users SET reset_code = ?, reset_expires = ? WHERE id = ?', [resetCode, expires, user.id]);

        // Préparation du contenu de l'e-mail
        const mailOptions = {
            from: process.env.EMAIL_USER || 'Pharmacie Centrale',
            to: user.email,
            subject: 'Code de réinitialisation de votre mot de passe (PHCT)',
            html: `
                <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #f4f7f6; border-radius: 8px;">
                    <h2 style="color: #0d8262;">Pharmacie Centrale - Réinitialisation</h2>
                    <p>Bonjour ${user.matricule},</p>
                    <p>Vous avez demandé à réinitialiser votre mot de passe.</p>
                    <p>Voici votre code de vérification à 6 chiffres :</p>
                    <h1 style="background: #eef2f1; padding: 15px; text-align: center; letter-spacing: 5px; color: #1f2937; border-radius: 8px;">${resetCode}</h1>
                    <p>Ce code est valable pendant 15 minutes.</p>
                    <p>Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer cet e-mail.</p>
                </div>
            `
        };

        // Envoi de l'e-mail
        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                // Log de sécurité si l'envoi échoue (pratique en développement)
                console.log('\n======================================================');
                console.log('⚠️ ERREUR D\'ENVOI E-MAIL');
                console.log(`Par sécurité, voici le code pour ${user.matricule} : ${resetCode}`);
                console.log('======================================================\n');
            } else {
                console.log('📧 E-MAIL ENVOYÉ avec succès à : ' + user.email);
            }
        });

        // Masquer l'e-mail pour la réponse de sécurité
        const maskedEmail = user.email.replace(/(.{2})(.*)(?=@)/, (_, p1, p2) => p1 + p2.replace(/./g, '*'));
        res.json({ message: `Un code a été envoyé à l'adresse e-mail : ${maskedEmail}` });

    } catch (error) {
        console.error('[AUTH ERROR] Forgot Password:', error.message);
        res.status(500).json({ message: 'Erreur lors de la demande de réinitialisation' });
    }
};

/**
 * Gère la réinitialisation effective du mot de passe avec le code reçu.
 */
const resetPassword = async (req, res) => {
    const { matricule, code, newPassword } = req.body;

    if (!matricule || !code || !newPassword) {
        return res.status(400).json({ message: 'Tous les champs sont requis.' });
    }

    try {
        // Vérifier si le matricule et le code correspondent
        const [rows] = await pool.execute('SELECT * FROM users WHERE matricule = ? AND reset_code = ?', [matricule, code]);

        if (rows.length === 0) {
            return res.status(400).json({ message: 'Code de vérification invalide ou incorrect.' });
        }

        const user = rows[0];

        // Vérifier si le code a expiré
        if (new Date() > new Date(user.reset_expires)) {
            return res.status(400).json({ message: 'Le code de vérification a expiré. Veuillez refaire une demande.' });
        }

        // Hacher le nouveau mot de passe pour la sécurité
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        // Mettre à jour le mot de passe et effacer le code de réinitialisation
        await pool.execute('UPDATE users SET password_hash = ?, reset_code = NULL, reset_expires = NULL WHERE id = ?', [hashedPassword, user.id]);

        res.json({ message: 'Votre mot de passe a été réinitialisé avec succès. Vous pouvez maintenant vous connecter.' });
    } catch (error) {
        console.error('[AUTH ERROR] Reset Password:', error.message);
        res.status(500).json({ message: 'Erreur lors de la réinitialisation du mot de passe' });
    }
};

module.exports = {
    login,
    forgotPassword,
    resetPassword
};

