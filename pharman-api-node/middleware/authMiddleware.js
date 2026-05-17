/**
 * middleware/authMiddleware.js
 * Middleware de vérification de l'identité.
 * Responsabilité : Vérifier si la requête contient un jeton valide et identifier l'utilisateur.
 */
const { pool } = require('../utils/db');

const authMiddleware = async (req, res, next) => {
    // 1. On récupère le jeton dans l'en-tête "Authorization" (format: Bearer <token>)
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Accès non autorisé : Token manquant' });
    }

    const token = authHeader.split(' ')[1]; // Extraction du matricule utilisé comme jeton

    try {
        // 2. On vérifie si ce matricule existe dans la base de données pour confirmer la session
        const [rows] = await pool.execute('SELECT id, matricule, role FROM users WHERE matricule = ?', [token]);
        
        if (rows.length === 0) {
            return res.status(401).json({ message: 'Accès non autorisé : Session invalide' });
        }

        // 3. On injecte les données de l'utilisateur dans l'objet 'req' 
        // Cela permet aux routes suivantes de savoir QUI fait la requête et quel est son rôle.
        req.user = rows[0];
        
        next(); // On passe au middleware suivant ou au controller
    } catch (error) {
        return res.status(401).json({ message: 'Erreur lors de la vérification de l\'identité' });
    }
};

module.exports = authMiddleware;

