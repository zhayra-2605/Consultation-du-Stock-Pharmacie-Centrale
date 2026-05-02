import React, { useEffect, useState } from 'react';

/**
 * CircularGauge — Jauge circulaire premium
 */
const CircularGauge = ({ label, value, color, unit, max = 100, isLoading }) => {
  const [animatedValue, setAnimatedValue] = useState(0);
  
  useEffect(() => {
    if (!isLoading) {
      setAnimatedValue(Math.min((value / max) * 100, 100));
    }
  }, [value, max, isLoading]);

  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (animatedValue / 100) * circumference;

  return (
    <div className={`gauge-card ${isLoading ? 'gauge-loading' : ''}`}>
      <div className="gauge-label">{label}</div>
      <div className="circular-container">
        <svg width="100" height="100" className="circular-chart">
          <circle 
            className="circular-bg"
            cx="50" cy="50" r={radius} 
            fill="none" strokeWidth="8"
          />
          <circle 
            className="circular-progress"
            cx="50" cy="50" r={radius} 
            fill="none" strokeWidth="8"
            stroke={color}
            strokeDasharray={circumference}
            strokeDashoffset={isLoading ? circumference : strokeDashoffset}
            strokeLinecap="round"
            style={{ 
              transition: 'stroke-dashoffset 1.5s ease-out',
              filter: `drop-shadow(0 0 6px ${color}88)`
            }}
          />
        </svg>
        <div className="circular-value-container">
          <div className="gauge-value" style={{ color }}>{isLoading ? '—' : Math.round(value)}</div>
          <div className="gauge-unit">{unit}</div>
        </div>
      </div>
    </div>
  );
};

/**
 * ValueCard — Carte simple avec juste la valeur
 */
const ValueCard = ({ label, value, color, unit, isLoading }) => {
  return (
    <div className={`gauge-card ${isLoading ? 'gauge-loading' : ''}`}>
      <div className="gauge-label">{label}</div>
      <div className="value-only-content" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', height: '100px' }}>
        <div className="gauge-value" style={{ color }}>
          {isLoading ? '—' : Math.round(value)}
          <span className="gauge-unit" style={{ marginLeft: '12px' }}>{unit}</span>
        </div>
      </div>
    </div>
  );
};

/**
 * SparklineCard — Carte avec courbe dynamique premium
 */
const SparklineCard = ({ label, value, color, unit, isLoading }) => {
  return (
    <div className={`gauge-card ${isLoading ? 'gauge-loading' : ''}`}>
      <div className="gauge-label">{label}</div>
      <div className="sparkline-content" style={{ display: 'flex', flexDirection: 'column', height: '110px' }}>
        <div className="gauge-value" style={{ color }}>
          {isLoading ? '—' : Math.round(value)}
          <span className="gauge-unit" style={{ marginLeft: '8px' }}>{unit}</span>
        </div>
        
        {/* Courbe décorative (Sparkline très détaillée) */}
        <div className="sparkline-svg-container" style={{ position: 'relative', height: '80px', marginTop: 'auto', bottom: '-15px', left: '-10px', right: '0', width: '100%' }}>
           <svg width="100%" height="100%" viewBox="0 0 320 120" preserveAspectRatio="none" style={{ overflow: 'visible' }}>
             <defs>
               <linearGradient id="gradientSpark" x1="0%" y1="0%" x2="0%" y2="100%">
                 <stop offset="0%" stopColor={color} stopOpacity="0.4" />
                 <stop offset="100%" stopColor={color} stopOpacity="0.0" />
               </linearGradient>
             </defs>
             
             {/* Axe X (Base) */}
             <line x1="30" y1="100" x2="310" y2="100" stroke="var(--text-secondary, #94a3b8)" strokeWidth="2" strokeOpacity="0.6" />
             {/* Axe Y (Gauche) */}
             <line x1="30" y1="10" x2="30" y2="100" stroke="var(--text-secondary, #94a3b8)" strokeWidth="2" strokeOpacity="0.6" />
             
             {/* Grille pointillée & Labels Axe Y */}
             <line x1="30" y1="55" x2="310" y2="55" stroke="var(--text-secondary, #94a3b8)" strokeWidth="1" strokeDasharray="4 4" strokeOpacity="0.3" />
             <line x1="30" y1="15" x2="310" y2="15" stroke="var(--text-secondary, #94a3b8)" strokeWidth="1" strokeDasharray="4 4" strokeOpacity="0.3" />
             
             <text x="25" y="18" fontSize="10" fill="var(--text-secondary, #94a3b8)" textAnchor="end" fontWeight="bold">Max</text>
             <text x="25" y="58" fontSize="10" fill="var(--text-secondary, #94a3b8)" textAnchor="end">Moy</text>
             <text x="25" y="100" fontSize="10" fill="var(--text-secondary, #94a3b8)" textAnchor="end">0</text>

             {/* Remplissage de la courbe */}
             <path 
               d="M 40 90 C 65 90, 65 50, 90 50 C 120 50, 120 70, 150 70 C 180 70, 180 30, 210 30 C 235 30, 235 40, 260 40 C 280 40, 280 15, 300 15 L 300 100 L 40 100 Z" 
               fill="url(#gradientSpark)" 
             />
             
             {/* Trait de la courbe */}
             <path 
               d="M 40 90 C 65 90, 65 50, 90 50 C 120 50, 120 70, 150 70 C 180 70, 180 30, 210 30 C 235 30, 235 40, 260 40 C 280 40, 280 15, 300 15" 
               fill="none" 
               stroke={color} 
               strokeWidth="3.5"
               strokeLinecap="round"
               style={{ filter: `drop-shadow(0 4px 6px ${color}88)` }}
             />

             {/* Points (cercles) sur la courbe */}
             <circle cx="40" cy="90" r="4" fill="white" stroke={color} strokeWidth="2" />
             <circle cx="90" cy="50" r="4" fill="white" stroke={color} strokeWidth="2" />
             <circle cx="150" cy="70" r="4" fill="white" stroke={color} strokeWidth="2" />
             <circle cx="210" cy="30" r="4" fill="white" stroke={color} strokeWidth="2" />
             <circle cx="260" cy="40" r="4" fill="white" stroke={color} strokeWidth="2" />
             <circle cx="300" cy="15" r="5" fill={color} stroke="white" strokeWidth="2" />

             {/* Labels Axe X (Temporel) */}
             <text x="40" y="115" fontSize="10" fill="var(--text-secondary, #94a3b8)" textAnchor="middle">M-5</text>
             <text x="90" y="115" fontSize="10" fill="var(--text-secondary, #94a3b8)" textAnchor="middle">M-4</text>
             <text x="150" y="115" fontSize="10" fill="var(--text-secondary, #94a3b8)" textAnchor="middle">M-3</text>
             <text x="210" y="115" fontSize="10" fill="var(--text-secondary, #94a3b8)" textAnchor="middle">M-2</text>
             <text x="260" y="115" fontSize="10" fill="var(--text-secondary, #94a3b8)" textAnchor="middle">M-1</text>
             <text x="300" y="115" fontSize="10" fill="var(--text-secondary, #94a3b8)" textAnchor="middle" fontWeight="bold">Ce mois</text>
           </svg>
        </div>
      </div>
    </div>
  );
};

