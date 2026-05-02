import * as XLSX from 'xlsx';
import { getCodeProduit, getLibelleProduit } from './dataUtils';
import { calculateCoverage } from './uiUtils';

/**
 * Common Excel Export logic
 */
const downloadExcel = (data, filename) => {
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Données");
    XLSX.writeFile(wb, `${filename}.xlsx`);
};

/**
 * Export Comparison Results
 */
export const exportComparisonToExcel = (results, region1, region2) => {
    const data = results.map(row => ({
        "Code": row.code,
        "Désignation": row.libelle,
        [`Stock ${region1}`]: Math.round(row.stock1),
        [`MM ${region1}`]: Number(row.mm1).toFixed(1),
        [`Couverture ${region1} (mois)`]: row.nbMois1 === 99 ? '> 99' : row.nbMois1.toFixed(1),
        [`Stock ${region2}`]: Math.round(row.stock2),
        [`MM ${region2}`]: Number(row.mm2).toFixed(1),
        [`Couverture ${region2} (mois)`]: row.nbMois2 === 99 ? '> 99' : row.nbMois2.toFixed(1),
    }));
    downloadExcel(data, `Comparaison_${region1}_${region2}`);
};

/**
 * Export Stock Coverage (AutresModal)
 */
export const exportCoverageToExcel = (products, needLabel) => {
    const data = products.map(p => {
        const stock = Number(p.STOCK || p.stock || 0);
        const m12 = Number(p.MM12 || 0);
        const m6  = Number(p.MM6 || 0);
        const m3  = Number(p.MM3 || 0);
        
        return {
            "Code": getCodeProduit(p),
            "Désignation": getLibelleProduit(p),
            "Stock Actuel": Math.round(stock),
            "MM12": m12.toFixed(1),
            "Couverture 12m": calculateCoverage(stock, m12).toFixed(1),
            "MM6": m6.toFixed(1),
            "Couverture 6m": calculateCoverage(stock, m6).toFixed(1),
            "MM3": m3.toFixed(1),
            "Couverture 3m": calculateCoverage(stock, m3).toFixed(1)
        };
    });
    downloadExcel(data, `Couverture_Stock_${needLabel.replace(/ /g, '_')}`);
};
