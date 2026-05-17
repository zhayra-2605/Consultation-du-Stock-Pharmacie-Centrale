# Documentation Technique Complète : Projet Pharmacie Centrale

Ce document est conçu pour vous servir de support principal lors de votre soutenance technique. Il détaille l'intégralité du projet, dossier par dossier, fichier par fichier.

---

## 1. Présentation Générale
Le projet **Pharmacie Centrale** est une solution de Business Intelligence (BI) et d'Intelligence Artificielle (IA) pour l'optimisation des stocks.

### Technologies Utilisées :
*   **Backend** : Node.js / Express (API REST).
*   **Frontend** : React.js (Interface réactive).
*   **IA/ML** : Python (XGBoost) pour les prédictions.
*   **Base de Données** : MySQL (Entrepôt de données).

---

## 2. Architecture Globale (3-Tier)
L'application est structurée en trois couches indépendantes :
1.  **Couche Présentation (Frontend)** : Gère l'interaction avec l'utilisateur.
2.  **Couche Logique (Backend)** : Reçoit les requêtes, vérifie les droits et interroge la DB.
3.  **Couche Données & Prédiction** : Stocke l'historique et génère des prévisions.

---

## 3. Analyse Détaillée : Backend (`pharman-api-node`)

### 📂 Racine & Configuration
*   **`server.js`** : Point d'entrée. Initialise Express, configure les CORS (pour autoriser le React) et lance le serveur sur le port 8000.
*   **`.env`** : Contient les secrets (Identifiants DB, Clés API e-mail). **Ne jamais le donner au jury, mais expliquer son rôle de sécurité.**

### 📂 `utils/` (Outils de base)
*   **`db.js`** : 
    *   *Utilité* : Gère le **Pool de connexions** MySQL.
    *   *Fonctions* : `initializeRegions()` (charge les régions dynamiquement), `getRegionStockSumFromRow()` (calcule les stocks par région).
*   **`predictionUtils.js`** : Formate les données brutes de l'IA pour qu'elles soient lisibles par le dashboard (calcul de pourcentage d'adéquation, alertes critiques).

### 📂 `middleware/` (Sécurité)
*   **`authMiddleware.js`** : Intercepte chaque requête pour vérifier si l'utilisateur est authentifié.
*   **`roleMiddleware.js`** : Restreint l'accès selon le profil (`ADMIN`, `UBD`, `VIEWER`).
*   **`readOnlyMiddleware.js`** : Empêche toute modification de données pour les profils en lecture seule.

### 📂 `controllers/` (Logique Métier)
*   **`authController.js`** : Gère le login, hache les mots de passe avec `bcrypt` et gère l'envoi de codes de récupération avec `nodemailer`.
*   **`productController.js`** : Moteur de recherche multicritère et calcul des moyennes de vente (MM3, MM6, MM12).
*   **`stockController.js`** : Gère la répartition régionale complexe et les détails des lots/péremptions.
*   **`statsController.js`** : Génère les graphiques d'évolution annuelle et mensuelle via des requêtes SQL avancées (CTE).
*   **`predictionController.js`** : Récupère les prédictions IA et les met en cache (`node-cache`) pour des performances ultra-rapides.

---

## 4. Analyse Détaillée : Frontend (`pharman-ui`)

### 📂 `src/components/` (Interface)
*   **`Dashboard.js`** : Page principale affichant les indicateurs clés (KPIs) et les prédictions.
*   **`CalendrierModal.js` / `AlertsModal.js`** : Composants réutilisables affichant des détails spécifiques sans recharger la page.
*   **Logique Props/State** : Les données sont récupérées via `fetch` depuis l'API et stockées dans le `state` de React.

### 📂 `src/routes/`
*   Gère la navigation entre la page de Login et le Dashboard. Utilise `ProtectedRoute` pour empêcher l'accès sans connexion.

---

## 5. Analyse Détaillée : ML Engine (`pharmacie_ml_engine`)

C'est ici que l'intelligence artificielle est développée en Python.

*   **`data_prep.py`** : Nettoie les données SQL (gestion des valeurs nulles, encodage des catégories).
*   **`train_models.py`** : Entraîne l'algorithme **XGBoost**. 
    *   *Pourquoi XGBoost ?* Car il est très performant sur les données tabulaires de pharmacie.
*   **`evaluation.py`** : Calcule la précision du modèle (Accuracy, RMSE, R²).
*   **`batch_predict.py`** : Génère les prévisions pour les 3 prochains mois et les enregistre dans la table `ml_predictions_cache` pour que le backend puisse les lire.

---

## 6. Schéma de Données (Base de Données)
Le projet utilise un **Schéma en Étoile (Star Schema)** simplifié pour la BI :
*   **Tables de Faits** : `fact_mouvements` (ventes/stocks par mois), `fact_livraisons`.
*   **Tables de Dimensions** : `dim_produit`, `dim_besoin`, `dim_fournisseur`.
*   **Tables Techniques** : `users` (comptes), `ref_regions` (config régions), `ml_predictions_cache`.

---

## 7. Questions Types pour la Soutenance

### "Pourquoi Node.js pour le backend ?"
*   *Réponse* : "Pour sa rapidité de traitement des requêtes asynchrones (I/O non bloquant) et sa facilité d'intégration avec le frontend React (écosystème Full JS)."

### "Comment garantissez-vous la sécurité des données ?"
*   *Réponse* : "Nous utilisons des hashs `bcrypt` pour les mots de passe, un `authMiddleware` pour protéger les routes, et des `roleMiddleware` pour limiter les actions selon le profil utilisateur."

### "Qu'est-ce que le 'Stock Converti' ?"
*   *Réponse :* "C'est une normalisation. Un besoin peut regrouper plusieurs produits (ex: boîtes de 10 et 30 comprimés). On convertit tout dans l'unité du besoin pour avoir une vue globale cohérente."

---
*Document maître de documentation technique - Généré le 12 Mai 2026.*
