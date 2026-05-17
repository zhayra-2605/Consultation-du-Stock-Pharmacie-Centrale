# Deep Dive : Analyse du Moteur IA (`pharmacie_ml_engine`)

Ce document explique les détails mathématiques et algorithmiques de la partie Intelligence Artificielle.

---

## 1. Pipeline de Données (ETL en Python)
**Fichier :** `pharmacie_ml_engine/data_prep.py`

### Nettoyage et Engineering
*   **Lignes 57-69** :
```python
mediane = df[df['VENTE_REGION'] > 0].groupby(['CODE_BESOIN', 'hub_id'])['VENTE_REGION'].median()
df['VENTE_REGION'] = df['VENTE_REGION'].fillna(df['vente_med'])
```

#### 📘 Lexique & Variables :
*   **`df`** : Abréviation de "DataFrame". C'est l'objet principal en Python pour manipuler des tableaux de données (bibliothèque Pandas).
*   **`groupby`** : Regroupe les données. Ici, on groupe par produit et par région pour calculer une médiane spécifique à chaque cas.
*   **`median()`** : La valeur du milieu. On utilise la médiane plutôt que la moyenne car elle est moins sensible aux valeurs aberrantes (ex: une commande exceptionnelle énorme).
*   **`fillna`** : Signifie "Remplir les vides (N/A)". S'il manque une donnée de vente, on la remplace par la médiane calculée.

---

## 2. L'Algorithme XGBoost
**Fichier :** `pharmacie_ml_engine/train_models.py`

### Les Hyperparamètres
```python
model = xgb.XGBClassifier(
    n_estimators=500,
    max_depth=8,
    scale_pos_weight=spw
)
```

#### 📘 Lexique & Variables :
*   **`n_estimators`** : Le nombre d'arbres de décision que l'IA va construire. Plus il y en a, plus le modèle est précis, mais plus il est lent à entraîner.
*   **`max_depth`** : La profondeur maximale de chaque arbre. Si c'est trop élevé (ex: 20), l'IA va "apprendre par cœur" les données et ne saura pas prédire le futur (**Overfitting**).
*   **`scale_pos_weight`** : Un réglage crucial. Comme les ruptures de stock sont rares (heureusement !), l'IA pourrait avoir tendance à les ignorer. Ce paramètre lui dit de donner plus d'importance aux cas de rupture.

#### 🎓 Question du Jury :
> *"Qu'est-ce que l'Overfitting (Surapprentissage) ?"*
> **Réponse** : *"C'est quand le modèle apprend les bruits et les erreurs du passé au lieu des tendances générales. Il est excellent sur les données d'entraînement mais très mauvais en situation réelle. Nous le contrôlons avec `max_depth` et le `learning_rate`."*

---

## 3. Évaluation et Métriques
**Fichier :** `pharmacie_ml_engine/evaluation.py`

#### 📘 Lexique & Variables :
*   **`MAE`** : Mean Absolute Error. L'écart moyen entre la prédiction et la réalité. Si MAE = 10, l'IA se trompe de 10 boîtes en moyenne.
*   **`RMSE`** : Root Mean Square Error. Similaire à la MAE, mais pénalise beaucoup plus les "grosses" erreurs.
*   **`R²`** : Indique la qualité globale. 1.0 = Perfection. 0.0 = Aléatoire.

#### 🎓 Question du Jury :
> *"Quelle métrique est la plus importante pour la Pharmacie Centrale ?"*
> **Réponse** : *"Le `Recall` (Rappel) pour la classification. Il vaut mieux prédire une rupture qui n'arrive pas (Fausse alerte) que de rater une rupture réelle qui mettrait en danger l'approvisionnement des hôpitaux."*


---
*Document de préparation intensive - Section IA.*
