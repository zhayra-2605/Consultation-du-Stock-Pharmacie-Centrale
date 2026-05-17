/**
 * middleware/roleMiddleware.js
 * Middleware de contrôle d'accès basé sur les rôles (RBAC).
 * Responsabilité : Autoriser l'accès uniquement aux rôles spécifiés.
 */
const authorizeRoles = (...allowedRoles) => {
    return (req, res, next) => {
        // 1. Vérifier si l'utilisateur est bien connecté (passé par authMiddleware)
        if (!req.user || !req.user.role) {
            return res.status(401).json({ message: 'Accès non autorisé : Utilisateur non identifié' });
        }

        // 2. Vérifier si le rôle de l'utilisateur fait partie des rôles autorisés pour cette route
        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({ 
                message: `Accès refusé : Votre rôle (${req.user.role}) ne permet pas d'accéder à cette ressource.` 
            });
        }

        next(); // Accès autorisé, passer à la suite
    };
};

module.exports = authorizeRoles;

