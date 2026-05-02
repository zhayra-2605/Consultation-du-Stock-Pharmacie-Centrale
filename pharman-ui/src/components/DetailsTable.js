import React from 'react';
import { getCodeProduit, getLibelleProduit, getPresentation } from '../utils/dataUtils';

const DetailsTable = ({ data, codeBesoin, onRowClick, selectedProduct, loading }) => {
    const renderContent = () => {
        if (loading) {
            return <div className="p-4 italic text-primary">Chargement des produits liés...</div>;
        }

        if (!selectedProduct) {
            return <div className="p-4 italic text-muted">Sélectionnez un produit pour voir les produits liés au besoin.</div>;
        }

        if (!data || data.length === 0) {
            return (
                <div className="p-4 italic text-warning">
                    Aucun produit lié trouvé pour le besoin : <strong>{codeBesoin || 'Inconnu'}</strong>
                </div>
            );
        }

        return (
            <div className="table-custom-wrapper">
                <table className="table-custom">
                    <thead>
                        <tr>
                            <th>Code Produit</th>
                            <th>Libellé</th>
                            <th>Sigle</th>
                            <th>VEIC</th>
                            <th>Quarantaine</th>
                            <th>Qte Bloquée</th>
                            <th>Présentation</th>
                            <th>Stock</th>
                            <th>Stock Converti</th>
                            <th>Etat</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.map((item, index) => {
                            const itemCodeProduit = getCodeProduit(item);
                            const selectedCodeProduit = getCodeProduit(selectedProduct);
                            const isSelected = selectedProduct && selectedCodeProduit && (selectedCodeProduit === itemCodeProduit);

                            return (
                                <tr
                                    key={index}
                                    onClick={() => onRowClick && onRowClick(item)}
                                    className={isSelected ? 'table-row-selected' : ''}
                                    style={{ cursor: 'pointer' }}
                                >
                                    <td>{itemCodeProduit}</td>
                                    <td>{getLibelleProduit(item)}</td>
                                    <td>{item.SIGLE ?? item.sigle}</td>
                                    <td>{item.VEIC ?? '-'}</td>
                                    <td>{item.QUARANTAINE ?? item.quarantaine}</td>
                                    <td>{item.QTEBLOQUE ?? item.QTE_BLOQUEE ?? item.qte_bloquee ?? 0}</td>
                                    <td>{getPresentation(item)}</td>
                                    <td style={{ fontWeight: 'bold', color: (item.STOCK ?? item.stock) < 50 ? 'red' : 'green' }}>
                                        {item.STOCK ?? item.stock}
                                    </td>
                                    <td>{item.STOCKCONVERTI ?? item.STOCK_CONVERTI ?? item.stock}</td>
                                    <td>{item.ETATPRODUIT ?? item.ETAT_PRODUIT ?? item.etatproduit}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        );
    };

    return (
        <div className="produits-lies-wrapper" style={{ marginTop: '20px' }}>
            <div className="produits-lies-header">
                <span>Produits liés au besoin</span>
                <span className="produits-lies-chevron">▲</span>
            </div>
            {renderContent()}
        </div>
    );
};

export default DetailsTable;