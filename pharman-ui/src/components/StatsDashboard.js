import React, { useEffect, useState } from 'react';
import {
    Chart as ChartJS,
    CategoryScale, LinearScale, BarElement,
    Title, Tooltip, Legend, ArcElement,
    PointElement, LineElement, LineController, BarController,
} from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { Chart } from 'react-chartjs-2';
import { api } from '../services/api';

ChartJS.register(
    CategoryScale, LinearScale, BarElement,
    Title, Tooltip, Legend, ArcElement,
    PointElement, LineElement, LineController, BarController,
    ChartDataLabels
);

// Pie chart color palette per region slot (Matching Heatmap ML)
const PIE_COLOR_MAP = {
    'TUNIS': '#00A859',
    'KEF': '#3b82f6',
    'SFAX': '#f97316',
    'GAFSA': '#f59e0b',
    'SOUSSE': '#a855f7',
    'MEDENINE': '#854d0e'
};

const StatsDashboard = ({ code, isBesoin, sidebarRegions }) => {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!code) return;
        setLoading(true);
        const fetchStats = isBesoin ? api.getStatsByBesoin : api.getStats;
        fetchStats(code)
            .then(res => setStats(res.data))
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [code, isBesoin]);

    if (loading) return <div className="text-center p-3">Chargement des statistiques...</div>;
    if (!stats) return null;

    // Prefer live sidebarRegions over stats.regions for current stock breakdown
    const regionsData = (sidebarRegions?.length > 0)
        ? sidebarRegions
            .filter(r => r.depot !== 'National')
            .map(r => ({ region: r.depot, totalStock: r.totalStock, totalVente: r.totalVente ?? 0 }))
        : (stats.regions ?? []);

    const sortedYears = [...stats.years].sort((a, b) => a.ANNEE - b.ANNEE);
    const latestYear = sortedYears.length > 0 ? sortedYears[sortedYears.length - 1].ANNEE : new Date().getFullYear();
    const displayYears = [...sortedYears].reverse().slice(0, 4);

    // --- Chart data ---
    const pieData = {
        labels: regionsData.map(r => r.region),
        datasets: [{
            data: regionsData.map(r => r.totalStock),
            backgroundColor: regionsData.map(r => {
                const key = r.region.toUpperCase().replace('EL ', '').normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                return PIE_COLOR_MAP[key] || PIE_COLOR_MAP[Object.keys(PIE_COLOR_MAP).find(k => key.includes(k))] || '#6c757d';
            }),
            borderWidth: 1,
        }],
    };

    const comboData = {
        labels: sortedYears.map(y => y.ANNEE),
        datasets: [
            {
                type: 'bar',
                label: "Stock (Quantité Globale)",
                backgroundColor: '#009b4d',
                data: sortedYears.map(y => Math.round(y.totalStock)),
                borderColor: 'white',
                borderWidth: 2,
                yAxisID: 'y',
            },
            {
                type: 'line',
                label: 'Vente (Totale Annuelle)',
                borderColor: '#dc3545',
                borderWidth: 2,
                fill: false,
                data: sortedYears.map(y => Math.round(y.totalVente)),
                tension: 0.4,
                yAxisID: 'y1',
            },
        ],
    };

    const maxGlobal = Math.max(
        0,
        ...sortedYears.map(y => Math.round(y.totalStock)),
        ...sortedYears.map(y => Math.round(y.totalVente))
    ) * 1.15;

    const comboOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            datalabels: {
                display: true,
                align: (context) => context.dataset.type === 'line' ? 'bottom' : 'top',
                anchor: (context) => context.dataset.type === 'line' ? 'start' : 'end',
                font: { weight: 'bold' },
                color: (context) => context.dataset.type === 'line' ? '#dc3545' : '#009b4d',
                formatter: Math.round
            }
        },
        scales: {
            y: {
                type: 'linear',
                position: 'left',
                min: 0,
                max: maxGlobal,
                title: { display: true, text: 'Stock (Unités)', color: '#009b4d', font: { weight: 'bold' } },
            },
            y1: {
                type: 'linear',
                position: 'right',
                min: 0,
                max: maxGlobal,
                title: { display: true, text: 'Vente (Unités)', color: '#dc3545', font: { weight: 'bold' } },
                grid: {
                    drawOnChartArea: false, 
                },
            }
        },
    };

    const cardStyle = { background: 'rgba(255,255,255,0.4)', borderColor: 'rgba(255,255,255,0.5) !important' };

    const pastYears = displayYears.filter(y => y.ANNEE !== latestYear);
    const mmAnnuelle = pastYears.length > 0 
        ? pastYears.reduce((sum, y) => sum + y.totalVente, 0) / pastYears.length 
        : (displayYears.length > 0 ? displayYears[0].totalVente : 1);

    const displayMonths = stats.months.slice(-3);

    const totalVenteRegions = regionsData.reduce((sum, r) => sum + r.totalVente, 0);
    const totalStockRegions = regionsData.reduce((sum, r) => sum + r.totalStock, 0);
    const totalMmRegions = regionsData.reduce((sum, r) => sum + (r.mm != null ? r.mm : (r.totalVente/12)), 0);

    const modernStyles = `
        .stat-card-modern {
            background-color: #f8f9fa;
            border: 1px solid #e9ecef;
            border-radius: 8px;
            padding: 10px 5px;
            text-align: center;
            width: 115px;      /* Fixe la même largeur pour toutes les cartes */
            height: 100px;     /* Fixe la même hauteur pour toutes les cartes */
            flex: 0 0 auto;    /* Empêche les cartes de s'étirer pour remplir la ligne */
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            box-shadow: 0 1px 2px rgba(0,0,0,0.02);
            overflow: hidden;
        }
        .stat-card-modern.highlight {
            background-color: #e8f5e9;
            border-color: #c8e6c9;
        }
        .stat-card-modern .stat-title {
            font-size: 0.85rem;
            font-weight: 600;
            color: #333;
            margin-bottom: 5px;
            width: 100%;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }
        .stat-card-modern .stat-value {
            font-size: 1.15rem;
            font-weight: bold;
            line-height: 1;
        }
        .stat-card-modern .stat-sub {
            font-size: 0.75rem;
            color: #6c757d;
            margin-top: 5px;
        }
    `;

    return (
        <div className="stats-container mt-4 mb-4">
            <style>{modernStyles}</style>
            <div className="row">

                {/* LEFT: Stats cards */}
                <div className="col-md-6">
                    <div className="table-custom-wrapper mb-3" style={{ padding: '20px' }}>
                        <div className="table-title mb-4">📊 Statistiques</div>

                        {/* ANNEES */}
                        <h6 className="fw-bold mb-2 text-dark">Années</h6>
                        <div className="d-flex flex-wrap gap-2 mb-4 border-bottom pb-3">
                            {pastYears.map(y => (
                                <div key={y.ANNEE} className="stat-card-modern">
                                    <div className="stat-title">{y.ANNEE}</div>
                                    <div className="stat-value text-success">{Math.round(y.totalVente)}</div>
                                    <div className="stat-sub">{(y.totalVente / mmAnnuelle * 100).toFixed(1)}%</div>
                                </div>
                            ))}
                            {displayYears.find(y => y.ANNEE === latestYear) && (
                                <div className="stat-card-modern highlight">
                                    <div className="stat-title">Année en cours</div>
                                    <div className="stat-value text-success">{Math.round(displayYears.find(y => y.ANNEE === latestYear).totalVente)}</div>
                                    <div className="stat-sub">{(displayYears.find(y => y.ANNEE === latestYear).totalVente / mmAnnuelle * 100).toFixed(1)}%</div>
                                </div>
                            )}
                            <div className="stat-card-modern">
                                <div className="stat-title">Moyenne mobile</div>
                                <div className="stat-value text-success">{Math.round(mmAnnuelle)}</div>
                                <div className="stat-sub">—</div>
                            </div>
                        </div>

                        {/* MOIS */}
                        <h6 className="fw-bold mb-2 text-dark">Mois</h6>
                        <div className="d-flex flex-wrap gap-2 mb-4 border-bottom pb-3">
                            {displayMonths.map(m => {
                                const monthName = new Date(0, m.MOIS - 1).toLocaleString('fr-FR', { month: 'long' });
                                return (
                                    <div key={m.MOIS} className="stat-card-modern">
                                        <div className="stat-title text-capitalize">{monthName}</div>
                                        <div className="stat-value text-success">{Math.round(m.totalVente)}</div>
                                        <div className="stat-sub">{(m.totalVente / (mmAnnuelle > 0 ? mmAnnuelle : 1) * 100).toFixed(1)}%</div>
                                    </div>
                                );
                            })}
                            {displayMonths.length === 0 && <div className="text-muted small w-100">Aucune donnée mensuelle</div>}
                        </div>

                        {/* VENTE PAR REGION */}
                        <h6 className="fw-bold mb-2 text-dark">Vente par région</h6>
                        <div className="d-flex flex-wrap gap-2 mb-4 border-bottom pb-3">
                            {regionsData.map(r => {
                                const pct = totalVenteRegions > 0 ? (r.totalVente / totalVenteRegions * 100) : 0;
                                return (
                                    <div key={r.region} className="stat-card-modern">
                                        <div className="stat-title">{r.region}</div>
                                        <div className="stat-value text-success">{Math.round(r.totalVente)}</div>
                                        <div className="stat-sub">{pct.toFixed(0)}%</div>
                                    </div>
                                );
                            })}
                            <div className="stat-card-modern highlight">
                                <div className="stat-title">Vente</div>
                                <div className="stat-value text-success">{Math.round(totalVenteRegions)}</div>
                                <div className="stat-sub">100%</div>
                            </div>
                        </div>

                        {/* STOCK PAR REGION */}
                        <h6 className="fw-bold mb-2 text-dark">Stock par région</h6>
                        <div className="d-flex flex-wrap gap-2">
                            <div className="stat-card-modern highlight">
                                <div className="stat-title">National</div>
                                <div className="stat-value text-success">{Math.round(totalStockRegions)}</div>
                                <div className="stat-sub">100% | MM : {Math.round(totalMmRegions)}</div>
                            </div>
                            {regionsData.map(r => {
                                const mm = r.mm != null ? r.mm : (r.totalVente / 12);
                                const pctStock = totalStockRegions > 0 ? (r.totalStock / totalStockRegions * 100) : 0;
                                return (
                                    <div key={r.region} className="stat-card-modern">
                                        <div className="stat-title">{r.region}</div>
                                        <div className="stat-value text-success">{Math.round(r.totalStock)}</div>
                                        <div className="stat-sub">{pctStock.toFixed(0)}% | MM : {Math.round(mm)}</div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* RIGHT: Charts */}
                <div className="col-md-6">
                    <div className="table-custom-wrapper h-100 d-flex flex-column">
                        <div className="table-title">📉 Graphiques &amp; Analyses</div>
                        <div className="d-flex flex-column justify-content-around flex-grow-1">
                            <div className="chart-container mb-4" style={{ height: '250px', position: 'relative' }}>
                                <h6 className="text-center text-muted mb-2">Stock par Région</h6>
                                <Chart 
                                    type="pie" 
                                    data={pieData} 
                                    options={{ 
                                        maintainAspectRatio: false, 
                                        plugins: { 
                                            datalabels: { 
                                                display: false 
                                            },
                                            tooltip: {
                                                callbacks: {
                                                    label: (context) => {
                                                        const label = context.label || '';
                                                        const value = context.parsed;
                                                        const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                                        const pct = total > 0 ? Math.round((value / total) * 100) : 0;
                                                        return `${label}: ${value} (${pct}%)`;
                                                    }
                                                }
                                            }
                                        } 
                                    }} 
                                />
                            </div>
                            <hr />
                            <div className="chart-container" style={{ height: '250px', position: 'relative' }}>
                                <h6 className="text-center text-muted mb-2">Stock &amp; Vente par Année</h6>
                                <Chart type="bar" data={comboData} options={comboOptions} />
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default StatsDashboard;
