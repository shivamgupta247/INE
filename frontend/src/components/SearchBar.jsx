import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { searchProducts, trackProduct } from '../services/api';

export default function SearchBar({ onProductTracked }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showResults, setShowResults] = useState(false);
  const [tracking, setTracking] = useState(null);
  const containerRef = useRef(null);
  const debounceRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setShowResults(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced search
  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      setShowResults(false);
      return;
    }

    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await searchProducts(query.trim());
        setResults(data.results || []);
        setShowResults(true);
      } catch (err) {
        setError(err.message);
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 400);

    return () => clearTimeout(debounceRef.current);
  }, [query]);

  async function handleTrack(product) {
    setTracking(product.id);
    try {
      const response = await trackProduct(product);
      setShowResults(false);
      setQuery('');
      setResults([]);
      onProductTracked?.();
      
      // Redirect to the newly tracked product's detail page
      if (response && response.product && response.product.id) {
        navigate(`/product/${response.product.id}`);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setTracking(null);
    }
  }

  return (
    <div className="search-container" ref={containerRef}>
      <div className="search-input-wrapper">
        <span className="search-icon">🔍</span>
        <input
          id="product-search"
          type="text"
          className="search-input"
          placeholder="Search INE store products by name, brand, or SKU..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setShowResults(true)}
          autoComplete="off"
        />
      </div>

      {showResults && (
        <div className="search-results">
          {loading && (
            <div className="search-status">
              <span className="spinner" /> Searching the INE store...
            </div>
          )}

          {error && (
            <div className="search-status" style={{ color: 'var(--accent-danger)' }}>
              {error}
            </div>
          )}

          {!loading && !error && results.length === 0 && query.length >= 2 && (
            <div className="search-status">
              No products found for "{query}"
            </div>
          )}

          {!loading && results.map((product) => (
            <div key={product.id} className="search-result-item">
              <div className="search-result-info">
                <div className="search-result-name">{product.name}</div>
                <div className="search-result-detail">
                  {product.brand} · {product.category} · SKU: {product.sku}
                </div>
              </div>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => handleTrack(product)}
                disabled={tracking === product.id}
              >
                {tracking === product.id ? (
                  <><span className="spinner" /> Tracking...</>
                ) : (
                  'Track'
                )}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
