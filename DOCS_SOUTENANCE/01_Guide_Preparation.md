# Guide de Préparation : Soutenance Technique - Pharmacie Centrale

Ce document sert de feuille de route pour réviser et comprendre en profondeur le code du projet en vue de la soutenance technique.

---

## 1. Architecture du Projet (High-Level)

Le projet est structuré comme une application d'entreprise moderne utilisant le couplage de technologies JS (Web) et Python (Data Science).

### Schéma de flux :
`Utilisateur` ↔ `Frontend (React)` ↔ `Backend (Node/Express)` ↔ `Base de Données (MySQL)` ↔ `Engine ML (Python)`

---



## 2. Revue Détillée par Dossier

### 📂 pharman-api-node (Backend)
*C'est ici que réside la sécurité et la logique métier.*

| Dossier/Fichier | Rôle | Points Clés à Réviser |
| :--- | :--- | :--- |
| `server.js` | Point d'entrée | Configuration Express, CORS, Import des routes. |
| `controllers/` | Logique métier | Traitement des requêtes, calculs, appels DB (ex: `authController.js`). |
| `routes/` | Définition des APIs | Mapping des URLs vers les controllers. |
| `middleware/` | Sécurité/Validation | Vérification des jetons (JWT), droits d'accès (ex: `readOnlyMiddleware.js`). |
| `utils/` | Outils partagés | Fonctions utilitaires comme le formatage des données ou logs. |

### 📂 pharman-ui (Frontend)
*L'interface réactive et l'expérience utilisateur.*

| Dossier/Fichier | Rôle | Points Clés à Réviser |
| :--- | :--- | :--- |
| `src/components/` | UI réutilisable | Props, State local, Modals (ex: `CalendrierModal.js`). |
| `src/routes/` | Navigation | React Router, protection des routes privées. |
| `public/` | Assets statiques | Images, icônes, manifest. |

### 📂 pharmacie_ml_engine (Intelligence Artificielle)
*La partie prédictive basée sur les données.*

| Dossier/Fichier | Rôle | Points Clés à Réviser |
| :--- | :--- | :--- |
| `data_prep.py` | Nettoyage | Gestion des valeurs manquantes, encodage des variables. |
| `train_models.py` | Apprentissage | Algorithme XGBoost, séparation train/test. |
| `evaluation.py` | Métriques | Précision (Accuracy), MAE, RMSE. |
| `config.py` | Paramètres | Chemins des fichiers, hyperparamètres. |

---

## 3. Préparation aux Questions du Jury

### Questions sur le Code ("Line-by-Line")
*   **"Pourquoi ce `try...catch` ?"**
    *   *Réponse :* "Pour assurer la résilience de l'application. Si une erreur survient (ex: DB hors ligne), on renvoie un code d'erreur propre (500) au lieu de faire planter le serveur."
*   **"Que fait `useEffect` ici (React) ?"**
    *   *Réponse :* "Il déclenche le chargement des données dès que le composant est affiché à l'écran."
*   **"Pourquoi XGBoost ?"**
    *   *Réponse :* "C'est un algorithme performant sur les données tabulaires (comme nos stocks), gérant très bien les relations non-linéaires et les valeurs manquantes."

### Questions sur l'Architecture
*   **"Pourquoi avoir séparé le ML du Backend Node ?"**
    *   *Réponse :* "Pour le principe de séparation des responsabilités. Node est excellent pour les entrées/sorties rapides (API), tandis que Python est le standard pour les calculs mathématiques lourds (IA)."

---

## 4. Conseils de Présentation
1.  **Démonstration de Confiance** : Si vous ne connaissez pas une ligne exacte, expliquez le **but** du bloc de code plutôt que sa syntaxe.
2.  **Vocabulaire Technique** : Utilisez des termes comme "Asynchrone", "Stateless", "Middleware", "Feature Engineering".
3.  **Lien avec le Métier** : Rappelez toujours que le code sert à résoudre un problème de la Pharmacie Centrale (optimisation des stocks).

---
*Document généré pour la préparation de soutenance - Mai 2026.*
