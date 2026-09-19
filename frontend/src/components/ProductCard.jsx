import { useNavigate } from 'react-router-dom';

function formatPrice(price, currency = 'INR') {
  if (price === null || price === undefined) return '—';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(price);
}

function formatDate(dateStr) {
  if (!dateStr) return 'Never';
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now - d;
  const diffMins = Math.floor(diffMs / 60000);
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

export default function ProductCard({ product }) {
  const navigate = useNavigate();

  const stockClass = product.latest_stock_status === 'IN_STOCK'
    ? 'stock-in'
    : product.latest_stock_status === 'OUT_OF_STOCK'
      ? 'stock-out'
      : 'stock-unknown';

  const stockLabel = product.latest_stock_status === 'IN_STOCK'
    ? `In Stock${product.latest_stock_quantity != null ? ` (${product.latest_stock_quantity})` : ''}`
    : product.latest_stock_status === 'OUT_OF_STOCK'
      ? 'Out of Stock'
      : 'Not scraped yet';

  return (
    <article
      className="product-card"
      onClick={() => navigate(`/product/${product.id}`)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && navigate(`/product/${product.id}`)}
      id={`product-${product.id}`}
    >
      <div className="product-card-header">
        <h3 className="product-name">{product.name}</h3>
        {product.is_active && <span className="pulse-dot" title="Active tracking" />}
      </div>

      <div className="product-meta">
        <span className="badge badge-category">{product.category}</span>
        <span className="badge badge-sku">{product.sku}</span>
      </div>

      <div className="product-price-row">
        <span className="price-current">
          {formatPrice(product.latest_price, product.latest_currency)}
        </span>
        {product.latest_mrp && product.latest_mrp > product.latest_price && (
          <span className="price-mrp">
            {formatPrice(product.latest_mrp, product.latest_currency)}
          </span>
        )}
      </div>

      <span className={`stock-badge ${stockClass}`}>
        {stockLabel}
      </span>

      <div className="product-footer">
        <span className="last-scraped">
          Last scraped: {formatDate(product.last_scraped_at)}
        </span>
        <span className="btn btn-ghost btn-sm">View details →</span>
      </div>
    </article>
  );
}
