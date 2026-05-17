/**
 * Utility functions for ML predictions and metrics calculation.
 */

const calculateMetrics = (rows) => {
    // KPI 1: Valeur de la MM Couverte (Demande protégée)
    const totalMm = rows.reduce((s, r) => s + Number(r.mm_utilisee), 0);
    let protectedStock = 0;
    rows.forEach(r => {
        // Plafonner le stock protégé à la valeur de la MM pour avoir un % max de 100%
        protectedStock += Math.min(Number(r.stock_predit), Number(r.mm_utilisee));
    });
    const adequacy = totalMm > 0 ? Math.round((protectedStock / totalMm) * 100) : 0;

    // KPI 2: Ruptures Imminentes
    const stockouts = rows.filter(r => Number(r.rupture_predite) === 1).length;
    
    // KPI 3: Demande en Hausse (Pression MM)
    const gaps = rows.filter(r => r.trend === 'up' || (Number(r.mm_utilisee) > 1000 && Number(r.prediction_couverture) < 30)).length;

    return { adequacy, stockouts, gaps };
};

const formatCriticalNeeds = (rows) => {
    return rows.slice(0, 10).map(r => ({
        code:           r.code_besoin,
        label:          r.label_besoin,
        coverage:       Math.round(Number(r.prediction_couverture)),
        trend:          r.trend,
        risk:           parseFloat(r.risque_rupture_prob),
        daysToStockout: Number(r.days_to_stockout),
        stockPredit:    Math.round(Number(r.stock_predit)),
        mmUtilisee:    Math.round(Number(r.mm_utilisee)),
        color: Number(r.rupture_predite) === 1
            ? 'var(--danger-red)'
            : Number(r.prediction_couverture) < 30
                ? '#f59e0b'
                : 'var(--bio-green-primary)'
    }));
};

const calculateHubsHealth = (rows) => {
    // Statuts forcés pour la soutenance selon la demande
    const DEMO_STATUS = {
        'TUNIS':    { status: 'stable',   adequacy: 88 }, // Vert
        'SFAX':     { status: 'stable',   adequacy: 82 }, // Vert
        'SOUSSE':   { status: 'warning',  adequacy: 65 }, // Jaune
        'GAFSA':    { status: 'warning',  adequacy: 58 }, // Jaune
        'KEF':      { status: 'critical', adequacy: 34 }, // Rouge
        'MEDENINE': { status: 'critical', adequacy: 25 }  // Rouge
    };

    const HUB_IDS = ['TUNIS', 'SFAX', 'SOUSSE', 'GAFSA', 'KEF', 'MEDENINE'];
    
    return HUB_IDS.map(hid => {
        return {
            id: hid,
            adequacy: DEMO_STATUS[hid].adequacy,
            status: DEMO_STATUS[hid].status
        };
    });
};

const getGlobalStatus = (adequacy) => {
    return adequacy < 50 ? 'critical' : adequacy < 80 ? 'warning' : 'stable';
};

module.exports = {
    calculateMetrics,
    formatCriticalNeeds,
    calculateHubsHealth,
    getGlobalStatus
};
