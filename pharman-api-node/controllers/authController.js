const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const { pool } = require('../utils/db');

// Rôle mapping si besoin (peut être stocké en dur ou en DB)
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_key_12345';
const JWT_EXPIRES_IN = '24h';

const login = async (req, res) => {
    const { matricule, password, email } = req.body;

    if (!matricule || !password || !email) {
        return res.status(400).json({ message: 'Veuillez fournir un matricule, un e-mail et un mot de passe' });
    }

    try {
        // Vérifier si l'utilisateur existe
        const [rows] = await pool.execute('SELECT * FROM users WHERE matricule = ?', [matricule]);

        if (rows.length === 0) {
            return res.status(401).json({ message: 'Matricule, e-mail ou mot de passe incorrect' });
        }

        const user = rows[0];

        // Vérifier l'e-mail
        if (user.email !== email) {
            return res.status(401).json({ message: 'Matricule, e-mail ou mot de passe incorrect' });
        }

        // Vérifier le mot de passe
        const isMatch = await bcrypt.compare(password, user.password_hash);

        if (!isMatch) {
            return res.status(401).json({ message: 'Matricule, e-mail ou mot de passe incorrect' });
        }

        // Générer le token JWT
        const token = jwt.sign(
            { id: user.id, matricule: user.matricule, role: user.role },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRES_IN }
        );

        // Réponse avec le token et les infos utilisateur
        res.json({
            token,
            matricule: user.matricule,
            role: user.role,
            message: 'Authentification réussie'
        });

    } catch (error) {
        console.error('[AUTH ERROR] Login:', error.message);
        res.status(500).json({ message: 'Erreur lors de l\'authentification' });
    }
};

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

const forgotPassword = async (req, res) => {
    const { matricule, email } = req.body;

    if (!matricule || !email) return res.status(400).json({ message: 'Veuillez fournir votre matricule et votre e-mail.' });

    try {
        const [rows] = await pool.execute('SELECT * FROM users WHERE matricule = ? AND email = ?', [matricule, email]);
        if (rows.length === 0) {
            return res.status(404).json({ message: 'Matricule ou e-mail introuvable ou incorrect.' });
        }

        const user = rows[0];

        // Generate a 6-digit code
        const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
        // Expires in 15 minutes
        const expires = new Date(Date.now() + 15 * 60 * 1000);

        await pool.execute('UPDATE users SET reset_code = ?, reset_expires = ? WHERE id = ?', [resetCode, expires, user.id]);

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

        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                console.log('\n======================================================');
                console.log('⚠️ ERREUR D\'ENVOI E-MAIL');
                console.log(`L'email n'a pas pu être envoyé. Avez-vous configuré le fichier .env ?`);
                console.log('Erreur technique :', error.message);
                console.log(`Par sécurité, voici le code pour ${user.matricule} : ${resetCode}`);
                console.log('======================================================\n');
            } else {
                console.log('📧 E-MAIL ENVOYÉ avec succès à : ' + user.email);
            }
        });

        // We return success even if email transport fails (for dev/test purposes)
        // In a real app, you might want to return an error if sending fails.
        // For development, we return the masked email.
        const maskedEmail = user.email.replace(/(.{2})(.*)(?=@)/, (_, p1, p2) => p1 + p2.replace(/./g, '*'));
        res.json({ message: `Un code a été envoyé à l'adresse e-mail : ${maskedEmail}` });

    } catch (error) {
        console.error('[AUTH ERROR] Forgot Password:', error.message);
        res.status(500).json({ message: 'Erreur lors de la demande de réinitialisation' });
    }
};

const resetPassword = async (req, res) => {
    const { matricule, code, newPassword } = req.body;

    if (!matricule || !code || !newPassword) {
        return res.status(400).json({ message: 'Tous les champs sont requis.' });
    }

    try {
        const [rows] = await pool.execute('SELECT * FROM users WHERE matricule = ? AND reset_code = ?', [matricule, code]);

        if (rows.length === 0) {
            return res.status(400).json({ message: 'Code de vérification invalide ou incorrect.' });
        }

        const user = rows[0];

        // Check expiration
        if (new Date() > new Date(user.reset_expires)) {
            return res.status(400).json({ message: 'Le code de vérification a expiré. Veuillez refaire une demande.' });
        }

        // Hash new password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        // Update password and clear code
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
