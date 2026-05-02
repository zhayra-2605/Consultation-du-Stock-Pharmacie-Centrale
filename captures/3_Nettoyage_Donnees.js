/**
 * Nettoyage individuel des valeurs de chaque cellule
 * Supprime les espaces inutiles et uniformise les valeurs nulles
 */
function cleanValue(val) {
  if (val === undefined || val === null) return null;
  
  if (typeof val === 'string') {
    const trimmed = val.trim();
    // Transforme les chaînes de caractères vides en NULL SQL
    return trimmed === '' ? null : trimmed;
  }
  
  return val;
}
