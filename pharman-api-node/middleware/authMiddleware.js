const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
    // Read the token from the Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Accès non autorisé : Token manquant' });
    }

    const token = authHeader.split(' ')[1];

    try {
        const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_key_12345';
        const decoded = jwt.verify(token, JWT_SECRET);
        
        // Inject into req.user
        req.user = {
            id: decoded.id,
            matricule: decoded.matricule,
            role: decoded.role
        };
        
        next();
    } catch (error) {
        return res.status(401).json({ message: 'Accès non autorisé : Token invalide ou expiré' });
    }
};

module.exports = authMiddleware;
