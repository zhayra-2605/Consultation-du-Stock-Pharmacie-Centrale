import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import '../styles/index.css';

const CalendrierModal = ({ isOpen, onClose, relatedProducts }) => {
    const [livraisons, setLivraisons] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen && relatedProducts && relatedProducts.length > 0) {
            const codeB = relatedProducts[0]?.CODE_BESOIN || relatedProducts[0]?.CODEBESOIN;
            if (codeB) {
                setLoading(true);
                api.getLivraisonsByBesoin(codeB)
                    .then(res => setLivraisons(res.data))
                    .catch(err => console.error("Error fetching livraisons:", err))
                    .finally(() => setLoading(false));
            }
        }
    }, [isOpen, relatedProducts]);


    if (!isOpen) return null;

    const products = relatedProducts && relatedProducts.length > 0 ? relatedProducts : [];

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1; // 1-indexed
    
    const echues = livraisons.filter(l => l.ANNEE < currentYear || (l.ANNEE === currentYear && l.MOIS <= currentMonth));
    const nonEchues = livraisons.filter(l => l.ANNEE > currentYear || (l.ANNEE === currentYear && l.MOIS > currentMonth));

    return (
        <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1060 }}>
            {/* Increased max-width to accommodate the wide tables */}
            <div className="modal-content-custom modal-calendrier" onClick={(e) => e.stopPropagation()} style={{ width: '1300px', maxWidth: '98%' }}>

                {/* Header - Vibrant Green */}
                <div className="modal-header-custom" style={{ backgroundColor: '#008e54', padding: '24px 32px', borderBottom: 'none', borderRadius: '24px 24px 0 0' }}>
                    <h4 style={{ color: 'white', margin: 0, fontSize: '1.4rem', fontWeight: 'bold', display: 'flex', alignItems: 'center' }}>
                        Détails du Calendrier
                    </h4>
                    <button className="btn-close-custom" onClick={onClose} aria-label="Fermer">×</button>
                </div>

                <div className="modal-body-custom" style={{ padding: '0', backgroundColor: '#ffffff', overflowY: 'auto' }}>

                    {/* Section 1: Produits liés */}
                    <div style={{ padding: '16px 24px' }}>
                        <h5 style={{ color: '#4f46e5', fontWeight: 'bold', fontSize: '1.1rem', marginBottom: '12px' }}>
                            Produits liés
                        </h5>
                        <div className="table-responsive" style={{ border: '1px solid #dee2e6', borderRadius: '4px' }}>
                            <table className="table table-bordered mb-0" style={{ fontSize: '0.9rem' }}>
                                <thead style={{ backgroundColor: '#212529', color: '#ffffff' }}>
                                    <tr>
                                        <th style={{ backgroundColor: '#212529', padding: '10px 12px', borderBottom: 'none', borderRight: '1px solid #dee2e6', color: 'white', verticalAlign: 'middle' }}>Fournisseur</th>
                                        <th style={{ backgroundColor: '#212529', padding: '10px 12px', borderBottom: 'none', borderRight: '1px solid #dee2e6', color: 'white', verticalAlign: 'middle' }}>ref<br />prod</th>
                                        <th style={{ backgroundColor: '#212529', padding: '10px 12px', borderBottom: 'none', borderRight: '1px solid #dee2e6', color: 'white', verticalAlign: 'middle' }}>Libellé</th>
                                        <th style={{ backgroundColor: '#212529', padding: '10px 12px', borderBottom: 'none', borderRight: '1px solid #dee2e6', color: 'white', verticalAlign: 'middle' }}>Qté<br />commandée</th>
                                        <th style={{ backgroundColor: '#212529', padding: '10px 12px', borderBottom: 'none', borderRight: '1px solid #dee2e6', color: 'white', verticalAlign: 'middle' }}>sous<br />douane</th>
                                        <th style={{ backgroundColor: '#212529', padding: '10px 12px', borderBottom: 'none', borderRight: '1px solid #dee2e6', color: 'white', verticalAlign: 'middle' }}>entrée du<br />mois</th>
                                        <th style={{ backgroundColor: '#212529', padding: '10px 12px', borderBottom: 'none', borderRight: '1px solid #dee2e6', color: 'white', verticalAlign: 'middle' }}>en<br />cours</th>
                                        <th style={{ backgroundColor: '#212529', padding: '10px 12px', borderBottom: 'none', color: 'white', verticalAlign: 'middle' }}>annoncée</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {products.length > 0 ? products.map((prod, idx) => (
                                        <tr key={idx} style={{ backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f8f9fa' }}>
                                            <td style={{ padding: '10px 12px' }}>{prod?.NOM_FOURNISSEUR || '-'}</td>
                                            <td style={{ padding: '10px 12px' }}>{prod?.CODE_PRODUIT || prod?.CODEPRODUIT || prod?.code_produit || '-'}</td>
                                            <td style={{ padding: '10px 12px' }}>{prod?.LIBELLE_PRODUIT || prod?.LIBELLE || prod?.libelle_produit || '-'}</td>
                                            <td style={{ padding: '10px 12px' }}>{prod?.QTE_COMMANDEE || Math.floor(Math.random() * 5000) + 1000}</td> {/* Static mockup data */}
                                            <td style={{ padding: '10px 12px' }}>{prod?.SOUS_DOUANE || 0}</td>
                                            <td style={{ padding: '10px 12px' }}>{prod?.ENTREE_MOIS || 0}</td>
                                            <td style={{ padding: '10px 12px' }}>{prod?.EN_COURS || Math.floor(Math.random() * 5000) + 1000}</td> {/* Static mockup data */}
                                            <td style={{ padding: '10px 12px' }}>{prod?.ANNONCEE || 0}</td>
                                        </tr>
                                    )) : (
                                        <tr>
                                            <td colSpan="8" className="text-center py-3 text-muted">Aucun produit lié</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Section 2: Livraisons échues */}
                    <div style={{ padding: '0 24px 16px', borderTop: '1px solid #f1f5f9' }}>
                        <h5 style={{ color: '#e11d48', fontWeight: 'bold', fontSize: '1.1rem', marginTop: '16px', marginBottom: '12px' }}>
                            Livraisons échues
                        </h5>
                        <div className="table-responsive" style={{ border: '1px solid #dee2e6', borderRadius: '4px' }}>
                            <table className="table table-bordered mb-0" style={{ fontSize: '0.9rem' }}>
                                <thead style={{ backgroundColor: '#fcd5d9' }}>
                                    <tr>
                                        <th style={{ backgroundColor: '#fcd5d9', padding: '10px 12px', borderBottom: 'none', borderRight: '1px solid #dee2e6', color: '#1f2937' }}>code produit</th>
                                        <th style={{ backgroundColor: '#fcd5d9', padding: '10px 12px', borderBottom: 'none', borderRight: '1px solid #dee2e6', color: '#1f2937' }}>annee</th>
                                        <th style={{ backgroundColor: '#fcd5d9', padding: '10px 12px', borderBottom: 'none', borderRight: '1px solid #dee2e6', color: '#1f2937' }}>mois</th>
                                        <th style={{ backgroundColor: '#fcd5d9', padding: '10px 12px', borderBottom: 'none', borderRight: '1px solid #dee2e6', color: '#1f2937' }}>Quantité a livrer</th>
                                        <th style={{ backgroundColor: '#fcd5d9', padding: '10px 12px', borderBottom: 'none', color: '#1f2937' }}>Quantité converti</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {loading ? (
                                        <tr><td colSpan="5" className="text-center py-3">Chargement...</td></tr>
                                    ) : echues.length > 0 ? echues.map((liv, i) => (
                                        <tr key={i} style={{ backgroundColor: '#ffffff' }}>
                                            <td style={{ padding: '10px 12px' }}>{liv.CODE_PRODUIT}</td>
                                            <td style={{ padding: '10px 12px' }}>{liv.ANNEE}</td>
                                            <td style={{ padding: '10px 12px' }}>{liv.MOIS}</td>
                                            <td style={{ padding: '10px 12px', fontWeight: 'bold' }}>{liv.QTE_A_LIVRER}</td>
                                            <td style={{ padding: '10px 12px' }}>{liv.QTE_CONVERTI}</td>
                                        </tr>
                                    )) : (
                                        <tr>
                                            <td colSpan="5" className="text-center py-3 text-muted">Aucune livraison échue</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Section 3: Livraisons non échues */}
                    <div style={{ padding: '0 24px 24px' }}>
                        <h5 style={{ color: '#059669', fontWeight: 'bold', fontSize: '1.1rem', marginTop: '16px', marginBottom: '12px' }}>
                            Livraisons non échues
                        </h5>
                        <div className="table-responsive" style={{ border: '1px solid #dee2e6', borderRadius: '4px' }}>
                            <table className="table table-bordered mb-0" style={{ fontSize: '0.9rem' }}>
                        <thead style={{ backgroundColor: '#83daadff' }}>
                            <tr>
                                <th style={{ backgroundColor: '#83daadff', padding: '10px 12px', borderBottom: 'none', color: '#1f2937' }}>code produit</th>
                                <th style={{ backgroundColor: '#83daadff', padding: '10px 12px', borderBottom: 'none', color: '#1f2937' }}>annee</th>
                                <th style={{ backgroundColor: '#83daadff', padding: '10px 12px', borderBottom: 'none', color: '#1f2937' }}>mois</th>
                                <th style={{ backgroundColor: '#83daadff', padding: '10px 12px', borderBottom: 'none', color: '#1f2937' }}>Quantité a livrer</th>
                                <th style={{ backgroundColor: '#83daadff', padding: '10px 12px', borderBottom: 'none', color: '#1f2937' }}>Quantité converti</th>
                            </tr>
                        </thead>
                                <tbody>
                                    {loading ? (
                                        <tr><td colSpan="5" className="text-center py-3">Chargement...</td></tr>
                                    ) : nonEchues.length > 0 ? nonEchues.map((liv, i) => (
                                        <tr key={i} style={{ backgroundColor: '#ffffff' }}>
                                            <td style={{ padding: '10px 12px' }}>{liv.CODE_PRODUIT}</td>
                                            <td style={{ padding: '10px 12px' }}>{liv.ANNEE}</td>
                                            <td style={{ padding: '10px 12px' }}>{liv.MOIS}</td>
                                            <td style={{ padding: '10px 12px', fontWeight: 'bold' }}>{liv.QTE_A_LIVRER}</td>
                                            <td style={{ padding: '10px 12px' }}>{liv.QTE_CONVERTI}</td>
                                        </tr>
                                    )) : (
                                        <tr>
                                            <td colSpan="5" className="text-center py-3 text-muted" style={{ backgroundColor: '#f8f9fa' }}>
                                                Aucune livraison non échue
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default CalendrierModal;
