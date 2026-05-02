import React from 'react';
import { generateStockCoverageReport } from '../utils/pdfGenerator';
import { exportCoverageToExcel } from '../utils/excelGenerator';
import '../styles/index.css';
import { getCodeBesoin, getCodeProduit, getLibelleBesoin, getLibelleProduit, getPresentation } from '../utils/dataUtils';
import { calculateCoverage, formatNumber } from '../utils/uiUtils';
import CoverageBadge from './CoverageBadge';

/* ─── helpers ────────────────────────────────────────────────────────────── */
const getStock = (item) => Number(item?.STOCK ?? item?.stock ?? 0);

/* ─── Pill group header ───────────────────────────────────────────────────── */
const PeriodHeader = ({ label, months, color }) => (
    <th colSpan="2" style={{
        background: `${color}15`,
        color,
        fontWeight: '800',
        fontSize: '0.75rem',
        textTransform: 'uppercase',
        letterSpacing: '0.12em',
        padding: '12px 12px',
        borderBottom: `3px solid ${color}66`,
        textAlign: 'center',
        position: 'relative'
    }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
            <span>{label}</span>
            <span style={{ fontSize: '0.65rem', opacity: 0.8, fontWeight: 700 }}>Période {months} mois</span>
        </div>
    </th>
);

const CoverageCells = ({ mmValue, stock, color }) => (
    <>
        <td style={{ color, fontWeight: '700', padding: '14px 10px', fontSize: '0.85rem' }}>
            {formatNumber(mmValue)}
        </td>
        <td style={{ padding: '14px 10px' }}>
            <CoverageBadge value={calculateCoverage(stock, mmValue)} />
        </td>
    </>
);

/* ─── component ─────────────────────────────────────────────────────────── */
const AutresModal = ({ isOpen, onClose, product, relatedProducts }) => {
    if (!isOpen) return null;

    const products = relatedProducts && relatedProducts.length > 0 ? relatedProducts : [];

    return (
        <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1060 }}>
            <div
                className="modal-content-custom"
                onClick={(e) => e.stopPropagation()}
                style={{ width: '1150px' }}
            >
                {/* ── Header ── */}
                <div className="modal-header-custom" style={{ padding: '24px 40px', borderBottom: '1px solid rgba(0,0,0,0.05)', background: 'rgba(255,255,255,0.4)', backdropFilter: 'blur(10px)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'linear-gradient(135deg, var(--bio-green-primary), #10b981)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '1.2rem', boxShadow: '0 4px 12px rgba(16, 185, 129, 0.2)' }}>
                            <i className="fas fa-layer-group"></i>
                        </div>
                        <div>
                            <h4 style={{ margin: 0, fontWeight: 800, fontSize: '1.25rem', color: 'var(--text-primary)' }}>Couverture Stock / MM</h4>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 500, marginTop: '2px' }}>Analyse comparative des sorties et de la disponibilité</div>
                        </div>
                    </div>
                    <button className="btn-close-custom" onClick={onClose} aria-label="Fermer" style={{ fontSize: '1.5rem', opacity: 0.5 }}>×</button>
                </div>

                <div className="modal-body-custom" style={{ padding: '32px 40px' }}>

                    {/* ── Info ticket ── */}
                    <div style={{
                        background: 'var(--glass-white)',
                        backdropFilter: 'blur(20px)',
                        borderRadius: 'var(--radius-glass-card)',
                        border: '1px solid var(--glass-border)',
                        padding: '20px 24px',
                        boxShadow: 'var(--shadow-glass)',
                        marginBottom: '32px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: '24px'
                    }}>
                        <div style={{
                            fontSize: '0.85rem',
                            fontWeight: '800',
                            textTransform: 'uppercase',
                            letterSpacing: '0.1em',
                            color: 'var(--bio-green-dark)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                        }}>
                            <span>📋</span> Informations du ticket
                        </div>
                        <div style={{ display: 'flex', gap: '32px', flexWrap: 'wrap', fontSize: '0.9rem', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
                            <div><strong>Besoin :</strong> {getLibelleBesoin(product) || 'N/A'}</div>
                            <div><strong>Code :</strong> {getCodeBesoin(product) || 'N/A'}</div>
                            <div><strong>Prés. :</strong> {getPresentation(product) || 'N/A'}</div>
                        </div>
                    </div>

                    {/* ── Tableau ── */}
                    <div className="table-responsive" style={{
                        borderRadius: 'var(--radius-glass-card)',
                        border: '1px solid var(--glass-border)',
                        boxShadow: 'var(--shadow-glass)',
                        marginBottom: '28px',
                        overflow: 'hidden',
                    }}>
                        <table className="table table-hover mb-0" style={{ fontSize: '0.88rem', textAlign: 'center' }}>
                            <thead>
                                {/* Row 1 : group headers */}
                                <tr>
                                    <th rowSpan="2" style={{ verticalAlign: 'middle', background: 'rgba(255,255,255,0.7)', fontWeight: '800', textTransform: 'uppercase', fontSize: '0.7rem', letterSpacing: '0.1em', color: 'var(--text-secondary)', borderBottom: '2px solid rgba(0,0,0,0.06)', padding: '16px 14px' }}>Code</th>
                                    <th rowSpan="2" style={{ verticalAlign: 'middle', background: 'rgba(255,255,255,0.7)', fontWeight: '800', textTransform: 'uppercase', fontSize: '0.7rem', letterSpacing: '0.1em', color: 'var(--text-secondary)', borderBottom: '2px solid rgba(0,0,0,0.06)', textAlign: 'left', padding: '16px 14px' }}>Libellé du Produit</th>
                                    <th rowSpan="2" style={{ verticalAlign: 'middle', background: 'rgba(0,0,0,0.02)', fontWeight: '800', textTransform: 'uppercase', fontSize: '0.7rem', letterSpacing: '0.1em', color: 'var(--text-primary)', borderBottom: '2px solid rgba(0,0,0,0.06)', padding: '16px 14px' }}>Stock Actuel</th>
                                    <PeriodHeader label="Moyen Terme" months={12} color="#10b981" />
                                    <PeriodHeader label="Court Terme"  months={6}  color="#3b82f6" />
                                    <PeriodHeader label="Immédiat"     months={3}  color="#f59e0b" />
                                </tr>
                                {/* Row 2 : sub-headers */}
                                <tr>
                                    {['MM12','Couv.','MM6','Couv.','MM3','Couv.'].map((h, i) => (
                                        <th key={i} style={{
                                            fontSize: '0.65rem', fontWeight: '800', textTransform: 'uppercase',
                                            letterSpacing: '0.1em', padding: '10px 10px',
                                            color: i < 2 ? '#10b981' : i < 4 ? '#3b82f6' : '#f59e0b',
                                            background: i < 2 ? 'rgba(16, 185, 129, 0.04)' : i < 4 ? 'rgba(59, 130, 246, 0.04)' : 'rgba(245, 158, 11, 0.04)',
                                            borderBottom: '1px solid rgba(0,0,0,0.05)',
                                        }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {products.length > 0 ? products.map((prod, idx) => {
                                    const stock = getStock(prod);
                                    return (
                                        <tr key={idx} className="premium-row" style={{ borderBottom: '1px solid rgba(0,0,0,0.03)', transition: 'all 0.2s ease' }}>
                                            <td style={{ fontWeight: '700', color: 'var(--text-primary)', padding: '14px 14px', fontSize: '0.8rem', fontFamily: 'monospace' }}>{getCodeProduit(prod) || '-'}</td>
                                            <td style={{ textAlign: 'left', fontWeight: '600', color: 'var(--text-secondary)', padding: '14px 14px', maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.85rem' }}>{getLibelleProduit(prod) || '-'}</td>
                                            <td style={{ fontWeight: '800', color: 'var(--text-primary)', padding: '14px 14px', background: 'rgba(0,0,0,0.01)', fontSize: '0.9rem' }}>{stock.toLocaleString()}</td>

                                            <CoverageCells mmValue={prod?.MM12} stock={stock} color="#059669" />
                                            <CoverageCells mmValue={prod?.MM6}  stock={stock} color="#2563eb" />
                                            <CoverageCells mmValue={prod?.MM3}  stock={stock} color="#b45309" />
                                        </tr>
                                    );
                                }) : (
                                    <tr>
                                        <td colSpan="9" style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                                            Aucun produit lié disponible.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* ── Actions ── */}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '16px', marginTop: '12px' }}>
                        <button 
                            className="btn-action-base btn-excel-global" 
                            style={{ padding: '10px 24px', borderRadius: '12px', fontWeight: 700 }}
                            onClick={() => exportCoverageToExcel(products, getLibelleBesoin(product) || getLibelleProduit(product))}
                        >
                            <i className="fas fa-file-excel me-2"></i> Exporter Excel
                        </button>
                        <button 
                            className="btn-action-base btn-pdf-global" 
                            style={{ padding: '10px 24px', borderRadius: '12px', fontWeight: 700 }}
                            onClick={() => generateStockCoverageReport(products, product)}
                        >
                            <i className="fas fa-file-pdf me-2"></i> Exporter PDF
                        </button>
                    </div>
                </div>
            </div>
            <style jsx>{`
                .premium-row:hover {
                    background-color: rgba(16, 185, 129, 0.03) !important;
                    transform: scale(1.002);
                }
            `}</style>
        </div>
    );
};

export default AutresModal;
