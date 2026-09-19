import { useState, useEffect } from 'react';
import { getTrackedProducts } from '../services/api';
import SearchBar from '../components/SearchBar';
import ProductCard from '../components/ProductCard';

export default function Dashboard() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sortBy, setSortBy] = useState('recent');

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

  const sortedProducts = [...products].sort((a, b) => {
    if (sortBy === 'discount') {
      const getDiscount = (p) => (p.latest_mrp && p.latest_price && p.latest_mrp > p.latest_price) ? ((p.latest_mrp - p.latest_price) / p.latest_mrp) : 0;
      return getDiscount(b) - getDiscount(a);
    }
    if (sortBy === 'price_asc') {
      return (a.latest_price || 999999) - (b.latest_price || 999999);
    }
    // Default: recent updates
    return new Date(b.last_scraped_at || 0) - new Date(a.last_scraped_at || 0);
  });

  return (
    <div className="dashboard-container">
      <section className="hero-section">
        <h1 className="hero-title">Track Product Prices in Real-Time</h1>
        <div style={{ marginTop: '24px' }}>
          <SearchBar onProductTracked={fetchProducts} />
        </div>
      </section>

      <section className="tracked-section">
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
          <div className="products-section">
            <div className="sort-controls">
              <span className="sort-label">Sort by:</span>
              <select 
                className="sort-select" 
                value={sortBy} 
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="recent">Recently Updated</option>
                <option value="discount">Highest Discount</option>
                <option value="price_asc">Price: Low to High</option>
              </select>
            </div>
            <div className="products-grid">
              {sortedProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
