# Implémentation du Système d'Analyse Prédictive (Sprint 3)

Ce plan décrit l'implémentation complète du système d'analyse prédictive ("Situations & Alertes") en respectant strictement l'architecture cible (Feature Store > Batch ML > API Cache > React).

## User Review Required
> [!IMPORTANT]
> Les codes générés (SQL, Python, Node.js, React) sont détaillés ci-dessous. Veuillez les examiner. **Si vous approuvez ce plan**, je procéderai à l'écriture de ces fichiers directement dans votre espace de travail et j'installerai les dépendances nécessaires.
> Si vous souhaitez l'utiliser pour votre rapport PFE, vous pouvez copier la structure ci-dessous.

---

## 1. Structure des Dossiers Cible

```text
c:\wamp64\www\Pharmacie Centrale\
├── pharmacie_ml_engine/               # [NOUVEAU] Moteur Machine Learning
│   ├── requirements.txt               # Dépendances Python
│   ├── data_prep.py                   # Phase 1: Feature Engineering
│   ├── train_models.py                # Phase 2: Entraînement des modèles
│   ├── batch_predict.py               # Phase 2: Exécution Batch (nuit)
│   └── models/                        # Modèles .pkl générés
│
├── pharman-api-node/                  # Backend API existant
│   ├── routes/     
│   │   └── api.js                     # [MODIFIÉ] Nouvel Endpoint avec Cache
│   └── package.json                   # [MODIFIÉ] Ajout de node-cache
│
├── pharman-ui/                        # Frontend UI existant
│   └── src/components/Situation/
│       ├── SituationView.js           # [MODIFIÉ] Fetch de l'API & Gestion d'état
│       ├── CriticalNeedsList.js       # [MODIFIÉ] Rendu des prédictions réelles
│       ├── MetricGauges.js            # [MODIFIÉ] Liaison aux métriques
│       └── InteractiveMap.js          # [MODIFIÉ] Logique de Heatmap
│
└── ml_schema.sql                      # [NOUVEAU] Scripts SQL (Feature Store + Cache)
```

---

## 2. Schéma SQL (Phase 1 & 2)

Fichier : `ml_schema.sql`
> [!NOTE]
> Ces tables permettent de découpler le calcul lourd (Python) de la lecture rapide (Node.js).

```sql
-- 1. FEATURE STORE : Historique préparé pour le ML
CREATE TABLE IF NOT EXISTS phct_ml_features (
    id INT AUTO_INCREMENT PRIMARY KEY,
    hub_id VARCHAR(50),
    code_besoin VARCHAR(50),
    label_besoin VARCHAR(255),
    annee INT,
    mois INT,
    stock_total DECIMAL(10,2),
    vente_mensuelle DECIMAL(10,2),
    couverture FLOAT, -- stock / ventes (si ventes > 0)
    rupture_reelle INT(1), -- 1 si stock tombé à 0 le mois suivant
    date_calcul TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_phct_features ON phct_ml_features(hub_id, code_besoin);

-- 2. CACHE DES PREDICTIONS : Résultat du ML Batch
CREATE TABLE IF NOT EXISTS ml_predictions_cache (
    id INT AUTO_INCREMENT PRIMARY KEY,
    hub_id VARCHAR(50),
    code_besoin VARCHAR(50),
    label_besoin VARCHAR(255),
    periode_mois INT, -- 3, 6, 12
    prediction_couverture FLOAT, -- Régression Linéaire
    risque_rupture_prob FLOAT, -- Régression Logistique (probabilité)
    rupture_predite INT(1), -- Régression Logistique (0 ou 1)
    trend VARCHAR(20), -- 'up', 'down', 'stable'
    days_to_stockout INT, -- Calculé via vitesse de consommation
    date_prediction TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_pred_cache ON ml_predictions_cache(hub_id, periode_mois);
```

---

## 3. Scripts Python (Phase 1 & 2)

