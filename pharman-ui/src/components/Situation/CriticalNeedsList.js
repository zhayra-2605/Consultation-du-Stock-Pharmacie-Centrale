import React from 'react';

/**
 * CriticalNeedsList — Liste des besoins critiques depuis les prédictions ML.
 * Props:
 *   hubId         : string | null — hub sélectionné
 *   hubName       : string        — nom lisible du hub
 *   onHubChange   : (id) => void  — changer le hub
 *   period        : number        — 3, 6 ou 12 (contrôlé par SituationView)
 *   onPeriodChange: (p) => void   — remonter le changement de période
 *   needs         : array         — données réelles depuis l'API ML
 *   isLoading     : boolean
 */
const CriticalNeedsList = ({
  hubId, hubName, onHubChange,
  period, onPeriodChange,
  needs = [], isLoading
}) => {
  const hubs = [
    { id: 'TUNIS',    name: 'Tunis'    },
    { id: 'KEF',      name: 'El Kef'   },
    { id: 'SOUSSE',   name: 'Sousse'   },
    { id: 'GAFSA',    name: 'Gafsa'    },
    { id: 'SFAX',     name: 'Sfax'     },
    { id: 'MEDENINE', name: 'Médenine' },
  ];

  // Squelette de chargement
  const SkeletonItem = () => (
    <div className="need-item skeleton-item">
      <div className="skeleton-line" style={{ width: '60%', height: 14 }} />
      <div className="skeleton-line" style={{ width: '40%', height: 10, marginTop: 6 }} />
    </div>
  );

  return (
    <div className="needs-card">
      <div className="needs-header">
        <h3 className="section-title">Top 10 Besoins Critiques</h3>
        <p className="section-subtitle">
          Hub actuel : <strong>{hubName || 'National'}</strong>
          {isLoading && <span className="loading-dot"> ↻</span>}
        </p>

        {/* Barre de Contrôle */}
        <div className="control-bar">
          <div className="control-group">
            <label>Région :</label>
            <select
              value={hubId || ''}
              onChange={(e) => onHubChange(e.target.value)}
              className="glass-select"
            >
              <option value="">National (Global)</option>
              {hubs.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
            </select>
          </div>

          <div className="control-group">
            <label>Prévision :</label>
            <div className="period-tabs">
              {[3, 6, 12].map(m => (
                <button
                  key={m}
                  className={`period-btn ${period === m ? 'active' : ''}`}
                  onClick={() => onPeriodChange(m)}
                >
                  {m}m
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="needs-list">
        {/* État chargement */}
        {isLoading && [1,2,3,4,5].map(i => <SkeletonItem key={i} />)}

        {/* État vide */}
        {!isLoading && needs.length === 0 && (
          <div className="empty-state">
            <div className="empty-icon">🤖</div>
            <p>Aucune prédiction disponible.</p>
            <small>Exécutez <code>batch_predict.py</code> pour générer les données.</small>
          </div>
        )}

        {/* Données ML réelles */}
        {!isLoading && needs.map((need, idx) => (
          <div key={need.code} className="need-item">
            <div className="need-info">
              <span className="need-rank">{idx + 1}.</span>
              <div className="need-details">
                <span className="need-label">{need.label}</span>
                <span className="need-code">{need.code}</span>
              </div>
              <div className="need-stats">
                <span className="stat-value" style={{ color: need.color }}>{need.coverage}%</span>
                <span className="stat-label">Couverture</span>
              </div>
              {/* Indicateur de tendance */}
              <span className={`trend-icon trend-${need.trend}`}>
                {need.trend === 'up' ? '↑' : need.trend === 'down' ? '↓' : '→'}
              </span>
            </div>

            <div className="need-progress-container">
              <div className="need-progress-bg">
                <div
                  className="need-progress-bar"
                  style={{ width: `${need.coverage}%`, backgroundColor: need.color }}
                />
              </div>
              {/* Badge rupture (issu de la Régression Logistique) */}
              {need.risk > 0.5 && (
                <div className="alert-badge">
                  ⚠️ Rupture sous {need.daysToStockout}j
                </div>
              )}
            </div>



            {/* Détail explicable IA : Stock Prédit + MM */}
            {(need.stockPredit > 0 || need.mmUtilisee > 0) && (
              <div style={{
                marginTop: '12px',
                padding: '12px',
                background: 'rgba(0,0,0,0.02)',
                borderRadius: '12px',
                fontSize: '0.75rem',
                color: 'var(--text-secondary)',
                display: 'flex',
                gap: '16px',
                border: '1px solid rgba(0,0,0,0.03)'
              }}>
                <div>📦 <strong>Stock Prédit :</strong> {Math.round(need.stockPredit).toLocaleString('fr-FR')} unités</div>
                <div>📊 <strong>MM :</strong> {Math.round(need.mmUtilisee).toLocaleString('fr-FR')} unités/mois</div>
              </div>
            )}
          </div>
        ))}
      </div>

      <style jsx>{`
        .needs-card {
          flex: 1;
          background: var(--glass-white);
          backdrop-filter: blur(24px);
          border-radius: var(--radius-glass-card);
          padding: 24px;
          border: 1px solid var(--glass-border);
          box-shadow: var(--shadow-glass);
          max-height: 800px;
          overflow-y: auto;
          scrollbar-width: thin;
        }

        .section-title   { font-weight: 800; font-size: 1.1rem; margin: 0; }
        .section-subtitle {
          font-size: 0.85rem; color: var(--bio-green-primary);
          font-weight: 700; margin: 4px 0 16px 0;
        }
        .loading-dot { animation: spin 1s linear infinite; display: inline-block; }
        @keyframes spin { to { transform: rotate(360deg); } }

        .control-bar {
          display: flex; flex-direction: column; gap: 12px;
          margin-bottom: 20px; padding-bottom: 16px;
          border-bottom: 1px solid rgba(0,0,0,0.05);
        }
        .control-group {
          display: flex; align-items: center;
          justify-content: space-between; gap: 10px;
        }
        .control-group label {
          font-size: 0.75rem; font-weight: 800;
          color: var(--text-muted); text-transform: uppercase;
        }

        .glass-select {
          background: rgba(255,255,255,0.5);
          border: 1px solid var(--glass-border);
          border-radius: 8px; padding: 6px 12px;
          font-size: 0.85rem; font-weight: 700;
          color: var(--text-primary); outline: none; max-width: 140px;
        }

        .period-tabs {
          display: flex; background: rgba(0,0,0,0.05);
          border-radius: 10px; padding: 2px;
        }
        .period-btn {
          border: none; background: none; padding: 4px 10px;
          font-size: 0.75rem; font-weight: 800;
          color: var(--text-muted); cursor: pointer;
          border-radius: 8px; transition: all 0.3s;
        }
        .period-btn.active {
          background: white; color: var(--bio-green-primary);
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }

        .needs-list { display: flex; flex-direction: column; gap: 12px; }

        .need-item {
          background: rgba(255,255,255,0.4);
          border: 1px solid rgba(255,255,255,0.6);
          border-radius: 12px; padding: 12px;
          transition: var(--transition-fluid);
        }
        .need-item:hover { background: white; transform: scale(1.02); }

        .need-info { display: flex; align-items: center; gap: 12px; margin-bottom: 8px; }
        .need-rank { font-weight: 900; color: var(--text-muted); width: 24px; }
        .need-details { flex: 1; display: flex; flex-direction: column; }
        .need-label  { font-weight: 800; font-size: 0.9rem; color: var(--text-primary); }
        .need-code   { font-size: 0.72rem; color: var(--text-muted); font-family: monospace; }

        .need-stats  { text-align: right; }
        .stat-value  { font-weight: 900; font-size: 1.1rem; }
        .stat-label  { font-size: 0.65rem; text-transform: uppercase; color: var(--text-muted); display: block; }

        .trend-icon  { font-weight: 900; font-size: 1rem; margin-left: 4px; }
        .trend-up    { color: var(--bio-green-primary); }
        .trend-down  { color: var(--danger-red); }
        .trend-stable{ color: var(--text-muted); }

        .need-progress-container { display: flex; align-items: center; gap: 12px; }
        .need-progress-bg {
          flex: 1; height: 6px; background: rgba(0,0,0,0.05);
          border-radius: 3px; overflow: hidden;
        }
        .need-progress-bar { height: 100%; border-radius: 3px; transition: width 0.8s ease; }

        .alert-badge {
          font-size: 0.65rem; font-weight: 800; color: var(--danger-red);
          background: rgba(225, 29, 72, 0.1); padding: 2px 6px; border-radius: 4px;
          white-space: nowrap;
        }

        .risk-score {
          font-size: 0.7rem; font-weight: 800; margin-top: 4px; text-align: right;
        }

        /* Bloc explicable IA : Stock Prédit + MM */
        .ml-explain {
          display: flex; gap: 8px; margin-top: 8px;
          padding: 6px 10px;
          background: rgba(0, 168, 89, 0.06);
          border: 1px solid rgba(0, 168, 89, 0.15);
          border-radius: 8px;
          flex-wrap: wrap;
        }
        .ml-explain-item {
          font-size: 0.7rem; color: var(--text-muted); line-height: 1.4;
        }
        .ml-explain-item strong { color: var(--text-primary); font-weight: 800; }

        /* Skeleton loading */
        .skeleton-item { pointer-events: none; }
        .skeleton-line {
          background: linear-gradient(90deg, rgba(0,0,0,0.06) 25%, rgba(0,0,0,0.10) 50%, rgba(0,0,0,0.06) 75%);
          background-size: 200% 100%;
          border-radius: 4px;
          animation: shimmer 1.5s infinite;
        }
        @keyframes shimmer {
          0%   { background-position: -200% 0; }
          100% { background-position:  200% 0; }
        }

        /* Empty state */
        .empty-state {
          text-align: center; padding: 40px 20px;
          color: var(--text-muted);
        }
        .empty-icon { font-size: 3rem; margin-bottom: 12px; }
        .empty-state p { font-weight: 700; margin: 0 0 6px; }
        .empty-state small { font-size: 0.78rem; }
        .empty-state code {
          background: rgba(0,0,0,0.06); padding: 2px 6px;
          border-radius: 4px; font-family: monospace;
        }
      `}</style>
    </div>
  );
};

export default CriticalNeedsList;
