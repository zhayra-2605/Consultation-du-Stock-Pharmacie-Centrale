/**
 * Standardisation des noms de colonnes et application des règles métiers
 */
function getColumnMappings(tableName, headerRow) {
  const cleanCols = [];
  const cleanToOriginal = {};
  const seen = new Set();

  for (let i = 0; i < headerRow.length; i++) {
    const orig = headerRow[i];
    if (!orig) continue;
    
    let clean = String(orig).trim();

    // RÈGLES DE TRANSFORMATION MÉTIER STRICTES
    if (tableName === 'historique_mouvement') {
      if (clean === 'REFPROD') clean = 'CODE_PRODUIT';
      if (clean === 'QTESTK') clean = 'STOCK_TOTAL';
      if (clean === 'QTEVENTE') clean = 'VENTE_TOTAL';
    }
    if (tableName === 'pcodebesoin' && clean === 'CODE') {
      clean = 'CODE_BESOIN';
    }

    // Gestion de la déduplication des colonnes
    let finalName = clean;
    let counter = 1;
    while (seen.has(finalName)) {
      finalName = `${clean}_${counter++}`;
    }
    seen.add(finalName);
    cleanCols.push(finalName);
    cleanToOriginal[finalName] = String(orig);
  }

  return { cleanCols, cleanToOriginal };
}
