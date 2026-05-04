import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { REGIONS } from '../constants/regions';
import { getCodeBesoin, getCodeProduit } from '../utils/dataUtils';
import { generateComparisonReport } from '../utils/pdfGenerator';
import { exportComparisonToExcel } from '../utils/excelGenerator';
import { formatNumber } from '../utils/uiUtils';
import CoverageBadge from './CoverageBadge';

/* ─── component ─────────────────────────────────────────────────────────── */
const CompareRegionsModal = ({ isOpen, onClose, selectedProduct, isBesoinSearch }) => {
    const userRole = sessionStorage.getItem('role');
    const [region1, setRegion1] = useState('Tunis');
    const [region2, setRegion2] = useState('Medenine');
    const [historyMonths, setHistoryMonths] = useState(6);
    const [loading, setLoading] = useState(false);
    const [results, setResults] = useState([]);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (isOpen && selectedProduct) handleApply();
    }, [isOpen, selectedProduct]); // eslint-disable-line

    const handleApply = async () => {
        if (!selectedProduct) return;
        setLoading(true);
        setError(null);
        try {
            const code = isBesoinSearch
                ? getCodeBesoin(selectedProduct)
                : getCodeProduit(selectedProduct);
            const res = await api.compareRegionsAdvanced({
                code,
                isBesoin: isBesoinSearch,
                region1, op1: '>=', val1: 0,
                region2, op2: '>=', val2: 0,
                historyMonths,
            });
            setResults(res.data || []);
        } catch (err) {
            console.error('Erreur compareRegionsAdvanced', err);
            setError('Impossible de charger les données de comparaison.');
        } finally {
            setLoading(false);
        }
    };

    const handleReset = () => {
        setRegion1('Tunis');
        setRegion2('Medenine');
        setHistoryMonths(6);
        setResults([]);
        setError(null);
    };

    const ComparisonDataCells = ({ stock, mm, coverage, isWinner, color, bgColor }) => (
        <>
            <td style={{ fontWeight: '700', fontFamily: 'monospace', color: 'var(--text-primary)', background: `${bgColor}02`, fontSize: '0.85rem' }}>
                {Math.round(stock).toLocaleString()}
            </td>
            <td style={{
                fontWeight: '800',
                color: color,
                background: isWinner ? `${bgColor}1A` : `${bgColor}03`,
                fontSize: '0.85rem'
            }}>
                {formatNumber(mm)}
                {isWinner && <span style={{ marginLeft: '6px', fontSize: '0.8rem', opacity: 0.8 }}>▲</span>}
            </td>
            <td style={{ background: `${bgColor}02` }}>
                <CoverageBadge value={coverage} />
            </td>
        </>
    );

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content-custom" onClick={e => e.stopPropagation()} style={{ width: '1250px' }}>

                {/* ── Header ── */}
                <div className="modal-header-custom" style={{ padding: '24px 40px', borderBottom: '1px solid rgba(0,0,0,0.05)', background: 'rgba(255,255,255,0.4)', backdropFilter: 'blur(10px)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'linear-gradient(135deg, #4f46e5, #3b82f6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '1.2rem', boxShadow: '0 4px 12px rgba(79, 70, 229, 0.2)' }}>
                            <i className="fas fa-balance-scale"></i>
                        </div>
                        <div>
                            <h4 style={{ margin: 0, fontWeight: 800, fontSize: '1.25rem', color: 'var(--text-primary)' }}>Comparaison Régionale</h4>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 500, marginTop: '2px' }}>Analyse comparative des stocks et de la consommation par région</div>
                        </div>
                    </div>
                    <button className="btn-close-custom" onClick={onClose} style={{ fontSize: '1.5rem', opacity: 0.5 }}>×</button>
                </div>

                <div className="modal-body-custom" style={{ padding: '32px 40px' }}>
                    {!selectedProduct ? (
                        <div className="alert alert-warning" style={{ borderRadius: 'var(--radius-glass-card)', fontWeight: '600' }}>
                            ⚠️ Veuillez sélectionner un produit ou un besoin.
                        </div>
                    ) : (
                        <>
                            {/* ── Contrôles ── */}
                            <div style={{
                                background: 'var(--glass-white)',
                                backdropFilter: 'blur(20px)',
                                borderRadius: 'var(--radius-glass-card)',
                                border: '1px solid var(--glass-border)',
                                padding: '28px 32px',
                                boxShadow: 'var(--shadow-glass)',
                                marginBottom: '28px',
                            }}>
                                {/* Region selectors */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 56px 1fr', gap: '24px', alignItems: 'center', marginBottom: '24px' }}>

                                    {/* Region 1 */}
                                    <div style={{
                                        background: 'linear-gradient(135deg, rgba(79, 70, 229, 0.08), rgba(79, 70, 229, 0.02))',
                                        border: '1px solid rgba(79, 70, 229, 0.2)',
                                        borderRadius: '24px',
                                        padding: '24px',
                                        textAlign: 'center',
                                        boxShadow: '0 4px 12px rgba(79, 70, 229, 0.05)'
                                    }}>
                                        <label style={{
                                            color: '#4f46e5',
                                            fontWeight: '800',
                                            fontSize: '0.7rem',
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.15em',
                                            display: 'block',
                                            marginBottom: '16px',
                                        }}>📍 Région Source</label>
                                        <select
                                            className="form-select premium-select"
                                            style={{ fontWeight: '700', borderRadius: '12px', border: '2px solid rgba(79, 70, 229, 0.1)', background: 'white', maxWidth: '240px', margin: '0 auto', display: 'block', padding: '10px 16px' }}
                                            value={region1}
                                            onChange={e => setRegion1(e.target.value)}
                                        >
                                            {REGIONS.filter(r => r !== 'National').map(r => <option key={r} value={r}>{r}</option>)}
                                        </select>
                                    </div>

                                    {/* Icone de comparaison subtile */}
                                    <div style={{ textAlign: 'center', position: 'relative' }}>
                                        <div style={{
                                            width: '44px', height: '44px', borderRadius: '14px',
                                            background: 'white',
                                            color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            fontSize: '1rem', margin: '0 auto',
                                            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
                                            border: '1px solid rgba(0,0,0,0.05)',
                                            zIndex: 2,
                                            position: 'relative'
                                        }}>
                                            <i className="fas fa-columns"></i>
                                        </div>
                                        <div style={{ position: 'absolute', top: '50%', left: '-15px', right: '-15px', height: '1px', background: 'rgba(0,0,0,0.06)', zIndex: 1 }}></div>
                                    </div>

                                    {/* Region 2 */}
                                    <div style={{
                                        background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08), rgba(16, 185, 129, 0.02))',
                                        border: '1px solid rgba(16, 185, 129, 0.2)',
                                        borderRadius: '24px',
                                        padding: '24px',
                                        textAlign: 'center',
                                        boxShadow: '0 4px 12px rgba(16, 185, 129, 0.05)'
                                    }}>
                                        <label style={{
                                            color: '#059669',
                                            fontWeight: '800',
                                            fontSize: '0.7rem',
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.15em',
                                            display: 'block',
                                            marginBottom: '16px',
                                        }}>📍 Région Cible</label>
                                        <select
                                            className="form-select premium-select"
                                            style={{ fontWeight: '700', borderRadius: '12px', border: '2px solid rgba(16, 185, 129, 0.1)', background: 'white', maxWidth: '240px', margin: '0 auto', display: 'block', padding: '10px 16px' }}
                                            value={region2}
                                            onChange={e => setRegion2(e.target.value)}
                                        >
                                            {REGIONS.filter(r => r !== 'National').map(r => <option key={r} value={r}>{r}</option>)}
                                        </select>
                                    </div>
                                </div>

                                {/* Options row */}
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '32px',
                                    flexWrap: 'wrap',
                                    paddingTop: '20px',
                                    borderTop: '1px solid var(--glass-border)',
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <span style={{ fontWeight: '700', color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
                                            📅 Période MM :
                                        </span>
                                        <select
                                            className="form-select"
                                            style={{ width: '120px', fontWeight: 'bold' }}
                                            value={historyMonths}
                                            onChange={e => setHistoryMonths(e.target.value)}
                                        >
                                            <option value="3">3 mois</option>
                                            <option value="6">6 mois</option>
                                            <option value="12">12 mois</option>
                                        </select>
                                    </div>

                                    <div style={{ display: 'flex', gap: '12px' }}>
                                        <button className="btn-action-base btn-reset-global" onClick={handleReset} style={{ borderRadius: '12px', padding: '10px 20px', fontWeight: 700 }}>
                                            Réinitialiser
                                        </button>
                                        <button className="btn-action-base btn-exec-global" onClick={handleApply} disabled={loading} style={{ borderRadius: '12px', padding: '10px 28px', fontWeight: 800, background: 'linear-gradient(135deg, #4f46e5, #3b82f6)' }}>
                                            {loading
                                                ? <span className="spinner-border spinner-border-sm me-2"></span>
                                                : <i className="fas fa-sync-alt me-2"></i>
                                            }
                                            Lancer la comparaison
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Erreur */}
                            {error && (
                                <div className="alert alert-danger" style={{ borderRadius: 'var(--radius-glass-card)', fontWeight: '600' }}>
                                    {error}
                                </div>
                            )}

                            {/* ── Titre résultats ── */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                                <div style={{
                                    fontSize: '0.8rem',
                                    fontWeight: '800',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.1em',
                                    color: 'var(--bio-green-dark)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '12px',
                                }}>
                                    <span style={{ fontSize: '1.1rem' }}>📊</span> 
                                    <span>Résultats de la comparaison</span>
                                    {results.length > 0 && (
                                        <span style={{ fontWeight: '600', color: 'var(--text-muted)', textTransform: 'none', letterSpacing: 0 }}>
                                            — {results.length} produit{results.length > 1 ? 's' : ''}
                                        </span>
                                    )}
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                    {/* Légende */}
                                    <div style={{ display: 'flex', gap: '8px', fontSize: '0.7rem' }}>
                                        {[
                                            { bg: 'rgba(225,29,72,0.1)', color: '#e11d48', label: '≤ 2m' },
                                            { bg: 'rgba(245,158,11,0.1)', color: '#d97706', label: '≤ 4m' },
                                            { bg: 'rgba(0,168,89,0.1)', color: 'var(--bio-green-dark)', label: '> 4m' },
                                        ].map((b, i) => (
                                            <span key={i} style={{ background: b.bg, color: b.color, border: `1px solid ${b.color}33`, padding: '2px 10px', borderRadius: '8px', fontWeight: '700' }}>{b.label}</span>
                                        ))}
                                    </div>

                                    {/* Bouton Print */}
                                    <div className="d-flex gap-2 ms-auto">
                                        {userRole !== 'VIEWER' && results.length > 0 && (
                                            <button 
                                                className="btn-action-base btn-print-global"
                                                title="Imprimer cette comparaison"
                                                onClick={() => window.print()}
                                                style={{ 
                                                    padding: '8px 16px', 
                                                    borderRadius: '10px', 
                                                    fontSize: '0.75rem', 
                                                    fontWeight: '700',
                                                    background: 'white',
                                                    border: '1px solid var(--glass-border)',
                                                    color: 'var(--text-secondary)',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '6px',
                                                    boxShadow: '0 2px 6px rgba(0,0,0,0.05)'
                                                }}
                                            >
                                                <i className="fas fa-print"></i> Imprimer
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* ── Tableau ── */}
                            <div className="table-responsive" style={{
                                maxHeight: '420px',
                                overflowY: 'auto',
                                borderRadius: 'var(--radius-glass-card)',
                                border: '1px solid var(--glass-border)',
                                boxShadow: 'var(--shadow-glass)',
                                marginBottom: '24px',
                            }}>
                                <table className="table table-hover mb-0" style={{ fontSize: '0.88rem', textAlign: 'center' }}>
                                    <thead style={{ position: 'sticky', top: 0, zIndex: 5 }}>
                                        {/* Row 1 */}
                                        <tr>
                                            <th rowSpan="2" style={{ verticalAlign: 'middle', background: 'rgba(255,255,255,0.95)', fontWeight: '800', textTransform: 'uppercase', fontSize: '0.65rem', letterSpacing: '0.12em', color: 'var(--text-secondary)', borderBottom: '2px solid rgba(0,0,0,0.06)', padding: '16px 14px' }}>Code</th>
                                            <th rowSpan="2" style={{ verticalAlign: 'middle', background: 'rgba(255,255,255,0.95)', fontWeight: '800', textTransform: 'uppercase', fontSize: '0.65rem', letterSpacing: '0.12em', color: 'var(--text-secondary)', borderBottom: '2px solid rgba(0,0,0,0.06)', textAlign: 'left', padding: '16px 14px', minWidth: '220px' }}>Désignation Produit</th>
                                            <th colSpan="3" style={{ background: 'rgba(79,70,229,0.1)', color: '#4f46e5', fontWeight: '800', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em', padding: '12px', borderBottom: '3px solid rgba(79,70,229,0.3)' }}>
                                                📍 {region1}
                                            </th>
                                            <th colSpan="3" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#059669', fontWeight: '800', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em', padding: '12px', borderBottom: '3px solid rgba(16, 185, 129, 0.3)' }}>
                                                📍 {region2}
                                            </th>
                                            <th rowSpan="2" style={{ verticalAlign: 'middle', background: 'rgba(245,158,11,0.08)', color: '#92400e', fontWeight: '800', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.1em', borderBottom: '2px solid rgba(245,158,11,0.2)', padding: '16px 14px', whiteSpace: 'nowrap' }}>Surconsommation<br/>Régionale</th>
                                        </tr>
                                        {/* Row 2 */}
                                        <tr>
                                            {['Stock', `MM ${historyMonths}m`, 'Couverture', 'Stock', `MM ${historyMonths}m`, 'Couverture'].map((h, i) => (
                                                <th key={i} style={{
                                                    fontSize: '0.65rem', fontWeight: '800', textTransform: 'uppercase',
                                                    letterSpacing: '0.08em', padding: '10px 10px',
                                                    color: i < 3 ? '#4338ca' : '#047857',
                                                    background: i < 3 ? 'rgba(79,70,229,0.04)' : 'rgba(16, 185, 129, 0.04)',
                                                    borderBottom: '1px solid rgba(0,0,0,0.05)',
                                                }}>{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {results.length === 0 ? (
                                            <tr>
                                                <td colSpan="9" style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>
                                                    {loading ? (
                                                        <>
                                                            <div className="spinner-border text-success mb-3"></div>
                                                            <div style={{ fontWeight: '600' }}>Chargement des données…</div>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <div style={{ fontSize: '2rem', marginBottom: '12px' }}>⚖️</div>
                                                            <div style={{ fontWeight: '600' }}>Cliquez sur <strong>"Comparer"</strong> pour afficher les résultats.</div>
                                                        </>
                                                    )}
                                                </td>
                                            </tr>
                                        ) : results.map((row, idx) => {
                                            const mm1 = Number(row.mm1);
                                            const mm2 = Number(row.mm2);
                                            const winner = mm1 > mm2 ? 'r1' : mm2 > mm1 ? 'r2' : 'eq';

                                            return (
                                                <tr key={idx} className="premium-row" style={{ borderBottom: '1px solid rgba(0,0,0,0.03)', transition: 'all 0.2s ease' }}>
                                                    <td style={{ fontWeight: '700', color: 'var(--text-primary)', padding: '14px 14px', fontSize: '0.8rem', fontFamily: 'monospace' }}>{row.code}</td>
                                                    <td style={{ textAlign: 'left', fontWeight: '600', color: 'var(--text-secondary)', padding: '14px 14px', fontSize: '0.85rem' }}>{row.libelle}</td>

                                                    <ComparisonDataCells 
                                                        stock={row.stock1} 
                                                        mm={mm1} 
                                                        coverage={row.nbMois1} 
                                                        isWinner={winner === 'r1'} 
                                                        color="#4f46e5" 
                                                        bgColor="#4f46e5" 
                                                    />

                                                    <ComparisonDataCells 
                                                        stock={row.stock2} 
                                                        mm={mm2} 
                                                        coverage={row.nbMois2} 
                                                        isWinner={winner === 'r2'} 
                                                        color="#059669" 
                                                        bgColor="#10b981" 
                                                    />

                                                    {/* Gagnant MM */}
                                                    <td style={{ background: 'rgba(245,158,11,0.02)', padding: '14px 10px' }}>
                                                        {winner === 'r1' && (
                                                            <span style={{ padding: '5px 12px', borderRadius: '10px', background: 'rgba(79,70,229,0.12)', color: '#4f46e5', fontWeight: '800', fontSize: '0.75rem', border: '1px solid rgba(79,70,229,0.2)' }}>
                                                                {region1}
                                                            </span>
                                                        )}
                                                        {winner === 'r2' && (
                                                            <span style={{ padding: '5px 12px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.12)', color: '#059669', fontWeight: '800', fontSize: '0.75rem', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                                                                {region2}
                                                            </span>
                                                        )}
                                                        {winner === 'eq' && (
                                                            <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600 }}>Identique</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            {/* ── Footer ── */}
                             <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '16px', marginTop: '12px' }}>
                                 <div className="d-flex align-items-center gap-3">
                                    <div className="table-row-count text-muted small fw-bold">
                                        <i className="fas fa-list-ol me-1"></i> {results.length} lignes
                                    </div>
                                    {userRole !== 'VIEWER' && (
                                        <button 
                                         className="btn-action-base btn-excel-global" 
                                         style={{ borderRadius: '12px', padding: '10px 24px', fontWeight: 700 }}
                                         title="Exporter toutes les données vers Excel"
                                         onClick={() => exportComparisonToExcel(results, region1, region2)}
                                         disabled={results.length === 0}
                                        >
                                         <i className="fas fa-file-excel me-2"></i> Exporter Excel
                                        </button>
                                    )}
                                </div>
                                 {userRole !== 'VIEWER' && (
                                     <button 
                                         className="btn-action-base btn-pdf-global" 
                                         disabled={results.length === 0} 
                                         style={{ borderRadius: '12px', padding: '10px 24px', fontWeight: 700 }}
                                         onClick={() => generateComparisonReport(results, selectedProduct, region1, region2, isBesoinSearch)}
                                     >
                                         <i className="fas fa-file-pdf me-2"></i> Exporter PDF
                                     </button>
                                 )}
                             </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CompareRegionsModal;
