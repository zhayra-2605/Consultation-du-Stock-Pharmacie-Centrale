import React from 'react';

const BesoinInfo = ({ product, onBesoinClick }) => {
    if (!product) return null;

    return (
        <div className="card mb-4 bg-light">
            <div className="card-body">
                <div className="row">
                    <div className="col-md-12">
                        <p className="mb-1"><strong>Libellé Besoin :</strong> {product.LIBELLE_BESOIN}</p>
                        <p className="mb-1"><strong>Présentation :</strong> {product.PRESENTATION_T ?? product.PRESENTATION}</p>
                        <p className="mb-0">
                            <strong>Code Besoin :</strong>{' '}
                            <a
                                href="#"
                                onClick={(e) => { e.preventDefault(); onBesoinClick(product.CODE_BESOIN); }}
                                className="text-primary text-decoration-none fw-bold"
                            >
                                {product.CODE_BESOIN}
                            </a>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BesoinInfo;
