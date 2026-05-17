/**
 * middleware/readOnlyMiddleware.js
 * Middleware pour restreindre l'accès en lecture seule.
 * Responsabilité : Empêcher les modifications (POST, PUT, DELETE) pour les utilisateurs ayant le rôle VIEWER.
 */
const readOnlyMiddleware = (req, res, next) => {
    // Si l'utilisateur est identifié et possède le rôle 'VIEWER'
    if (req.user && req.user.role === 'VIEWER') {
        
        // 1. Bloquer toutes les méthodes qui modifient les données
        if (req.method !== 'GET') {
            return res.status(403).json({ message: 'Accès refusé (lecture seule)' });
        }

        // 2. Intercepter la réponse pour filtrer éventuellement des données sensibles
        const oldJson = res.json;
        res.json = function (data) {
            // Ici, on pourrait supprimer des colonnes comme 'PRIX_ACHAT' avant d'envoyer au client
            return oldJson.call(this, data);
        };
    }
    
    next(); // Autoriser la suite si ce n'est pas un viewer ou si c'est une requête GET
};

module.exports = readOnlyMiddleware;

