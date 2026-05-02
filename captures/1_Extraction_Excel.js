const xlsx = require('xlsx');
const path = require('path');
const config = require('./config');

/**
 * Fonction pour lire un fichier Excel et extraire les données brutes
 */
function readExcel(fileName) {
  const filePath = path.join(config.excel.rawDir, fileName);
  const wb = xlsx.readFile(filePath);
  const sheetName = wb.SheetNames[0];
  const sheet = wb.Sheets[sheetName];
  
  // Extraction des en-têtes
  const headerMatrix = xlsx.utils.sheet_to_json(sheet, { header: 1 });
  const headerRow = headerMatrix[0] || [];
  
  const originalCols = headerRow
    .map(h => h ? String(h).trim() : null)
    .filter(h => h !== null);
    
  // Extraction des données brutes
  const data = xlsx.utils.sheet_to_json(sheet, { defval: null });
  
  return { 
    data, 
    headerRow,
    originalCols 
  };
}
