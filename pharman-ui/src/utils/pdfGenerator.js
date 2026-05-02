import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { getCodeProduit, getCodeBesoin, getLibelleProduit, getLibelleBesoin, getPresentation } from './dataUtils';

/**
 * Custom Number Formatter to avoid jsPDF font issues with toLocaleString()
 */
const formatN = (v) => {
    if (v == null) return '0';
    return Math.round(Number(v)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
};
const addHeader = (doc, title) => {
    const date = new Date().toLocaleDateString('fr-FR');
    doc.setFontSize(20);
    doc.setTextColor(0, 155, 77); // Pharmacie Centrale Green
    doc.text('PHARMACIE CENTRALE', 14, 22);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Rapport généré le : ${date}`, 14, 30);
    
    doc.setFontSize(14);
    doc.setTextColor(0);
    doc.text(title, 14, 42);
    
    doc.setLineWidth(0.5);
    doc.setDrawColor(0, 155, 77);
    doc.line(14, 45, 196, 45);
};

/**
 * Add background watermark logo
 */
const addWatermark = (doc) => {
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const imgWidth = 100;
    const imgHeight = 100;
    const x = (pageWidth - imgWidth) / 2;
    const y = (pageHeight - imgHeight) / 2;
    
    // We use a GState for transparency (0.3 for a more visible watermark)
    try {
        doc.saveGraphicsState();
        doc.setGState(new doc.GState({ opacity: 0.3 }));
        // Using the public asset path
        doc.addImage('/assets/logo_watermark.png', 'PNG', x, y, imgWidth, imgHeight);
        doc.restoreGraphicsState();
    } catch (e) {
        console.warn('Could not add watermark:', e);
    }
};


/**
 * Generate PDF for Advanced Regional Comparison
 */
export const generateComparisonReport = (results, product, region1, region2) => {
    const doc = new jsPDF('landscape');
    addWatermark(doc);
    addHeader(doc, `Comparaison Avancée : ${region1} vs ${region2}`);

    if (product) {
        doc.setFontSize(10);
        const code = getCodeBesoin(product) || getCodeProduit(product);
        const name = getLibelleBesoin(product) || getLibelleProduit(product);
        doc.text(`Référence: ${code} - ${name}`, 14, 55);
    }

    const tableColumns = [
        { header: 'Code', dataKey: 'code' },
        { header: 'Désignation', dataKey: 'libelle' },
        { header: `Stock ${region1}`, dataKey: 's1' },
        { header: `MM ${region1}`, dataKey: 'mm1' },
        { header: `Rot. ${region1}`, dataKey: 'r1' },
        { header: `Stock ${region2}`, dataKey: 's2' },
        { header: `MM ${region2}`, dataKey: 'mm2' },
        { header: `Rot. ${region2}`, dataKey: 'r2' }
    ];

    const tableRows = results.map(row => ({
        code: row.code,
        libelle: row.libelle,
        s1: formatN(row.stock1),
        mm1: Number(row.mm1 || 0).toFixed(1),
        r1: row.nbMois1 === 99 ? '> 99m' : `${Number(row.nbMois1 || 0).toFixed(1)}m`,
        s2: formatN(row.stock2),
        mm2: Number(row.mm2 || 0).toFixed(1),
        r2: row.nbMois2 === 99 ? '> 99m' : `${Number(row.nbMois2 || 0).toFixed(1)}m`
    }));

    autoTable(doc, {
        startY: 65,
        columns: tableColumns,
        body: tableRows,
        theme: 'grid',
        headStyles: { fillColor: [79, 70, 229] }, // Indigo for comparison
        styles: { fontSize: 8 }
    });

    doc.save(`Comparaison_${region1}_${region2}.pdf`);
};

/**
 * Unified PREMIUM Dashboard (Tableau de bord)
 * Handles both Products and Needs with a professional analytics layout.
 */
export const generateDashboardReport = (item, stats, relatedProducts, isBesoin) => {
    const doc = new jsPDF();
    const turquoise = [0, 188, 160]; // Turquoise color matching the reference

    const addDashboardHeader = (title) => {
        const dateStr = new Date().toLocaleString('fr-FR');
        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(`Date de génération : ${dateStr}`, 196, 10, { align: 'right' });
        
        doc.setFontSize(22);
        doc.setTextColor(0);
        doc.setFont(undefined, 'bold');
        doc.text(title, 105, 25, { align: 'center' });
        doc.setFont(undefined, 'normal');
    };

    // --- PAGE 1: STATS & DISTRIBUTION ---
    const mainTitle = isBesoin ? 'Tableau de bord Besoin' : 'Tableau de bord Produit';
    addWatermark(doc);
    addDashboardHeader(mainTitle);

    // Section 1: Info selection
    doc.setFontSize(11);
    doc.text(`${isBesoin ? 'Libellé Besoin' : 'Désignation'} : ${isBesoin ? getLibelleBesoin(item) : getLibelleProduit(item)}`, 14, 45);
    doc.text(`Présentation : ${getPresentation(item)}`, 14, 52);
    doc.text(`${isBesoin ? 'Code Besoin' : 'Code Produit'} : ${isBesoin ? getCodeBesoin(item) : getCodeProduit(item)}`, 14, 59);

    // HELPER: Calculate percentage relative to average
    const getPercentToAvg = (val, avg) => {
        if (!avg) return '0%';
        return `${((val / avg) * 100).toFixed(1)}%`;
    };

    // Table 1: Historique Annuel
    const yearAvg = stats.years.reduce((acc, c) => acc + Number(c.totalVente), 0) / (stats.years.length || 1);
    const yearRows = stats.years.slice(0, 5).map(y => [
        y.ANNEE, 
        formatN(y.totalVente), 
        getPercentToAvg(y.totalVente, yearAvg)
    ]);
    if (yearRows.length > 0) {
        yearRows.push([{ content: 'Moyenne mobile', styles: { fontStyle: 'bold' } }, { content: formatN(yearAvg), styles: { fontStyle: 'bold' } }, '—']);
    }

    autoTable(doc, {
        startY: 70,
        margin: { left: 14, right: 14 },
        head: [['Année', 'Valeur', '%']],
        body: yearRows,
        theme: 'grid',
        headStyles: { fillColor: turquoise, textColor: 255 },
        styles: { fontSize: 9, cellPadding: 2 },
        columnStyles: { 0: { cellWidth: 80 }, 1: { cellWidth: 40 }, 2: { cellWidth: 40 } }
    });

    // Table 2: Historique Mensuel (last year)
    const monthAvg = stats.months.reduce((acc, c) => acc + Number(c.totalVente), 0) / (stats.months.length || 1);
    const monthMap = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];
    const monthRows = stats.months.map(m => [
        monthMap[m.MOIS - 1] || m.MOIS, 
        formatN(m.totalVente), 
        getPercentToAvg(m.totalVente, monthAvg)
    ]);

    autoTable(doc, {
        startY: doc.lastAutoTable.finalY + 10,
        margin: { left: 14, right: 14 },
        head: [['Mois', 'Valeur', '%']],
        body: monthRows.slice(-6), 
        theme: 'grid',
        headStyles: { fillColor: turquoise, textColor: 255 },
        styles: { fontSize: 9, cellPadding: 2 },
        columnStyles: { 0: { cellWidth: 80 }, 1: { cellWidth: 40 }, 2: { cellWidth: 40 } }
    });

    // Table 3: Distribution Vente Région
    const totalVenteReg = stats.regions.reduce((acc, c) => acc + Number(c.totalVente), 0);
    const regionVenteRows = stats.regions.map(r => [
        r.region, 
        formatN(r.totalVente), 
        `${totalVenteReg ? ((r.totalVente / totalVenteReg) * 100).toFixed(0) : 0}%`
    ]);

    autoTable(doc, {
        startY: doc.lastAutoTable.finalY + 10,
        margin: { left: 14, right: 14 },
        head: [['Région', 'Vente', '%']],
        body: regionVenteRows,
        theme: 'grid',
        headStyles: { fillColor: turquoise, textColor: 255 },
        styles: { fontSize: 9, cellPadding: 2 },
        columnStyles: { 0: { cellWidth: 80 }, 1: { cellWidth: 40 }, 2: { cellWidth: 40 } }
    });

    // Table 4: Stock & MM par Région
    const regionStockRows = stats.regions.map(r => [
        r.region, 
        formatN(r.totalStock), 
        `MM : ${Number(r.mm || 0).toFixed(1)}`
    ]);

    autoTable(doc, {
        startY: doc.lastAutoTable.finalY + 10,
        margin: { left: 14, right: 14 },
        head: [['Région', 'Stock', 'MM']],
        body: regionStockRows,
        theme: 'grid',
        headStyles: { fillColor: turquoise, textColor: 255 },
        styles: { fontSize: 9, cellPadding: 2 },
        columnStyles: { 0: { cellWidth: 80 }, 1: { cellWidth: 40 }, 2: { cellWidth: 40 } }
    });

    doc.setFontSize(10);
    doc.setTextColor(150);
    doc.text(`Page 1/${isBesoin ? 2 : 1}`, 105, 285, { align: 'center' });

    // --- PAGE 2: DETAILED PRODUCT LIST (Needs only) ---
    if (isBesoin && relatedProducts && relatedProducts.length > 0) {
        doc.addPage();
        addWatermark(doc);
        addDashboardHeader(mainTitle);

        const productCols = [
            { header: 'Code', dataKey: 'code' },
            { header: 'Libellé', dataKey: 'libelle' },
            { header: 'VEIC', dataKey: 'veic' },
            { header: 'Quar.', dataKey: 'quar' },
            { header: 'Bloq.', dataKey: 'bloq' },
            { header: 'Pr.', dataKey: 'pr' },
            { header: 'Stock', dataKey: 'stk' },
            { header: 'Etat', dataKey: 'etat' }
        ];

        const productRows = relatedProducts.map(p => ({
            code: getCodeProduit(p),
            libelle: (getLibelleProduit(p) || '').substring(0, 50),
            veic: p.VEIC || '-',
            quar: Math.round(p.QUARANTAINE || 0).toLocaleString(),
            bloq: Math.round(p.QTE_BLOQUEE || 0).toLocaleString(),
            pr: getPresentation(p),
            stk: Math.round(p.STOCK || 0).toLocaleString(),
            etat: p.ETAT || 'Actif'
        }));

        autoTable(doc, {
            startY: 40,
            columns: productCols,
            body: productRows,
            theme: 'striped',
            headStyles: { fillColor: turquoise, textColor: 255 },
            styles: { fontSize: 8, cellPadding: 2 }
        });

        doc.setFontSize(10);
        doc.setTextColor(150);
        doc.text('Page 2/2', 105, 285, { align: 'center' });
    }

    doc.save(`${mainTitle.replace(/ /g, '_')}_${isBesoin ? getCodeBesoin(item) : getCodeProduit(item)}.pdf`);
};

/**
 * Generate PDF for Stock Coverage (AutresModal)
 */
export const generateStockCoverageReport = (products, item) => {
    const doc = new jsPDF('landscape');
    addWatermark(doc);
    addHeader(doc, `Analyse de Couverture Stock / MM : ${getLibelleBesoin(item) || getLibelleProduit(item)}`);

    const tableColumns = [
        { header: 'Code', dataKey: 'code' },
        { header: 'Désignation', dataKey: 'libelle' },
        { header: 'Stock', dataKey: 'stock' },
        { header: 'MM12', dataKey: 'm12' },
        { header: 'Couv.12', dataKey: 'c12' },
        { header: 'MM6', dataKey: 'm6' },
        { header: 'Couv.6', dataKey: 'c6' },
        { header: 'MM3', dataKey: 'm3' },
        { header: 'Couv.3', dataKey: 'c3' }
    ];

    const tableRows = products.map(p => {
        const stock = Number(p.STOCK || p.stock || 0);
        const m12 = Number(p.MM12 || 0);
        const m6  = Number(p.MM6 || 0);
        const m3  = Number(p.MM3 || 0);
        
        const calcC = (s, m) => (!m || m <= 0) ? '> 99m' : `${(s/m > 99 ? 99 : s/m).toFixed(1)}m`;

        return {
            code: getCodeProduit(p),
            libelle: (getLibelleProduit(p) || '').substring(0, 40),
            stock: formatN(stock),
            m12: m12.toFixed(1),
            c12: calcC(stock, m12),
            m6: m6.toFixed(1),
            c6: calcC(stock, m6),
            m3: m3.toFixed(1),
            c3: calcC(stock, m3)
        };
    });

    autoTable(doc, {
        startY: 55,
        columns: tableColumns,
        body: tableRows,
        theme: 'grid',
        headStyles: { fillColor: [0, 168, 89] }, // Bio Green
        styles: { fontSize: 8 }
    });

    doc.save(`Couverture_Stock_${getCodeBesoin(item) || getCodeProduit(item)}.pdf`);
};

// Aliases for compatibility
export const generateBesoinDashboard = (item, stats, relatedProducts) => generateDashboardReport(item, stats, relatedProducts, true);
export const generateProduitDashboard = (item, stats) => generateDashboardReport(item, stats, [], false);
export const generateMainReport = (data, selectedProduct, isBesoin) => {
    // If selectedProduct exists, we now prefer the High Fidelity Dashboard
    if (selectedProduct) {
        // This is now handled in Dashboard.js to fetch stats first
        console.warn('generateMainReport called for selectedProduct - should use generateDashboardReport instead');
    }
};
