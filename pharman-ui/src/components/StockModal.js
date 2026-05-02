import React from 'react';
import { Modal, Table } from 'react-bootstrap';
import { formatNumber } from '../utils/uiUtils';

// Récupère la date de péremption (plusieurs noms possibles selon l'API)
const getDatePeremption = (item) => {
    const date = item.DATEPEREMP ?? item.date_peremption ?? item.DATE_PEREMPTION ?? '';
    if (!date || date === '0000-00-00' || String(date).startsWith('0000-00-00')) {
        return '-';
    }
    return date;
};

const StockModal = ({ show, onHide, depotName, stockDetails }) => {
    // Filter unique details by code and depot
    const uniqueDetails = stockDetails ? stockDetails.filter((item, index, self) => {
        const key = `${item.CODE_PRODUIT}_${item.LIBELLE_DEPOT}`;
        return self.findIndex(t => `${t.CODE_PRODUIT}_${t.LIBELLE_DEPOT}` === key) === index;
    }) : [];

    return (
        <Modal show={show} onHide={onHide} size="xl" centered>
            <Modal.Header closeButton className="bg-success text-white">
                <Modal.Title>Stock Dépôt {depotName && `- ${depotName}`}</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <div className="table-responsive">
                    <Table striped bordered hover className="align-middle">
                        <thead>
                            <tr style={{ backgroundColor: '#d1e7dd', color: '#0f5132' }}>
                                <th>Code Produit</th>
                                <th>Libellé</th>
                                <th>Année</th>
                                <th>Dépôt</th>
                                <th>Num lot</th>
                                <th>Date péremption</th>
                                <th className="text-center">Qte bloquée</th>
                                <th className="text-center">Quarantaine</th>
                                <th className="text-center">Stock DÉPÔTS</th>
                                <th className="text-center">Vente DÉPÔTS</th>
                            </tr>
                        </thead>
                        <tbody>
                            {uniqueDetails.length > 0 ? uniqueDetails.map((item, index) => (
                                <tr key={index}>
                                    <td className="font-monospace">{item.CODE_PRODUIT}</td>
                                    <td>{item.LIBELLE}</td>
                                    <td>{item.ANNEE || '-'}</td>
                                    <td>{item.LIBELLE_DEPOT}</td>
                                    <td>{item.NUMLOT}</td>
                                    <td>{getDatePeremption(item)}</td>
                                    <td className="text-center">{formatNumber(item.QTEBLK)}</td>
                                    <td className="text-center">{formatNumber(item.QUARANTAINE)}</td>
                                    <td className="text-center fw-bold">
                                        {formatNumber(item.STOCK_REGION ?? item.STOCK_TOTAL)}
                                    </td>
                                    <td className="text-center">
                                        {formatNumber(item.VENTE_REGION ?? item.VENTE_TOTAL)}
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan="10" className="text-center py-4 text-muted italic">
                                        Aucun détail de stock disponible.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </Table>
                </div>
            </Modal.Body>
        </Modal>
    );
};

export default StockModal;
