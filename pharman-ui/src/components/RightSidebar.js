import React from 'react';

const RightSidebar = ({ onCompareClick, onAlertsClick }) => (
    <div className="right-sidebar-wrapper">
        <div className="right-sidebar-handle">
            <span>◀</span>
        </div>
        <div
            className="sidebar-container right-sidebar-panel"
            style={{ width: '320px', height: '100vh', borderRadius: '0' }}
        >
            <h2 className="sidebar-title" style={{ color: 'var(--bio-lime-deep)' }}>
                Outils &amp; Analyses
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', flex: 1 }}>
                <button
                    className="depot-btn"
                    onClick={onCompareClick}
                    style={{ borderColor: 'var(--bio-lime-deep)' }}
                >
                    <span style={{ fontSize: '1.2rem' }}>⚖️</span> Comparer deux régions
                </button>
                <button className="depot-btn danger" onClick={onAlertsClick}>
                    <span style={{ fontSize: '1.2rem' }}>⚠️</span> Situations &amp; Alertes
                </button>
            </div>

            <div className="sidebar-footer">
                <div style={{
                    padding: '12px',
                    background: 'rgba(255,255,255,0.4)',
                    borderRadius: 'var(--radius-glass-card)',
                    fontSize: '0.85rem',
                    color: 'var(--text-secondary)'
                }}>
                    <strong>Note:</strong> Ces modules d'analyses vous permettent de détecter les anomalies de stock et de comparer les performances par région.
                </div>
            </div>
        </div>
    </div>
);

export default RightSidebar;
