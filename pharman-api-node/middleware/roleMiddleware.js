const authorizeRoles = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user || !req.user.role) {
            return res.status(401).json({ message: 'Accès non autorisé : Utilisateur non identifié' });
        }

        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({ 
                message: `Accès refusé : Votre rôle (${req.user.role}) ne permet pas d'accéder à cette ressource.` 
            });
        }

        next();
    };
};

module.exports = authorizeRoles;
