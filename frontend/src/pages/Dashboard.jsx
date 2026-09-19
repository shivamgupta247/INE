import { useState, useEffect } from 'react';
import { getTrackedProducts } from '../services/api';
import SearchBar from '../components/SearchBar';
import ProductCard from '../components/ProductCard';

export default function Dashboard() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  async function fetchProducts() {
    setLoading(true);
    setError(null);
    try {
      const data = await getTrackedProducts();
      setProducts(data.products || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchProducts();
  }, []);

  return (
    <div className="dashboard-container">
      <section className="hero-section">
        <h1 className="hero-title">Track Product Prices in Real-Time</h1>
        <p className="hero-subtitle">
          Search the INE mock store, track products, and monitor live price & stock fluctuations with automated anti-bot challenge bypass.
        </p>
        <SearchBar onProductTracked={fetchProducts} />
      </section>

      <section className="tracked-section">
        <div className="section-header">
          <div>
            <h2 className="section-title">Tracked Products</h2>
            <span className="section-count">
              {products.length} {products.length === 1 ? 'product' : 'products'} currently tracked
            </span>
          </div>
          <button
            className="btn btn-secondary btn-sm"
            onClick={fetchProducts}
            disabled={loading}
          >
            {loading ? 'Refreshing...' : '↻ Refresh'}
          </button>
        </div>

        {loading && (
          <div className="status-loading">
            <span className="spinner" /> Loading tracked products...
          </div>
        )}

        {error && (
          <div className="alert-error">
            <p><strong>Failed to load products:</strong> {error}</p>
            <button className="btn btn-secondary btn-sm" onClick={fetchProducts}>Try Again</button>
          </div>
        )}

        {!loading && !error && products.length === 0 && (
          <div className="empty-state-card">
            <div className="empty-icon">📦</div>
            <h3>No products tracked yet</h3>
            <p>Use the search bar above to search for products in the INE store and start tracking them.</p>
          </div>
        )}

        {!loading && !error && products.length > 0 && (
          <div className="products-grid">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
