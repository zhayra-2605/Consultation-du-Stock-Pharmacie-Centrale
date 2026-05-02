import React, { useState } from 'react';
import { TUNISIA_REGIONS } from '../../assets/tunisia_paths';

/**
 * InteractiveMap (Heatmap ML)
 * Props:
 *   selectedHub : string | null     — hub cliqué
 *   onHubClick  : (id) => void       — callback sélection
 *   hubsHealth  : array              — [{ id, status, adequacy }] depuis API ML
 *   isLoading   : boolean
 */
const TunisiaMap = ({ selectedHub, onHubClick, hubsHealth = [], isLoading }) => {
  const [hoveredHub, setHoveredHub] = useState(null);
  const [hoveredGov, setHoveredGov] = useState(null);

  /**
   * Couleur Heatmap dynamique basée sur les prédictions ML.
   * Priorité : hub sélectionné → couleur originelle / autres → heatmap ML
   */
  const getHubColor = (hubId, originalColor) => {
    // Hub sélectionné : garder la couleur originelle pour contraste
    if (selectedHub === hubId) return originalColor;

    // Pas encore de données ML → fallback couleur originelle
    if (!hubsHealth || hubsHealth.length === 0) return originalColor;

    const health = hubsHealth.find(h => h.id === hubId);
    if (!health) return originalColor;

    switch (health.status) {
      case 'critical': return '#e11d48'; // Rouge → Rupture imminente
      case 'warning':  return '#f59e0b'; // Orange → Risque modéré
      case 'stable':   return '#00a859'; // Vert → Stock suffisant
      default:         return originalColor;
    }
  };

  /**
   * Tooltip enrichi : affiche les données ML de la santé du hub
   */
  const getHubTooltip = (hubId, hubName) => {
    const health = hubsHealth.find(h => h.id === hubId);
    if (!health) return hubName;
    const statusLabel = health.status === 'critical' ? '🔴 Critique'
                      : health.status === 'warning'  ? '🟡 Risque'
                      : '🟢 Stable';
    return `${hubName} — ${statusLabel} (${health.adequacy}% couverture)`;
  };

  const handleHubClick = (hubId) => {
    onHubClick(hubId === selectedHub ? null : hubId);
  };

  return (
    <div className="map-card">
      <div className="map-header">
        <h3 className="section-title">
          🗺️ Carte Prédictive — Heatmap ML
          {isLoading && <span className="map-loading"> ↻</span>}
        </h3>
        <p className="section-subtitle">Réseau PHCT — 6 Hubs · Couleurs basées sur les prédictions IA</p>

        {/* Légende Heatmap */}
        <div className="heatmap-legend">
          <span className="hl-item"><span className="hl-dot" style={{ background: '#00a859' }} />Stable</span>
          <span className="hl-item"><span className="hl-dot" style={{ background: '#f59e0b' }} />Risque</span>
          <span className="hl-item"><span className="hl-dot" style={{ background: '#e11d48' }} />Critique</span>
        </div>
      </div>

      <div className="map-body">
        {/* SVG Carte Tunisie */}
        <div className="map-svg-wrapper">
          <svg viewBox="0 225 230 410" className="tunisia-svg" preserveAspectRatio="xMidYMid meet">
            {TUNISIA_REGIONS.map((hub) => {
              const dynamicColor = getHubColor(hub.hub, hub.color);
              return (
                <g
                  key={hub.hub}
                  className={`hub-group ${selectedHub === hub.hub ? 'active' : ''}`}
                  onClick={() => handleHubClick(hub.hub)}
                  onMouseEnter={() => setHoveredHub(hub.hub)}
                  onMouseLeave={() => { setHoveredHub(null); setHoveredGov(null); }}
                >
                  {hub.governorates.map((gov) => (
                    <path
                      key={gov.id}
                      d={gov.path}
                      className="gov-path"
                      fill={dynamicColor}
                      style={{
                        opacity: selectedHub && selectedHub !== hub.hub
                          ? 0.35
                          : hoveredHub === hub.hub ? 0.95 : 0.78,
                        transition: 'fill 0.6s ease, opacity 0.3s ease'
                      }}
                      onMouseEnter={() => setHoveredGov(gov.name)}
                    >
                      <title>{getHubTooltip(hub.hub, hub.name)}</title>
                    </path>
                  ))}
                </g>
              );
            })}
          </svg>

          {/* Tooltip gouvernorat */}
          {hoveredGov && (
            <div className="gov-tooltip">{hoveredGov}</div>
          )}
        </div>

        {/* Légende verticale */}
        <div className="map-legend">
          {TUNISIA_REGIONS.map((hub) => {
            const health = hubsHealth.find(h => h.id === hub.hub);
            const dynColor = getHubColor(hub.hub, hub.color);
            return (
              <div
                key={hub.hub}
                className={`legend-item ${selectedHub === hub.hub ? 'legend-active' : ''}`}
                onClick={() => handleHubClick(hub.hub)}
                onMouseEnter={() => setHoveredHub(hub.hub)}
                onMouseLeave={() => setHoveredHub(null)}
              >
                <div className="legend-dot" style={{ background: dynColor }} />
                <div className="legend-info">
                  <strong>{hub.name}</strong>
                  <span>{hub.surface}</span>
                  {/* Info ML dans la légende */}
                  {health && (
                    <span className={`legend-ml-badge badge-${health.status}`}>
                      {health.adequacy}% IA
                    </span>
                  )}
                  {(hoveredHub === hub.hub || selectedHub === hub.hub) && (
                    <div className="legend-govs">
                      {hub.governorates.map(g => (
                        <span key={g.id} className={hoveredGov === g.name ? 'gov-active' : ''}>
                          {g.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <style jsx>{`
        .map-card {
          flex: 1.8;
          background: var(--glass-white);
          backdrop-filter: blur(24px);
          border-radius: var(--radius-glass-card);
          padding: 20px 24px;
          border: 1px solid var(--glass-border);
          box-shadow: var(--shadow-glass);
          display: flex;
          flex-direction: column;
          min-height: 720px;
        }

        .map-header { margin-bottom: 12px; }
        .section-title { font-weight: 800; font-size: 1.15rem; margin: 0; color: var(--text-primary); }
        .section-subtitle { font-size: 0.85rem; color: var(--text-muted); margin: 4px 0 0 0; }
        .map-loading { animation: spin 1s linear infinite; display: inline-block; font-size: 1rem; }
        @keyframes spin { to { transform: rotate(360deg); } }

        .heatmap-legend {
          display: flex; gap: 16px; margin-top: 10px;
        }
        .hl-item {
          display: flex; align-items: center; gap: 6px;
          font-size: 0.75rem; font-weight: 700; color: var(--text-muted);
        }
        .hl-dot {
          width: 10px; height: 10px; border-radius: 50%;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }

        .map-body { flex: 1; display: flex; gap: 16px; min-height: 0; }

        .map-svg-wrapper {
          flex: 1; position: relative;
          display: flex; align-items: stretch;
        }

        .tunisia-svg {
          width: 100%; height: 100%; min-height: 550px;
          filter: drop-shadow(0 8px 24px rgba(0,0,0,0.12));
          transition: all 0.4s ease;
        }

        .hub-group { cursor: pointer; }
        .gov-path { stroke: white; stroke-width: 0.6; }
        .hub-group:hover .gov-path { stroke-width: 1.2; filter: brightness(1.12) saturate(1.2); }
        .hub-group.active .gov-path {
          stroke: white; stroke-width: 1.8;
          filter: drop-shadow(0 0 10px currentColor) brightness(1.1);
        }

        .gov-tooltip {
          position: absolute; bottom: 12px; left: 50%; transform: translateX(-50%);
          background: rgba(15,20,40,0.85); color: white;
          padding: 6px 14px; border-radius: 20px; font-size: 0.8rem;
          font-weight: 600; pointer-events: none; white-space: nowrap;
          backdrop-filter: blur(8px);
        }

        .map-legend {
          width: 162px; flex-shrink: 0; display: flex;
          flex-direction: column; gap: 6px; overflow-y: auto; padding: 4px 0;
        }
        .map-legend::-webkit-scrollbar { width: 3px; }
        .map-legend::-webkit-scrollbar-thumb { background: var(--glass-border); border-radius: 4px; }

        .legend-item {
          display: flex; align-items: flex-start; gap: 10px;
          padding: 10px 12px; border-radius: 12px;
          border: 1.5px solid transparent; cursor: pointer;
          transition: all 0.25s ease;
          background: rgba(255,255,255,0.5);
        }
        .legend-item:hover {
          background: white; border-color: var(--glass-border);
          box-shadow: 0 4px 14px rgba(0,0,0,0.07); transform: translateX(-2px);
        }
        .legend-active {
          background: white !important;
          border-color: var(--bio-green-primary) !important;
          box-shadow: 0 0 18px rgba(0,168,89,0.15) !important;
        }

        .legend-dot {
          width: 12px; height: 12px; border-radius: 50%;
          flex-shrink: 0; margin-top: 3px;
          box-shadow: 0 2px 6px rgba(0,0,0,0.2);
          transition: background 0.6s ease;
        }

        .legend-info { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
        .legend-info strong {
          font-size: 0.78rem; font-weight: 700; color: var(--text-primary);
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .legend-info > span { font-size: 0.7rem; color: var(--text-muted); }

        .legend-ml-badge {
          font-size: 0.65rem !important; font-weight: 800 !important;
          padding: 1px 5px; border-radius: 4px; width: fit-content;
        }
        .badge-stable   { background: rgba(0,168,89,0.12);  color: var(--bio-green-primary); }
        .badge-warning  { background: rgba(245,158,11,0.12); color: #f59e0b; }
        .badge-critical { background: rgba(225,29,72,0.12);  color: var(--danger-red); }
        .badge-unknown  { background: rgba(0,0,0,0.05);      color: var(--text-muted); }

        .legend-govs {
          margin-top: 6px; display: flex; flex-direction: column; gap: 2px;
          border-top: 1px solid rgba(0,0,0,0.06); padding-top: 6px;
        }
        .legend-govs span { font-size: 0.68rem; color: var(--text-muted); padding: 1px 0; }
        .gov-active { color: var(--bio-green-primary) !important; font-weight: 700 !important; }
      `}</style>
    </div>
  );
};

export default TunisiaMap;
