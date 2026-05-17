/**
 * server.js
 * Point d'entrée principal du backend Node.js.
 * Responsabilité : Initialiser le serveur, configurer les middlewares et définir les routes de base.
 */

require('dotenv').config(); // Charge les variables d'environnement depuis le fichier .env
const express = require('express'); // Framework web pour Node.js
const cors = require('cors'); // Middleware pour autoriser les requêtes cross-origin (Frontend <-> Backend)
const apiRoutes = require('./routes/api'); // Import des routes API principales

const app = express(); // Initialisation de l'application Express
const PORT = process.env.PORT || 8000; // Définition du port (depuis .env ou 8000 par défaut)

// --- CONFIGURATION DES MIDDLEWARES ---

// Autorise toutes les origines (CORS) pour que le frontend React puisse communiquer avec l'API
app.use(cors()); 

// Permet au serveur de comprendre les données envoyées au format JSON (body-parser intégré)
app.use(express.json());

// --- DÉFINITION DES ROUTES ---

// Routes liées à l'authentification (Login, Register)
app.use('/api/auth', require('./routes/auth'));

// Routes principales de l'application (Produits, Stocks, Stats, Prédictions)
app.use('/api', apiRoutes);

// Route racine pour vérifier si le serveur fonctionne
app.get('/', (req, res) => {
    res.json({ message: 'Pharmacie Centrale API is running' });
});  

// --- DÉMARRAGE DU SERVEUR ---
app.listen(PORT, () => {
    console.log(`Le serveur est démarré sur le port ${PORT}`);
});

