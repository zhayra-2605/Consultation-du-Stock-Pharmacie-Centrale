import React, { useState } from 'react';
import Sidebar from '../components/Sidebar';
import SearchBar from '../components/SearchBar';
import StockTable from '../components/StockTable';
import DetailsTable from '../components/DetailsTable';
import StockDetailModal from '../components/StockDetailModal';
import FicheProduitModal from '../components/FicheProduitModal';
import CalendrierModal from '../components/CalendrierModal';
import AutresModal from '../components/AutresModal';
import StatsDashboard from '../components/StatsDashboard';
import RightSidebar from '../components/RightSidebar';
import CompareRegionsModal from '../components/CompareRegionsModal';
import AlertsModal from '../components/AlertsModal';
import SituationView from '../components/Situation/SituationView';
import { api } from '../services/api';
import { getCodeBesoin, getCodeProduit, getLibelleBesoin, getLibelleProduit, getPresentation } from '../utils/dataUtils';
import { generateMainReport, generateBesoinDashboard, generateProduitDashboard } from '../utils/pdfGenerator';

const Dashboard = ({ setToken }) => {
    // Data state
    const [mainData, setMainData] = useState([]);
    const [details, setDetails] = useState([]);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [detailedProductInfo, setDetailedProductInfo] = useState(null);
    const [stockSummary, setStockSummary] = useState([]);
    const [hasSearched, setHasSearched] = useState(false);
    const [lastSearchCritere, setLastSearchCritere] = useState('');
    const [error, setError] = useState(null);
    const [loadingDetails, setLoadingDetails] = useState(false);

    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isFicheModalOpen, setIsFicheModalOpen] = useState(false);
    const [isCalendrierModalOpen, setIsCalendrierModalOpen] = useState(false);
    const [isAutresModalOpen, setIsAutresModalOpen] = useState(false);
    const [isCompareRegionsModalOpen, setIsCompareRegionsModalOpen] = useState(false);
    const [isAlertsModalOpen, setIsAlertsModalOpen] = useState(false);
    const [modalData, setModalData] = useState([]);
    const [modalDepotName, setModalDepotName] = useState('');

    // View state
    const [currentView, setCurrentView] = useState('search'); // 'search' | 'situation'

    const isBesoinSearch = lastSearchCritere === 'Code Besoin' || lastSearchCritere === 'Libellé Besoin';

    const resetSelection = () => {
        setDetails([]);
        setSelectedProduct(null);
        setDetailedProductInfo(null);
        setStockSummary([]);
    };

    const handleSearch = async (critere, valeur) => {
        setError(null);
        setLastSearchCritere(critere);
        try {
            const res = await api.search(critere, valeur);
            setHasSearched(true);
            setMainData(res.data);
            resetSelection();
        } catch (err) {
            const msg = err.response?.data?.error
                || (err.response?.status === 500 ? 'Erreur serveur (500)' : null)
                || err.message
                || "Erreur réseau. Vérifiez que l'API est démarrée (port 8000).";
            setError(msg);
            setMainData([]);
        }
    };

    const handleRowClick = async (row) => {
        setError(null);
        setSelectedProduct(row);
        setDetailedProductInfo(null);
        setStockSummary([]);
        setDetails([]);

        const codeProd = getCodeProduit(row);
        const codeBesoin = getCodeBesoin(row);

        // Fetch stock summary (by besoin preferred, fallback to produit)
        if (codeBesoin) {
            try {
                const res = await api.getStockSummaryByBesoin(codeBesoin);
                setStockSummary(res.data);
            } catch {
                setStockSummary([]);
            }
        } else if (codeProd) {
            try {
                const res = await api.getStockSummary(codeProd);
                setStockSummary(res.data);
            } catch {
                setStockSummary([]);
            }
        }

        // Fetch fiche produit details
        if (codeProd) {
            try {
                const res = await api.getProduitDetails(codeProd);
                setDetailedProductInfo(res.data);
            } catch {
                setDetailedProductInfo(null);
            }
        }

        // Fetch related products by besoin
        if (codeBesoin) {
            setLoadingDetails(true);
            try {
                const res = await api.getProduitsParBesoin(codeBesoin);
                setDetails(res.data);
            } catch (err) {
                setError(`Impossible de charger les produits liés: ${err.message}`);
                setDetails([]);
            } finally {
                setLoadingDetails(false);
            }
        }
    };

    const handleDepotClick = async (depotName) => {
        if (!selectedProduct || !depotName || depotName === 'Stock / Dépôts' || depotName.includes('Stock /')) return;

        try {
            const codeBesoin = getCodeBesoin(selectedProduct);
            const codeProd = getCodeProduit(selectedProduct);

            let res;
            if (codeBesoin) {
                res = await api.getStockDetailsByBesoin(codeBesoin, depotName);
            } else if (codeProd) {
                res = await api.getStockDetails(codeProd, depotName);
            } else {
                return;
            }

            if (!res.data || res.data.length === 0) {
                setError(`Aucun détail de stock disponible pour le dépôt : ${depotName}`);
                return;
            }

            setModalData(res.data);
            setModalDepotName(depotName);
            setIsModalOpen(true);
        } catch (err) {
            const detail = err.response?.data?.detail || err.response?.data?.error || err.message;
            setError(`Erreur lors du chargement du stock pour ${depotName} : ${detail}`);
        }
    };

    const handleImprimer = async () => {
        if (!selectedProduct) return;

        const codeBesoin = getCodeBesoin(selectedProduct);
        const codeProd = getCodeProduit(selectedProduct);

        if (isBesoinSearch && codeBesoin) {
            try {
                const res = await api.getStatsByBesoin(codeBesoin);
                generateBesoinDashboard(selectedProduct, res.data, details);
            } catch {
                generateMainReport(mainData, selectedProduct, isBesoinSearch);
            }
        } else if (codeProd) {
            try {
                const res = await api.getStats(codeProd);
                generateProduitDashboard(selectedProduct, res.data);
            } catch {
                generateMainReport(mainData, selectedProduct, isBesoinSearch);
            }
        } else {
            generateMainReport(mainData, selectedProduct, isBesoinSearch);
        }
    };

    const handleLogout = () => {
        sessionStorage.removeItem('token');
        sessionStorage.removeItem('role');
        setToken(null);
    };

    return (
        <div className="app-container">
            <header className="app-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingRight: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                    <img src="/assets/logo_pct_official.png" alt="Pharmacie Centrale" className="app-header-logo" />
                    <h1 className="app-header-title"><span>Pharmacie</span> Centrale : Consultation du Stock</h1>
                </div>
                <button 
                    onClick={handleLogout}
                    style={{
                        padding: '8px 16px',
                        background: 'transparent',
                        border: '1px solid #e74c3c',
                        color: '#e74c3c',
                        borderRadius: '20px',
                        cursor: 'pointer',
                        fontWeight: 'bold',
                        transition: 'all 0.3s ease'
                    }}
                    onMouseOver={(e) => { e.target.style.background = '#e74c3c'; e.target.style.color = 'white'; }}
                    onMouseOut={(e) => { e.target.style.background = 'transparent'; e.target.style.color = '#e74c3c'; }}
                >
                    🚪 Se déconnecter
                </button>
            </header>

            <div className="dashboard-layout">
                <Sidebar
                    stockSummary={stockSummary}
                    selectedProduct={selectedProduct}
                    onDepotClick={handleDepotClick}
                    onFicheProduitClick={() => setIsFicheModalOpen(true)}
                    onCalendrierClick={() => setIsCalendrierModalOpen(true)}
                    onAutresClick={() => setIsAutresModalOpen(true)}
                    onImprimerClick={handleImprimer}
                />

                <div className="main-content">
                    {currentView === 'situation' ? (
                        <SituationView onBack={() => setCurrentView('search')} />
                    ) : (
                        <>
                            <SearchBar onSearch={handleSearch} />

                            {error && <div className="alert alert-danger">{error}</div>}

                            {hasSearched && (
                                <>
                                    <StockTable
                                        data={mainData}
                                        onRowClick={handleRowClick}
                                        selectedProduct={selectedProduct}
                                        isBesoinSearch={isBesoinSearch}
                                    />

                                    {selectedProduct && (
                                        <div className="info-strip">
                                            <div>
                                                <strong>Code Besoin</strong>
                                                <div style={{ fontSize: '1rem', fontWeight: 'bold' }}>{selectedProduct.CODE_BESOIN}</div>
                                            </div>
                                            <div>
                                                <strong>Libellé Besoin</strong>
                                                <div style={{ fontSize: '1rem', fontWeight: 'bold' }}>{selectedProduct.LIBELLE_BESOIN}</div>
                                            </div>
                                            <div>
                                                <strong>Présentation</strong>
                                                <div style={{ fontSize: '1rem', fontWeight: 'bold' }}>{getPresentation(selectedProduct)}</div>
                                            </div>
                                        </div>
                                    )}

                                    {!isBesoinSearch && selectedProduct && (
                                        <DetailsTable
                                            data={details}
                                            codeBesoin={getCodeBesoin(selectedProduct)}
                                            onRowClick={handleRowClick}
                                            selectedProduct={selectedProduct}
                                            loading={loadingDetails}
                                        />
                                    )}

                                    {selectedProduct && (
                                        <StatsDashboard
                                            code={getCodeBesoin(selectedProduct) ?? getCodeProduit(selectedProduct)}
                                            isBesoin={!!getCodeBesoin(selectedProduct)}
                                            sidebarRegions={stockSummary}
                                        />
                                    )}
                                </>
                            )}

                            {/* Modals */}
                            <StockDetailModal
                                isOpen={isModalOpen}
                                onClose={() => setIsModalOpen(false)}
                                data={modalData}
                                depotName={modalDepotName}
                                productInfo={selectedProduct ? {
                                    code: getCodeProduit(selectedProduct),
                                    libelle: getLibelleProduit(selectedProduct)
                                } : null}
                            />
                            <FicheProduitModal
                                isOpen={isFicheModalOpen}
                                onClose={() => setIsFicheModalOpen(false)}
                                product={selectedProduct}
                                detailedProductInfo={detailedProductInfo}
                            />
                            <CalendrierModal
                                isOpen={isCalendrierModalOpen}
                                onClose={() => setIsCalendrierModalOpen(false)}
                                relatedProducts={details}
                            />
                            <AutresModal
                                isOpen={isAutresModalOpen}
                                onClose={() => setIsAutresModalOpen(false)}
                                product={selectedProduct}
                                relatedProducts={details}
                            />
                            <CompareRegionsModal
                                isOpen={isCompareRegionsModalOpen}
                                onClose={() => setIsCompareRegionsModalOpen(false)}
                                selectedProduct={selectedProduct}
                                isBesoinSearch={isBesoinSearch}
                            />
                            <AlertsModal
                                isOpen={isAlertsModalOpen}
                                onClose={() => setIsAlertsModalOpen(false)}
                            />
                        </>
                    )}
                </div>

                <RightSidebar
                    onCompareClick={() => setIsCompareRegionsModalOpen(true)}
                    onAlertsClick={() => setCurrentView('situation')}
                />
            </div>
        </div>
    );
};

export default Dashboard;
