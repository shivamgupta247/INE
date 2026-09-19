import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  getTrackedProduct,
  getProductHistory,
  getProductLogs,
  deleteTrackedProduct,
} from '../services/api';
import ScrapeButton from '../components/ScrapeButton';
import PriceChart from '../components/PriceChart';
import ScrapeLogTable from '../components/ScrapeLogTable';

function formatPrice(price, currency = 'INR') {
  if (price === null || price === undefined) return '—';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(price);
}

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [product, setProduct] = useState(null);
  const [history, setHistory] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deleting, setDeleting] = useState(false);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const [prodRes, histRes, logsRes] = await Promise.all([
        getTrackedProduct(id),
        getProductHistory(id),
        getProductLogs(id),
      ]);
      setProduct(prodRes.product || prodRes);
      setHistory(histRes.history || []);
      setLogs(logsRes.logs || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [id]);

  async function handleDelete() {
    if (!window.confirm('Are you sure you want to stop tracking this product?')) {
      return;
    }
    setDeleting(true);
    try {
      await deleteTrackedProduct(id);
      navigate('/');
    } catch (err) {
      alert(`Failed to delete: ${err.message}`);
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div style={{ padding: '40px 0', textAlign: 'center' }}>
        <span className="spinner" /> Loading product details...
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="card" style={{ maxWidth: 600, margin: '40px auto', textAlign: 'center' }}>
        <h3 style={{ color: 'var(--accent-danger)', marginBottom: 12 }}>Product Not Found</h3>
        <p style={{ color: 'var(--text-secondary)', marginBottom: 20 }}>
          {error || 'Unable to find the requested product.'}
        </p>
        <Link to="/" className="btn btn-secondary">← Back to Dashboard</Link>
      </div>
    );
  }

  const latestScrape = history.length > 0 ? history[0] : null;
  const currentPrice = latestScrape ? latestScrape.price : product.latest_price;
  const currentMrp = latestScrape ? latestScrape.mrp : product.latest_mrp;
  const stockStatus = latestScrape ? latestScrape.stock_status : product.latest_stock_status;
  const stockQuantity = latestScrape ? latestScrape.stock_quantity : product.latest_stock_quantity;

  const discountPercent = currentMrp && currentPrice && currentMrp > currentPrice
    ? Math.round(((currentMrp - currentPrice) / currentMrp) * 100)
    : null;

  return (
    <div className="detail-container" style={{ maxWidth: 1280, margin: '0 auto', padding: '24px 0' }}>
      <div style={{ marginBottom: 20 }}>
        <Link to="/" style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          ← Back to Dashboard
        </Link>
      </div>

      <div className="detail-header">
        <div>
          <h1 className="detail-title">{product.name}</h1>
          <div className="detail-meta">
            <span className="badge badge-category">{product.category}</span>
            <span className="badge badge-sku">SKU: {product.sku}</span>
            {product.brand && <span className="badge">{product.brand}</span>}
            <span className="badge" style={{ background: 'rgba(52, 211, 153, 0.1)', color: 'var(--accent-success)' }}>
              ● Active Tracking
            </span>
          </div>
        </div>

        <div className="detail-actions">
          <ScrapeButton productId={id} onComplete={loadData} />
          <button
            className="btn btn-danger btn-sm"
            onClick={handleDelete}
            disabled={deleting}
          >
            {deleting ? 'Removing...' : 'Untrack'}
          </button>
        </div>
      </div>

      <div className="detail-grid">
        <div className="detail-price-card">
          <div className="detail-price-label">Current Live Price</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
            <span className="detail-price-value">{formatPrice(currentPrice)}</span>
            {currentMrp && currentMrp > currentPrice && (
              <span style={{ textDecoration: 'line-through', color: 'var(--text-muted)', fontSize: '1.2rem' }}>
                {formatPrice(currentMrp)}
              </span>
            )}
            {discountPercent && (
              <span style={{ background: 'rgba(52, 211, 153, 0.15)', color: 'var(--accent-success)', padding: '2px 8px', borderRadius: 4, fontWeight: 600, fontSize: '0.85rem' }}>
                {discountPercent}% OFF
              </span>
            )}
          </div>
        </div>

        <div className="detail-price-card">
          <div className="detail-price-label">Stock Status</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 6 }}>
            <span
              className={`stock-badge ${stockStatus === 'IN_STOCK' ? 'stock-in' : stockStatus === 'OUT_OF_STOCK' ? 'stock-out' : 'stock-unknown'}`}
              style={{ fontSize: '1rem', padding: '6px 14px' }}
            >
              {stockStatus === 'IN_STOCK' ? 'In Stock' : stockStatus === 'OUT_OF_STOCK' ? 'Out of Stock' : 'Not Scraped Yet'}
            </span>
            {stockQuantity != null && (
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
                ({stockQuantity} available)
              </span>
            )}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
        <PriceChart history={history} />
        <ScrapeLogTable logs={logs} />
      </div>
    </div>
  );
}