**Fichier : `pharmacie_ml_engine/data_prep.py`** (Extrait du script)
```python
import mysql.connector
import pandas as pd
import numpy as np

def prepare_features():
    conn = mysql.connector.connect(host='localhost', user='root', password='', database='pharmacie_centrale')
    query = """
        SELECT db.CODE_BESOIN, db.LIBELLE, srb.REGION AS hub_id, srb.ANNEE, srb.MOIS, 
               srb.STOCK_REGION as stock, srb.VENTE_REGION as vente
        FROM stock_region_besoin srb
        JOIN dim_besoin db ON srb.CODE_BESOIN = db.CODE_BESOIN
        WHERE srb.REGION != 'NATIONAL'
    """
    df = pd.read_sql(query, conn)
    
    # Feature Engineering
    df['couverture'] = np.where(df['vente'] > 0, df['stock'] / df['vente'], 999)
    # Règle : Rupture = stock < 10 au mois suivant
    df['rupture_reelle'] = (df.groupby(['hub_id', 'CODE_BESOIN'])['stock'].shift(-1) < 10).astype(int)
    
    # Remplir phct_ml_features (Feature Store)
    cursor = conn.cursor()
    cursor.execute("TRUNCATE TABLE phct_ml_features")
    for _, row in df.dropna().iterrows():
        cursor.execute(
            "INSERT INTO phct_ml_features (hub_id, code_besoin, label_besoin, annee, mois, stock_total, vente_mensuelle, couverture, rupture_reelle) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)",
            (row['hub_id'], row['CODE_BESOIN'], row['LIBELLE'], row['ANNEE'], row['MOIS'], row['stock'], row['vente'], row['couverture'], row['rupture_reelle'])
        )
    conn.commit()
```

**Fichier : `pharmacie_ml_engine/train_models.py`**
```python
from sklearn.linear_model import LogisticRegression, LinearRegression
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, r2_score
import joblib

# Entraînement sur les données de phct_ml_features...
# Model 1 & 2
log_reg = LogisticRegression() # Target: rupture_reelle
lin_reg = LinearRegression() # Target: couverture

# ... fitting ...
joblib.dump(log_reg, 'models/model_rupture.pkl')
joblib.dump(lin_reg, 'models/model_coverage.pkl')
```

**Fichier : `pharmacie_ml_engine/batch_predict.py`** (Exécution de nuit)
*Ce script charge les `.pkl`, lit les derniers mois du feature store et prédit l'avenir, puis écrit dans `ml_predictions_cache`.*

---

## 4. Backend Node.js API (Phase 3)

**Fichier : `pharman-api-node/routes/api.js`**
> [!TIP]
> Nous utiliserons `node-cache` (à installer via `npm install node-cache`) pour obtenir des temps de réponse ultra-courts (< 10ms).

```javascript
// En haut de api.js
const NodeCache = require("node-cache");
const predictionsCache = new NodeCache({ stdTTL: 86400 }); // TTL = 24h (86400 sec)

// NOUVEL ENDPOINT : GET /api/situation/predictions
router.get('/situation/predictions', async (req, res) => {
    const { hubId, period = 3 } = req.query;
    const targetHub = hubId || 'National';
    const cacheKey = `preds_${targetHub}_${period}`;

    // 1. Lire depuis la mémoire vive d'abord (< 2ms)
    const cachedData = predictionsCache.get(cacheKey);
    if (cachedData) return res.json(cachedData);

    try {
        // 2. Si pas en mémoire, lire de la table SQL `ml_predictions_cache` (< 50ms)
        let sql = `SELECT * FROM ml_predictions_cache WHERE periode_mois = ?`;
        let params = [period];
        
        if (targetHub !== 'National') {
            sql += ` AND hub_id = ?`;
            params.push(targetHub);
        }
        
        const [rows] = await pool.execute(sql, params);

        // Agréger les métriques globales + formater les listes
        let stockouts = 0;
        let adequacySum = 0;

        const criticalNeeds = rows.map(r => {
            if (r.rupture_predite === 1) stockouts++;
            adequacySum += (r.prediction_couverture > 100 ? 100 : r.prediction_couverture);
            
            return {
                code: r.code_besoin,
                label: r.label_besoin,
                coverage: Math.round(r.prediction_couverture),
                trend: r.trend,
                risk: r.risque_rupture_prob,
                daysToStockout: r.days_to_stockout,
                color: r.rupture_predite === 1 ? 'var(--danger-red)' : (r.prediction_couverture < 30 ? '#f59e0b' : 'var(--bio-green-primary)')
            };
        }).sort((a,b) => b.risk - a.risk);

        const adequacy = rows.length ? Math.round(adequacySum / rows.length) : 0;
        const gaps = criticalNeeds.filter(c => c.trend === 'down').length;

        const responseData = {
            metrics: { adequacy, stockouts, gaps },
            criticalNeeds: criticalNeeds.slice(0, 10), // Top 10
            hubHealth: adequacy < 30 ? 'critical' : (adequacy < 70 ? 'warning' : 'stable')
        };

        // Sauvegarder dans node-cache pour les prochains appels
        predictionsCache.set(cacheKey, responseData);
        
        res.json(responseData);
    } catch (error) {
        console.error("API Prediction Error:", error);
        res.status(500).json({ error: "Erreur de chargement des prédictions" });
    }
});
```

