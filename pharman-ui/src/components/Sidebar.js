import React from 'react';
import { REGIONS } from '../constants/regions';

/**
 * Sidebar avec boutons de dépôts colorés par disponibilité de stock.
 * - Blanc: aucun produit sélectionné
 * - Vert:  stock > 0 (cliquable)
 * - Rouge: stock = 0 ou absent
 */
const Sidebar = ({ stockSummary, selectedProduct, onDepotClick, onFicheProduitClick, onCalendrierClick, onAutresClick, onImprimerClick }) => {
    const userRole = sessionStorage.getItem('role');
    const hasSelection = !!selectedProduct;

    const getDepotStock = (depot) => {
        const item = stockSummary?.find(s => s.depot === depot);
        return item ? Number(item.totalStock) || 0 : 0;
    };

    const isDepotClickable = (depot) => hasSelection && getDepotStock(depot) > 0;

    const getButtonVariant = (depot) => {
        if (!hasSelection) return 'light';
        return getDepotStock(depot) > 0 ? 'success' : 'danger';
    };

    const footerBtnStyle = (active) => ({
        cursor: active ? 'pointer' : 'default',
        opacity: active ? 1 : 0.6,
    });

    const FooterBtn = ({ onClick, icon, label }) => (
        <button
            className="footer-btn"
            onClick={onClick}
            disabled={!hasSelection}
            style={footerBtnStyle(hasSelection)}
        >
            <span>{icon}</span> {label}
        </button>
    );

    return (
        <div className="sidebar-container">
            <div className="sidebar-title">Stock / Dépôts</div>

            <div className="d-flex flex-column gap-2 mb-4" style={{ flex: 1, overflowY: 'auto', paddingRight: '8px' }}>
                {REGIONS.map(depot => {
                    const clickable = isDepotClickable(depot);
                    return (
                        <button
                            key={depot}
                            type="button"
                            className={`depot-btn ${getButtonVariant(depot)}`}
                            style={{ cursor: clickable ? 'pointer' : 'default' }}
                            onClick={() => clickable && onDepotClick(depot)}
                            disabled={!clickable}
                        >
                            {depot}
                        </button>
                    );
                })}
            </div>

            <div className="sidebar-footer">
                <FooterBtn onClick={onFicheProduitClick} icon="📄" label="Fiche Produit" />
                <FooterBtn onClick={onCalendrierClick}   icon="📅" label="Calendrier" />
                <FooterBtn onClick={onAutresClick}       icon="⚙️" label="Autres" />
                {userRole !== 'VIEWER' && (
                    <FooterBtn onClick={onImprimerClick}     icon="🖨️" label="Imprimer" />
                )}
            </div>
        </div>
    );
};

export default Sidebar;
