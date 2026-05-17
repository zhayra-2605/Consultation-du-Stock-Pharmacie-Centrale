/**
 * Utility functions for extracting IDs and properties consistently across the UI.
 * Standardizes the fallback logic originally done via inline `??`.
 */

export const getCodeBesoin = (row) => {
    if (!row) return null;
    return row.CODE_BESOIN ?? row.code_besoin ?? row.CODEBESOIN ?? row.codebesoin;
};

export const getCodeProduit = (row) => {
    if (!row) return null;
    return row.CODE_PRODUIT ?? row.code_produit ?? row.CODEPRODUIT ?? row.codeproduit;
};

export const getLibelleBesoin = (row) => {
    if (!row) return null;
    return row.LIBELLE_BESOIN ?? row.libelle_besoin;
};

export const getLibelleProduit = (row) => {
    if (!row) return null;
    return row.LIBELLE_PRODUIT ?? row.libelle_produit ?? row.LIBELLE ?? row.libelle;
};

export const getPresentation = (row) => {
    if (!row) return null;
    return row.PRESENTATION_T ?? row.PRESENTATION ?? row.presentation ?? row.PRESENTATIONNB;
};

/**
 * Extracts and normalizes the expiry date from various API field names.
 * Returns '-' for missing or invalid (0000-00-00) dates.
 */
export const getDatePeremption = (item) => {
    const date = item?.DATEPEREMP ?? item?.DATE_PEREMPTION ?? item?.date_peremption ?? '';
    if (!date || date === '0000-00-00' || String(date).startsWith('0000-00-00')) {
        return '-';
    }
    return date;
};
