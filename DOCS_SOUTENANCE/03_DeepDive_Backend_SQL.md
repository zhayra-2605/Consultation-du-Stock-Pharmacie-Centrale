# Deep Dive : Analyse Ultra-Détaillée du Backend (`pharman-api-node`)

Ce document descend au niveau "moléculaire" du code pour expliquer les mécanismes complexes.

---

## 1. Logique d'Authentification
**Fichier :** `controllers/authController.js`

### Le Hachage (`bcrypt`)
*   **Lignes 161-162** :
```javascript
const salt = await bcrypt.genSalt(10);
const hashedPassword = await bcrypt.hash(newPassword, salt);
```

#### 📘 Lexique & Variables :
*   **`const`** : Déclare une variable dont la valeur ne changera pas. C'est une bonne pratique de sécurité.
*   **`await`** : Indique à JavaScript d'attendre que l'opération (générer le sel) soit finie avant de passer à la ligne suivante. On ne peut pas hacher sans le sel !
*   **`salt`** : Signifie "Sel" en anglais. C'est une donnée aléatoire ajoutée au mot de passe pour rendre le hash unique.
*   **`hashedPassword`** : Le résultat final (une longue chaîne de caractères illisible).

#### 🎓 Question du Jury :
> *"Pourquoi générer un sel avec `10` rounds ?"*
> **Réponse** : *"Le chiffre 10 représente le 'cost factor'. Plus il est élevé, plus le hachage est lent (donc plus difficile à craquer par un pirate), mais il consomme plus de ressources serveur. 10 est le standard actuel."*

---

## 2. Le Moteur SQL Dynamique
**Fichier :** `controllers/stockController.js`

### La fonction `buildStockDetailsSql`
*   **Lignes 20-25** :
```sql
CASE 
    WHEN LIBELLE_DEPOT LIKE '%TUNIS%' THEN 'TUNIS'
    WHEN LIBELLE_DEPOT LIKE '%SFAX%' THEN 'SFAX'
    ELSE 'AUTRE'
END AS REGION_LOGIQUE
```

#### 📘 Lexique & Variables :
*   **`CASE / WHEN / THEN`** : C'est comme un "SI... ALORS" en programmation. On teste une condition sur le nom du dépôt.
*   **`LIKE`** : Permet de chercher une partie d'un mot (ex: `%TUNIS%` trouvera "Dépôt Tunis Aérien" et "Dépôt Tunis Port").
*   **`AS`** : Renomme le résultat de l'opération en `REGION_LOGIQUE` pour que le code JavaScript puisse le lire facilement.

#### 🎓 Question du Jury :
> *"Que se passe-t-il si un nouveau dépôt est créé à Sousse ?"*
> **Réponse** : *"Il tombera dans la catégorie `AUTRE`. Pour l'intégrer, il suffira d'ajouter une ligne `WHEN LIBELLE_DEPOT LIKE '%SOUSSE%' THEN 'SOUSSE'` dans ce bloc."*

---

## 3. Calculs Statistiques Avancés
**Fichier :** `controllers/productController.js`

### Moyenne Mobile (MM3, MM6, MM12)
*   **Lignes 138-142** :
```javascript
const calcMM = (pHistory, months) => {
    const recent = pHistory.slice(0, months);
    const sum = recent.reduce((acc, val) => acc + val, 0);
    return sum / Math.min(months, pHistory.length);
};
```

#### 📘 Lexique & Variables :
*   **`pHistory`** : (Product History) Tableau contenant les ventes passées du produit.
*   **`slice(0, months)`** : Coupe le tableau pour ne garder que les X derniers mois (ex: les 3 derniers).
*   **`reduce((acc, val) => ...)`** : Parcourt le tableau pour additionner toutes les valeurs. `acc` est l'accumulateur (le total partiel).
*   **`Math.min`** : Prend la plus petite valeur entre deux chiffres.
    *   *Pourquoi ?* Si on veut la moyenne sur 12 mois mais que le produit n'existe que depuis 4 mois, on divise par 4, pas par 12 (pour éviter une moyenne faussement basse).

---

## 4. Concepts SQL "Expert" utilisés

### Les CTE et Row_Number
**Fichier :** `controllers/statsController.js`
*   **Lignes 17-21** :
```sql
ROW_NUMBER() OVER(PARTITION BY ANNEE ORDER BY MOIS DESC) as rn
```

#### 📘 Lexique & Variables :
*   **`ROW_NUMBER()`** : Attribue un numéro de ligne (1, 2, 3...).
*   **`OVER`** : Indique sur quel ensemble de données on travaille.
*   **`PARTITION BY ANNEE`** : Recommence le comptage (1) pour chaque nouvelle année.
*   **`ORDER BY MOIS DESC`** : Trie les mois du plus récent au plus ancien.
*   **`rn`** : Abréviation de "Row Number". La ligne avec `rn = 1` sera toujours le mois le plus récent de l'année.

#### 🎓 Question du Jury :
> *"Pourquoi ne pas utiliser un simple `MAX(MOIS)` ?"*
> **Réponse** : *"Parce que `ROW_NUMBER()` permet de récupérer toute la ligne de données (stock, vente, etc.) associée au mois maximum, ce que `MAX()` ne permet pas sans faire une jointure supplémentaire complexe."*


---
*Fin de l'analyse ultra-détaillée.*
