import React from 'react';

const ALL_DEPOTS = ['National', 'Réserve', 'Tunis', 'Sousse', 'Sfax', 'Medenine', 'Gafsa', 'Kef'];

const DepotButtons = ({ summary, onDepotClick, selectedProduct }) => {
    return (
        <div className="d-flex flex-column gap-2">
            <h6 className="text-center text-success fw-bold border-bottom pb-2">Stock / Dépôts</h6>
            {ALL_DEPOTS.map((depot) => {
                let btnClass = 'btn-light border'; // Default state
                let isClickable = false;

                // Only apply coloring if a product is selected
                if (selectedProduct && summary) {
                    if (summary.length > 0) {
                        const stockInfo = summary.find(item => item.depot.toUpperCase() === depot.toUpperCase());

                        if (stockInfo) {
                            if (Number(stockInfo.totalStock) > 0) {
                                btnClass = 'btn-success text-white';
                                isClickable = true;
                            } else {
                                btnClass = 'btn-danger text-white';
                            }
                        } else {
                            // If not found in summary, assume stock 0 -> Red
                            btnClass = 'btn-danger text-white';
                        }
                    } else {
                        // Summary loaded (empty array) -> All Red since product is selected but has no stock
                        btnClass = 'btn-danger text-white';
                    }
                }

                return (
                    <button
                        key={depot}
                        className={`btn ${btnClass} w-100 py-1 fw-bold`}
                        onClick={() => isClickable && onDepotClick(depot)}
                        style={{ fontSize: '0.9rem', opacity: (selectedProduct && !isClickable && btnClass.includes('danger')) ? 0.9 : 1 }}
                        disabled={selectedProduct && !isClickable}
                    >
                        {depot}
                    </button>
                );
            })}
        </div>
    );
};

export default DepotButtons;
