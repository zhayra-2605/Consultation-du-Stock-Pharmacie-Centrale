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
    const HUB_IDS = ['TUNIS', 'SFAX', 'SOUSSE', 'GAFSA', 'KEF', 'MEDENINE'];
    return HUB_IDS.map(hid => {
        const hr = rows.filter(r => r.hub_id === hid);
        if (!hr.length) return { id: hid, status: 'stable', adequacy: 100 };
        // adequacy = % de produits avec couverture >= 30 mois (stable)
        const stable = hr.filter(r => Number(r.prediction_couverture) >= 30).length;
        const adequacy = Math.round((stable / hr.length) * 100);
        return {
            id: hid,
            adequacy,
            status: adequacy < 55 ? 'critical' : adequacy < 80 ? 'warning' : 'stable'
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
