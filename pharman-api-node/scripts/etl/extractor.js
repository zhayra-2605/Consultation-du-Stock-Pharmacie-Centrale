const xlsx = require('xlsx');
const path = require('path');
const config = require('./config');

/**
 * Reads an excel file and returns raw data and original headers.
 */
function readExcel(fileName) {
  const filePath = path.join(config.excel.rawDir, fileName);
  const wb = xlsx.readFile(filePath);
  const sheetName = wb.SheetNames[0];
  const sheet = wb.Sheets[sheetName];
  
  const headerMatrix = xlsx.utils.sheet_to_json(sheet, { header: 1 });
  const headerRow = headerMatrix[0] || [];
  
  const originalCols = headerRow
    .map(h => h ? String(h).trim() : null)
    .filter(h => h !== null);
    
  const data = xlsx.utils.sheet_to_json(sheet, { defval: null });
  
  return { 
    data, 
    headerRow,
    originalCols 
  };
}

module.exports = {
  readExcel
};
