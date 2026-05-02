import React from 'react';
import { getCodeBesoin, getCodeProduit, getLibelleBesoin, getLibelleProduit, getPresentation } from '../utils/dataUtils';

const StockTable = ({ data, onRowClick, selectedProduct, isBesoinSearch }) => (
    <div className="table-custom-wrapper">
        <div className="table-title">
            <span>📋</span> {isBesoinSearch ? "Résultat du besoin" : "Résultat du produit"}
        </div>
        <table className="table-custom">
            <thead>
                <tr>
                    {isBesoinSearch ? (
                        <>
                            <th>Code Besoin</th>
                            <th>Libellé Besoin</th>
                            <th>Présentation</th>
                            <th>Nature Besoin</th>
                        </>
                    ) : (
                        <>
                            <th>Code Produit</th>
                            <th>Libellé</th>
                            <th>Code Besoin</th>
                            <th>Libellé Besoin</th>
                            <th>Nom Fournisseur</th>
                            <th>Nom Pays</th>
                            <th>Présentation</th>
                            <th>Interchangeable</th>
                        </>
                    )}
                </tr>
            </thead>
            <tbody>
                {(data || []).map((item, index) => {
                    const itemCodeBesoin = getCodeBesoin(item);
                    const itemCodeProduit = getCodeProduit(item);
                    const selectedCodeBesoin = getCodeBesoin(selectedProduct);
                    const selectedCodeProduit = getCodeProduit(selectedProduct);

                    const isSelected = selectedProduct && (
                        isBesoinSearch
                            ? (selectedCodeBesoin === itemCodeBesoin)
                            : (selectedCodeProduit === itemCodeProduit)
                    );
                    return (
                        <tr
                            key={isBesoinSearch ? (itemCodeBesoin ?? index) : (itemCodeProduit ?? index)}
                            onClick={() => onRowClick(item)}
                            style={{ cursor: 'pointer' }}
                            className={isSelected ? 'table-row-selected' : ''}
                        >
                            {isBesoinSearch ? (
                                <>
                                    <td style={{ color: '#009b4d', fontWeight: 'bold' }}>{itemCodeBesoin}</td>
                                    <td>{getLibelleBesoin(item)}</td>
                                    <td>{item.PRESENTATION_T ?? '-'}</td>
                                    <td>{item.NATURE_BESOIN ?? '-'}</td>
                                </>
                            ) : (
                                <>
                                    <td>{itemCodeProduit}</td>
                                    <td>{getLibelleProduit(item)}</td>
                                    <td style={{ color: '#009b4d', fontWeight: 'bold' }}>{itemCodeBesoin}</td>
                                    <td>{getLibelleBesoin(item)}</td>
                                    <td>{item.NOM_FOURNISSEUR ?? item.nom_fournisseur}</td>
                                    <td>{item.NOM_PAYS ?? item.nom_pays}</td>
                                    <td>{getPresentation(item)}</td>
                                    <td>{item.INTERCHANGEABLE ?? (item.interchangeable ? 'Oui' : 'Non')}</td>
                                </>
                            )}
                        </tr>
                    );
                })}
            </tbody>
        </table>
    </div>
);

export default StockTable;