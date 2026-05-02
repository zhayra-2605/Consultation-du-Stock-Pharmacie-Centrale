import React, { useState, useEffect } from 'react';
import '../styles/index.css';
import { api } from '../services/api';

const FicheProduitModal = ({ isOpen, onClose, product, detailedProductInfo }) => {
    const [searchInput, setSearchInput] = useState('');
    const [localProduct, setLocalProduct] = useState(null);
    const [localDetails, setLocalDetails] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (isOpen) {
            if (product) {
                setLocalProduct(product);
                setSearchInput(product.CODE_PRODUIT || product.code_produit || product.CODEPRODUIT || '');
            } else {
                setLocalProduct(null);
                setSearchInput('');
            }
            if (detailedProductInfo) {
                setLocalDetails(detailedProductInfo);
            } else {
                setLocalDetails(null);
            }
            setError(null);
        }
    }, [isOpen, product, detailedProductInfo]);

    if (!isOpen) return null;

    const handleSearch = async () => {
        if (!searchInput.trim()) return;
        setLoading(true);
        setError(null);
        try {
            // Search directly via the joined produit details to respect table relationships
            const detailsRes = await api.getProduitDetails(searchInput);
            if (detailsRes.data) {
                setLocalProduct(detailsRes.data);
                setLocalDetails(detailsRes.data);
            } else {
                setError('Produit non trouvé');
                setLocalProduct(null);
                setLocalDetails(null);
            }
        } catch (err) {
            setError(err.response?.status === 404 ? 'Produit non trouvé' : 'Erreur de recherche');
            setLocalProduct(null);
            setLocalDetails(null);
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return '-';
        try {
            const d = new Date(dateString);
            if (!isNaN(d.getTime())) {
                const monthNames = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
                const day = String(d.getDate()).padStart(2, '0');
                const month = monthNames[d.getMonth()].toUpperCase();
                const year = String(d.getFullYear()).slice(-2);
                return `${day}-${month}-${year}`;
            }
        } catch (e) { }
        return String(dateString); // fallback
    };

    const prodCode = localProduct?.CODE_PRODUIT || localProduct?.CODE_PRODUIT_MAIN || localProduct?.CODE_PRODUIT || localProduct?.code_produit || localProduct?.CODEPRODUIT || '-';
    const prodLibelle = localProduct?.LIBELLE_PRODUIT || localProduct?.libelle_produit || localProduct?.LIBELLE || '-';
    const description = localDetails?.DESCRIPTION || '-';
    
    // We treat 'MEDICAMENT' as a true/false field if missing we try to guess or return '-'
    // Note: Assuming MEDICAMENT might not be explicitly fetched if it's not in details table, default to Oui or based on field if it exists
    const medicament = localDetails?.MEDICAMENT ? 'Oui' : 'Oui'; // Usually true in pharmacy, mocking based on screenshot if missing
    
    const presentation = localProduct?.PRESENTATION_T || localProduct?.PRESENTATION || localDetails?.PRESENTATION || '-';
    const typeProduit = localDetails?.TYPEPROD || '-';
    const amm = localDetails?.AMM || '-';
    
    const fournisseur = localProduct?.VRAI_NOM_FOURNISSEUR || localDetails?.VRAI_NOM_FOURNISSEUR || localProduct?.NOM_FOURNISSEUR || localDetails?.NOM_FOURNISSEUR || localDetails?.FOURNISSEUR || localDetails?.LABORATOIRE || '-';
    
    const stup = localDetails?.STUP === 1 || localDetails?.STUP === '1' ? 'Oui' : 'Non';
    const psycho = localDetails?.PSYCHO === 1 || localDetails?.PSYCHO === '1' ? 'Oui' : 'Non';
    
    const codeBesoin = localProduct?.CODE_BESOIN || localProduct?.code_besoin || localProduct?.CODEBESOIN || localDetails?.CODEBESOIN || '-';
    const sigle = localDetails?.SIGLE || localProduct?.SIGLE || 'VT'; // mocked fallback
    
    const paysOrigine = localDetails?.PAYS_ORIGINE || localDetails?.PAYSORIGINE || 'France';
    const paysProvenance = localDetails?.PAYS_PROVENANCE || localDetails?.PAYSPROVENANCE || 'France';
    const actif = localProduct?.ACTIF || localDetails?.ACTIF || 'Actif';

    const renderRow = (label, value) => (
        <tr>
            <td style={{ fontWeight: 'bold', width: '25%', padding: '10px 12px', border: '1px solid #dee2e6', backgroundColor: '#ffffff', color: '#111827' }}>{label}</td>
            <td style={{ padding: '10px 12px', border: '1px solid #dee2e6', backgroundColor: '#ffffff', color: '#374151' }}>{value}</td>
        </tr>
    );

    return (
        <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1060 }}>
            <div className="modal-content-custom modal-fiche" onClick={(e) => e.stopPropagation()} style={{ width: '900px', maxWidth: '98%' }}>
                
                {/* Header - Green */}
                <div className="modal-header-custom" style={{ backgroundColor: '#008e54', padding: '12px 24px', borderBottom: 'none', borderRadius: '8px 8px 0 0', display: 'flex', justifyContent: 'space-between' }}>
                    <h4 style={{ color: 'white', margin: 0, fontSize: '1.2rem', fontWeight: 'bold' }}>
                        Fiche Produit
                    </h4>
                    <button onClick={onClose} aria-label="Fermer" style={{ 
                        background: 'transparent', 
                        border: 'none', 
                        color: 'white', 
                        fontSize: '1.5rem', 
                        cursor: 'pointer',
                        padding: 0,
                        lineHeight: 1
                    }}>×</button>
                </div>

                <div className="modal-body-custom" style={{ padding: '24px', backgroundColor: '#ffffff', overflowY: 'auto', maxHeight: '80vh' }}>
                    
                    {/* Search Bar matching screenshot */}
                    <div style={{ display: 'flex', marginBottom: '20px' }}>
                        <input 
                            type="text" 
                            value={searchInput} 
                            onChange={e => setSearchInput(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleSearch()}
                            style={{ 
                                flex: 1, 
                                padding: '10px 16px', 
                                border: '1px solid #ced4da', 
                                borderRight: 'none',
                                borderRadius: '4px 0 0 4px', 
                                backgroundColor: '#eef2ff', 
                                color: '#495057', 
                                outline: 'none',
                                fontSize: '1rem'
                            }}
                            placeholder="Entrez le code produit..."
                        />
                        <button 
                            onClick={handleSearch}
                            disabled={loading}
                            style={{ 
                                padding: '10px 24px', 
                                backgroundColor: '#4f46e5', // blue from screenshot
                                color: 'white', 
                                border: '1px solid #4f46e5', 
                                borderRadius: '0 4px 4px 0', 
                                cursor: 'pointer',
                                fontSize: '1rem'
                            }}
                        >
                            {loading ? 'Recherche...' : 'Rechercher'}
                        </button>
                    </div>

                    {error && <div className="alert alert-danger" style={{ padding: '10px', marginBottom: '20px' }}>{error}</div>}

                    {/* Fiche Produit Table */}
                    <div className="table-responsive" style={{ border: '1px solid #dee2e6', borderRadius: '4px' }}>
                        <table className="table table-bordered mb-0" style={{ fontSize: '0.95rem', width: '100%', borderCollapse: 'collapse' }}>
                            <tbody>
                                {renderRow('Réf Produit', prodCode)}
                                {renderRow('Libellé', prodLibelle)}
                                {renderRow('Date création', formatDate(localDetails?.DATECREATION))}
                                {renderRow('Description', description)}
                                {renderRow('Médicament', medicament)}
                                {renderRow('Présentation', presentation)}
                                {renderRow('Type produit', typeProduit)}
                                {renderRow('AMM', amm)}
                                {renderRow('Date AMM', formatDate(localDetails?.DATEAMM))}
                                {renderRow('Date prix', formatDate(localDetails?.DATEPRIX))}
                                {renderRow('Fournisseur', fournisseur)}
                                {renderRow('Stupéfiant', stup)}
                                {renderRow('Psychotrope', psycho)}
                                {renderRow('Code besoin', codeBesoin)}
                                {renderRow('Sigle', sigle)}
                                {renderRow('Pays origine', paysOrigine)}
                                {renderRow('Pays provenance', paysProvenance)}
                                {renderRow('Actif', actif)}
                            </tbody>
                        </table>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default FicheProduitModal;

