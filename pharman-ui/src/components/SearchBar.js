import React, { useState } from 'react';

const SearchBar = ({ onSearch }) => {
    const [critere, setCritere] = useState('Code Produit');
    const [valeur, setValeur] = useState('');

    const handleSearch = () => {
        onSearch(critere, (valeur || '').trim());
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') handleSearch();
    };

    return (
        <div className="search-card">
            <div className="row align-items-end">
                <div className="col-md-3">
                    <label className="search-label">Critère</label>
                    <select
                        className="form-select"
                        value={critere}
                        onChange={(e) => setCritere(e.target.value)}
                    >
                        <option value="Code Produit">Code Produit</option>
                        <option value="Libellé Produit">Libellé Produit</option>
                        <option value="Code Besoin">Code Besoin</option>
                        <option value="Libellé Besoin">Libellé Besoin</option>
                    </select>
                </div>
                <div className="col-md-6">
                    <label className="search-label">Valeur</label>
                    <input
                        type="text"
                        className="form-control"
                        value={valeur}
                        onChange={(e) => setValeur(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Ex: 302452 ou BISOPRAL"
                    />
                </div>
                <div className="col-md-3">
                    <label className="search-label" style={{ visibility: 'hidden' }}>3</label>
                    <button className="btn btn-search w-100" onClick={handleSearch}>
                        Rechercher
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SearchBar;