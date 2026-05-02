import React from 'react';

const ProduitsLiesTable = ({ content }) => {
    if (!content || content.length === 0) return null;

    return (
        <div className="card mb-4 border-0">
            <div className="card-header fw-bold d-flex justify-content-between align-items-center" style={{ backgroundColor: '#E8F0FE', color: '#1a73e8' }}>
                <span>Produits liés au besoin</span>
                <span>&#9650;</span> {/* Chevron Up */}
            </div>
            <div className="card-body p-0">
                <div className="table-responsive">
                    <table className="table table-bordered table-striped mb-0">
                        <thead className="table-light">
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
                            {content.map((item) => (
                                <tr key={item.CODEPRODUIT}>
                                    <td>{item.CODEPRODUIT}</td>
                                    <td>{item.LIBELLE}</td>
                                    <td>{item.SIGLE}</td>
                                    <td>{item.VEIC}</td>
                                    <td>{item.QUARANTAINE}</td>
                                    <td>{item.QTE_BLOQUEE}</td>
                                    <td>{item.PRESENTATION}</td>
                                    <td>{item.STOCK}</td>
                                    <td>{item.STOCK_CONVERTI}</td>
                                    <td>{item.ETAT}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default ProduitsLiesTable;
