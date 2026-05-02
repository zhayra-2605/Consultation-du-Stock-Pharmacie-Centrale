/**
 * UI Utility functions for formatting and common display logic.
 */

/**
 * Format a number with rounding and locale string.
 * @param {number|string} val 
 * @returns {string}
 */
export const formatNumber = (val) => {
    if (val == null) return '-';
    return Math.round(Number(val)).toLocaleString();
};

/**
 * Calculate coverage with a cap at 99.
 * @param {number} stock 
 * @param {number} mm 
 * @returns {number}
 */
export const calculateCoverage = (stock, mm) => {
    if (!mm || mm <= 0) return 99;
    const res = stock / mm;
    return res > 99 ? 99 : res;
};

/**
 * Get styling and label for a coverage value.
 * @param {number} val 
 * @returns {object}
 */
export const getCoverageBadgeConfig = (val) => {
    const n = Number(val);
    if (n >= 99) return { 
        label: '> 99 m', 
        bg: 'rgba(16, 185, 129, 0.1)', 
        color: '#10b981', 
        border: '1px solid rgba(16, 185, 129, 0.2)',
        shadow: '0 2px 8px rgba(16, 185, 129, 0.15)'
    };
    if (n <= 2)  return { 
        label: `${n.toFixed(1)} m`, 
        bg: 'rgba(239, 68, 68, 0.1)', 
        color: '#ef4444', 
        border: '1px solid rgba(239, 68, 68, 0.2)',
        shadow: '0 2px 8px rgba(239, 68, 68, 0.15)'
    };
    if (n <= 4)  return { 
        label: `${n.toFixed(1)} m`, 
        bg: 'rgba(245, 158, 11, 0.1)', 
        color: '#f59e0b', 
        border: '1px solid rgba(245, 158, 11, 0.2)',
        shadow: '0 2px 8px rgba(245, 158, 11, 0.15)'
    };
    return { 
        label: `${n.toFixed(1)} m`, 
        bg: 'rgba(16, 185, 129, 0.08)', 
        color: '#059669', 
        border: '1px solid rgba(16, 185, 129, 0.15)',
        shadow: 'none'
    };
};
