import React from 'react';
import { getDatePeremption } from '../utils/dataUtils';

const StockDetailModal = ({ isOpen, onClose, data, depotName, productInfo }) => {
  if (!isOpen) return null;


  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content-custom" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header-custom">
          <h4>Stock Dépôt</h4>
          <button onClick={onClose} className="btn-close-custom" aria-label="Fermer">×</button>
        </div>

        <div className="modal-body-custom">
          <div className="table-responsive" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
            <table className="table-custom">
              <thead>
                <tr>
                  <th>Code Produit</th>
                  <th>Libellé</th>
                  <th>Année</th>
                  <th>Dépôt</th>
                  <th>Num lot</th>
                  <th>Date péremption</th>
                  <th>Qte bloquée</th>
                  <th>Quarantaine</th>
                  <th>Stock DÉPÔTS</th>
                  <th>Vente DÉPÔTS</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  if (!data || data.length === 0) return null;
                  
                  // Filter to keep only unique products
                  const uniqueProducts = [];
                  const seen = new Set();
                  data.forEach(item => {
                    const code = item.CODE_PRODUIT;
                    const uniqueKey = code ? code + '_' + item.LIBELLE_DEPOT : null;
                    if (uniqueKey && !seen.has(uniqueKey)) {
                      seen.add(uniqueKey);
                      uniqueProducts.push(item);
                    }
                  });

                  return uniqueProducts.map((item, index) => (
                    <tr key={item.ID ?? index}>
                      <td>{item.CODE_PRODUIT}</td>
                      <td>{item.LIBELLE_PRODUIT ?? item.LIBELLE ?? productInfo?.libelle}</td>
                      <td>{item.ANNEE ?? item.annee ?? '-'}</td>
                      <td>{item.LIBELLE_DEPOT}</td>
                      <td>{item.NUM_LOT ?? item.NUMLOT ?? '-'}</td>
                      <td>{getDatePeremption(item)}</td>
                      <td>{Math.round(item.QTE_BLOQUEE ?? item.QTEBLK ?? 0)}</td>
                      <td>{Math.round(item.QUARANTAINE ?? 0)}</td>
                      <td style={{ fontWeight: 'bold', textAlign: 'center' }}>
                        {Math.round(item.STOCK_REGION ?? item.STOCK_TOTAL ?? 0)}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        {Math.round(item.VENTE_REGION ?? item.VENTE_TOTAL ?? 0)}
                      </td>
                    </tr>
                  ));
                })()}
                {(!data || data.length === 0) && (
                  <tr>
                    <td colSpan={10} style={{ padding: 0, border: 'none' }}>
                      <div style={{
                        backgroundColor: '#fff1f2',
                        border: '1px solid #fca5a5',
                        borderRadius: '8px',
                        padding: '20px 24px',
                        margin: '12px 8px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        color: '#b91c1c',
                        fontWeight: '600',
                        fontSize: '0.95rem'
                      }}>
                        <span style={{ fontSize: '1.4rem' }}>🚫</span>
                        Aucun détail de stock disponible pour ce dépôt.
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StockDetailModal;
