const readOnlyMiddleware = (req, res, next) => {
    if (req.user && req.user.role === 'VIEWER') {
        // Bloquer toutes les méthodes sauf GET
        if (req.method !== 'GET') {
            return res.status(403).json({ message: 'Accès refusé (lecture seule)' });
        }

        // Intercepter et modifier la réponse (filtrage de données sensibles si nécessaire)
        // Ceci est une implémentation générique qui peut être adaptée par route
        const oldJson = res.json;
        res.json = function (data) {
            // Logique de filtrage des données sensibles (prix internes, etc.)
            // Exemples: 
            // if (Array.isArray(data)) data.forEach(item => { delete item.PRIX_INTERNE; });
            // else if (data && typeof data === 'object') { delete data.PRIX_INTERNE; }
            
            return oldJson.call(this, data);
        };
    }
    next();
};

module.exports = readOnlyMiddleware;
