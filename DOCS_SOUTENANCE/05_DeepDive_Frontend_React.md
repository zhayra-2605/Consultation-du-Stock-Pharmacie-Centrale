# Deep Dive : Analyse du Frontend (`pharman-ui`)

Ce document explique le fonctionnement interne de l'interface utilisateur en React.

---

## 1. Cycle de Vie et Hooks
**Fichier :** `pharman-ui/src/pages/Dashboard.js`

### `useState` (Gestion de l'état local)
*   **Lignes 21-25** :
```javascript
const [mainData, setMainData] = useState([]);
const [selectedProduct, setSelectedProduct] = useState(null);
```

#### 📘 Lexique & Variables :
*   **`useState`** : Un "Hook" React. Il permet de créer une variable dont React va surveiller la valeur.
*   **`mainData`** : La variable qui contient les résultats.
*   **`setMainData`** : La seule fonction autorisée pour modifier `mainData`. Si on l'utilise, React rafraîchit l'écran.
*   **`[]`** : Indique que la valeur par défaut est un tableau vide.

---

## 2. Communication API
**Fichier :** `pharman-ui/src/services/api.js`

### Configuration Axios
```javascript
search: (critere, valeur) => axios.get(`/search?critere=${critere}&valeur=${valeur}`)
```

#### 📘 Lexique & Variables :
*   **`axios`** : Une bibliothèque pour envoyer des requêtes HTTP (comme aller chercher des données sur un site).
*   **`get`** : La méthode HTTP pour "lire" des données.
*   **`=>`** : Une fonction fléchée (Arrow Function). C'est une façon moderne et courte d'écrire une fonction en JavaScript.
*   **`${...}`** : Une "Template String". Permet d'insérer des variables directement dans une phrase ou une URL.

---

## 3. Visualisation de Données
**Fichier :** `pharman-ui/src/components/StatsDashboard.js`

#### 🎓 Question du Jury :
> *"Comment rendez-vous les graphiques dynamiques ?"*
> **Réponse** : *"Le composant graphique reçoit les données via ses `props`. Dès que l'utilisateur sélectionne un nouveau produit, les `props` changent, et Chart.js redessine automatiquement le graphique avec une animation."*

---

## 4. Gestion des Rôles
**Fichier :** `Dashboard.js` (Ligne 235)

#### 📘 Lexique & Variables :
*   **`currentView === 'situation'`** : Un test d'égalité. Si c'est vrai, on affiche la vue IA.
*   **`? ... : ...`** : L'opérateur "Ternaire". C'est un raccourci pour : `SI (condition) ALORS (vue A) SINON (vue B)`.

#### 🎓 Question du Jury :
> *"Est-ce que le masquage d'un bouton suffit pour la sécurité ?"*
> **Réponse** : *"Non, c'est une sécurité visuelle pour l'UX. La vraie sécurité est dans le Backend (Node.js) qui rejette la requête si le matricule de l'utilisateur n'a pas les droits ADMIN."*


---
*Section Frontend terminée - Prêt pour la démo.*