const MetricGauges = ({ data, isLoading }) => {
  const { adequacy = 0, stockouts = 0, gaps = 0 } = data || {};

  return (
    <div className="gauges-container">
      <CircularGauge
        label="Volume MM Sécurisé"
        value={adequacy}
        unit="%"
        color="var(--bio-green-primary, #10b981)"
        max={100}
        isLoading={isLoading}
      />
      <ValueCard
        label="Alertes Rouges (< 1 Mois)"
        value={stockouts}
        unit="Produits"
        color="var(--danger-red, #ef4444)"
        isLoading={isLoading}
      />
      <SparklineCard
        label="Besoins en Surchauffe"
        value={gaps}
        unit="Pics"
        color="#f59e0b"
        isLoading={isLoading}
      />

      <style jsx>{`
        .gauges-container {
          display: flex;
          gap: 24px;
          margin-bottom: 30px;
        }
        .gauge-card {
          flex: 1;
          background: rgba(255, 255, 255, 0.7);
          backdrop-filter: blur(24px);
          border-radius: 20px;
          padding: 24px;
          border: 1px solid rgba(255, 255, 255, 0.5);
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.05);
          display: flex;
          flex-direction: column;
          position: relative;
          overflow: hidden;
          transition: transform 0.3s ease, box-shadow 0.3s ease;
        }
        .gauge-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 12px 40px rgba(0, 0, 0, 0.1);
        }
        .gauge-label {
          font-size: 0.85rem;
          font-weight: 700;
          text-transform: uppercase;
          color: var(--text-secondary, #64748b);
          letter-spacing: 0.1em;
          margin-bottom: 16px;
          z-index: 2;
        }
        
        /* Styles pour Circular Gauge */
        .circular-container {
          display: flex;
          align-items: center;
          position: relative;
          height: 100px;
        }
        .circular-chart {
          transform: rotate(-90deg);
        }
        .circular-bg {
          stroke: rgba(0,0,0, 0.05);
        }
        .circular-value-container {
          position: absolute;
          left: 115px;
          display: flex;
          flex-direction: column;
        }
        
        /* Styles pour Sparkline Card */
        .sparkline-content {
          display: flex;
          flex-direction: column;
          height: 100px;
          justify-content: flex-start;
          position: relative;
        }
        .sparkline-svg-container {
          position: absolute;
          bottom: -24px;
          left: -24px;
          right: -24px;
          height: 80px;
          opacity: 0.8;
          z-index: 1;
          pointer-events: none;
        }
        
        /* Communs */
        .gauge-value {
          font-size: 2.5rem;
          font-weight: 800;
          line-height: 1;
          text-shadow: 0 2px 10px rgba(0,0,0,0.05);
          z-index: 2;
        }
        .gauge-unit {
          font-size: 0.9rem;
          font-weight: 600;
          color: var(--text-secondary, #64748b);
          margin-top: 4px;
        }
        
        .gauge-loading {
          opacity: 0.7;
          animation: skeleton 1.5s infinite alternate;
        }
        @keyframes skeleton {
          0% { opacity: 0.6; }
          100% { opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default MetricGauges;
