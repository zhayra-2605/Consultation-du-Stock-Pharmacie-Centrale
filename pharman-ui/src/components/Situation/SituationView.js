import React, { useState, useEffect, useCallback } from 'react';
import MetricGauges from './MetricGauges';
import InteractiveMap from './InteractiveMap';
import CriticalNeedsList from './CriticalNeedsList';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

const HUB_NAMES = {
  'TUNIS':    'Tunis',
  'KEF':      'El Kef',
  'SOUSSE':   'Sousse',
  'GAFSA':    'Gafsa',
  'SFAX':     'Sfax',
  'MEDENINE': 'Médenine'
};

const getHubName = (id) => HUB_NAMES[id] || 'National';

// Custom hook to handle data fetching logic
const usePredictions = (selectedHub, period) => {
  const [mlData, setMlData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchPredictions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const url = `${API_BASE}/situation/predictions?hubId=${selectedHub || ''}&period=${period}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setMlData(data);
    } catch (e) {
      console.error('[SituationView] Erreur fetch:', e);
      setError('Impossible de charger les prédictions. Vérifiez que le serveur Node.js est actif.');
    } finally {
      setLoading(false);
    }
  }, [selectedHub, period]);

  useEffect(() => {
    fetchPredictions();
  }, [fetchPredictions]);

  return { mlData, loading, error };
};

const SituationView = ({ onBack }) => {
  const [selectedHub, setSelectedHub] = useState(null);
  const [period, setPeriod] = useState(3); // Central state (3, 6, 12 months)
  
  const { mlData, loading, error } = usePredictions(selectedHub, period);

  const handleHubClick = useCallback((id) => {
    setSelectedHub(prevHub => prevHub === id ? null : id);
  }, []);

  return (
    <div className="situation-fade-container">
      <div className="situation-header">
        <button className="back-btn" onClick={onBack}>
          <span>⬅</span> Retour à la Recherche
        </button>
        <div className="view-title">
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <img src="/assets/logo_pct_official.png" alt="Logo" style={{ height: '50px', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))' }} />
            <div>
              <h2>Tableau de Bord Situation &amp; Alertes (IA)</h2>
              <p>Analyse prédictive de la chaîne de distribution PHCT</p>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="error-banner">
          ⚠️ {error}
        </div>
      )}

      <MetricGauges data={mlData?.metrics} isLoading={loading} />

      <div className="situation-main-grid">
        <InteractiveMap
          selectedHub={selectedHub}
          onHubClick={handleHubClick}
          hubsHealth={mlData?.hubsHealth || []}
          isLoading={loading}
        />

        <CriticalNeedsList
          hubId={selectedHub}
          hubName={getHubName(selectedHub)}
          onHubChange={setSelectedHub}
          period={period}
          onPeriodChange={setPeriod}
          needs={mlData?.criticalNeeds || []}
          isLoading={loading}
        />
      </div>

      <style jsx>{`
        .situation-fade-container {
          animation: fadeIn 0.8s ease-out forwards;
          display: flex;
          flex-direction: column;
          gap: 20px;
          padding: 10px 0;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        .situation-header {
          display: flex;
          align-items: center;
          gap: 24px;
          margin-bottom: 24px;
          padding: 0 10px;
        }

        .back-btn {
          background: var(--glass-white);
          border: 1px solid var(--glass-border);
          border-radius: var(--radius-pill);
          padding: 10px 24px;
          font-weight: 800;
          color: var(--bio-green-primary);
          cursor: pointer;
          transition: var(--transition-fluid);
          box-shadow: var(--shadow-glass);
          display: flex;
          align-items: center;
          gap: 12px;
        }
        
        .back-btn:hover {
          background: white;
          transform: translateX(-5px);
          box-shadow: 0 8px 20px rgba(0,0,0,0.1);
        }
        
        .back-btn span { font-size: 1.2rem; }

        .view-title h2 { margin: 0; font-weight: 850; font-size: 1.7rem; color: var(--text-primary); }
        .view-title p  { margin: 4px 0 0 0; color: var(--text-muted); font-size: 0.95rem; font-weight: 600; }

        .error-banner {
          background: rgba(225, 29, 72, 0.08);
          border: 1px solid rgba(225, 29, 72, 0.3);
          border-radius: 12px;
          padding: 12px 20px;
          color: var(--danger-red);
          font-size: 0.9rem;
          font-weight: 700;
        }

        .situation-main-grid {
          display: flex;
          gap: 24px;
          align-items: flex-start;
        }

        @media (max-width: 1200px) {
          .situation-main-grid { flex-direction: column; }
        }
      `}</style>
    </div>
  );
};

export default SituationView;