---

## 5. Composants Frontend React (Phase 4)

**Fichier : `pharman-ui/src/components/Situation/SituationView.js`**
Gestion de l'API avec état central.
```javascript
import React, { useState, useEffect } from 'react';
// ... imports ...

const SituationView = ({ onBack }) => {
  const [selectedHub, setSelectedHub] = useState(null);
  const [period, setPeriod] = useState(3);
  const [mlData, setMlData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const url = `http://localhost:8000/api/situation/predictions?hubId=${selectedHub || ''}&period=${period}`;
        const res = await fetch(url);
        const data = await res.json();
        setMlData(data);
      } catch (e) {
        console.error("Erreur serveur API", e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [selectedHub, period]); // Se relance si le Hub ou la Période change !

  return (
    // ... JSX Header ...
    <MetricGauges data={mlData?.metrics} isLoading={loading} />
    <div className="situation-main-grid">
      <InteractiveMap 
         selectedHub={selectedHub} 
         onHubClick={setSelectedHub} 
         hubHealth={mlData?.hubHealth} // Pour les couleurs Heatmap
      />
      <CriticalNeedsList 
         hubId={selectedHub} 
         period={period}
         onPeriodChange={setPeriod}
         onHubChange={setSelectedHub}
         needs={mlData?.criticalNeeds || []}
         isLoading={loading}
      />
    </div>
  );
};
```

**Fichier : `InteractiveMap.js` (Heatmap Dynamique)**
```javascript
// Au lieu d'utiliser hub.color fixe, on base la couleur sur la santé (si non sélectionné)
const getFillColor = (hubId) => {
    // Si c'est le hub cliqué, on le met en évidence
    if (selectedHub === hubId) return hub.color; // Couleur originelle
    
    // Mode Heatmap Global:
    if (hubHealth === 'critical') return 'rgba(225, 29, 72, 0.85)'; // Rouge
    if (hubHealth === 'warning') return 'rgba(245, 158, 11, 0.85)'; // Orange
    return 'rgba(0, 168, 89, 0.85)'; // Vert (Stable)
};
```

---

## 6. Instructions de Déploiement (End-to-End)

1. **Base de données :**
   Exécuter `ml_schema.sql` sur MySQL pour créer les tables vides.
2. **Setup Python :**
   ```bash
   cd "pharmacie_ml_engine"
   pip install -r requirements.txt
   python data_prep.py
   python train_models.py
   python batch_predict.py
   ```
3. **Setup Node.js :**
   ```bash
   cd "pharman-api-node"
   npm install node-cache
   # Redémarrer l'API
   ```
4. **Tester :**
   Aller sur le Dashboard React, ouvrir le module. Modifier le filtre "Période" à 12 mois : l'appel réseau part et la carte devrait changer de couleur instantanément (lu depuis le cache).

---
## Open Questions
Souhaitez-vous que je modifie et génère immédiatement ces fichiers réels sur votre disque dur (`InteractiveMap.js`, `api.js`, Python scripts, etc.) ?
