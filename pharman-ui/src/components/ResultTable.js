import React from 'react';

const ResultTable = ({ results, onSelectProduct, selectedProduct }) => {
    if (!results || results.length === 0) return null;

    return (
        <div className="table-custom-wrapper">
            <div className="table-title">
                <span>📋</span> Résultat du besoin
            </div>
            <div className="table-responsive">
                <table className="table-custom">
                    <thead>
                        <tr>
                            <th>Code Produit</th>
                            <th>Libellé</th>
                            <th>Code Besoin</th>
                            <th>Libellé Besoin</th>
                            <th>Nom Fournisseur</th>
                            <th>Nom Pays</th>
                            <th>Présentation</th>
                            <th>Interchangeable</th>
                        </tr>
                    </thead>
                    <tbody>
                        {results.map((product) => (
                            <tr
                                key={product.CODE_PRODUIT}
                                onClick={() => onSelectProduct(product)}
                                className={selectedProduct && selectedProduct.CODE_PRODUIT === product.CODE_PRODUIT ? 'table-row-selected' : ''}
                                style={{ cursor: 'pointer' }}
                            >
                                <td>{product.CODE_PRODUIT}</td>
                                <td>{product.LIBELLE_PRODUIT}</td>
                                <td>{product.CODE_BESOIN}</td>
                                <td>{product.LIBELLE_BESOIN}</td>
                                <td>{product.NOM_FOURNISSEUR}</td>
                                <td>{product.NOM_PAYS}</td>
                                <td>{product.PRESENTATION}</td>
                                <td>{product.INTERCHANGEABLE ? 'Oui' : 'Non'}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default ResultTable;
