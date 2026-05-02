import React from 'react';
import { getCoverageBadgeConfig } from '../utils/uiUtils';

const CoverageBadge = ({ value, style = {} }) => {
    const config = getCoverageBadgeConfig(value);
    
    return (
        <span style={{ 
            padding: '5px 12px', 
            borderRadius: '10px', 
            fontWeight: '800', 
            fontSize: '0.75rem', 
            background: config.bg, 
            color: config.color, 
            border: config.border,
            boxShadow: config.shadow,
            display: 'inline-block',
            minWidth: '65px',
            ...style
        }}>
            {config.label}
        </span>
    );
};

export default CoverageBadge;
