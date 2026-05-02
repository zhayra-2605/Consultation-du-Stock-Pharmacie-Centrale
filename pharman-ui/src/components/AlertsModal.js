import React from 'react';

const AlertsModal = ({ isOpen, onClose }) => {
    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content-custom" onClick={e => e.stopPropagation()} style={{ width: '800px' }}>
                <div className="modal-header-custom">
                    <h4><span style={{ fontSize: '1.2rem' }}>⚠️</span> Situations Critiques et Alertes</h4>
                    <button className="btn-close-custom" onClick={onClose}>×</button>
                </div>
                <div className="modal-body-custom">
                    <div className="alert alert-warning" style={{ borderRadius: 'var(--radius-glass-card)' }}>
                        <strong>Module en construction</strong><br/>
                        Cette interface affichera les produits en rupture de stock, proches de la date de péremption, ou en forte quarantaine.
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AlertsModal;
