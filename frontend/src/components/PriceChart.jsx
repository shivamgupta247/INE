import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Area, AreaChart,
} from 'recharts';

function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatPrice(val) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(val);
}

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const data = payload[0].payload;
  return (
    <div style={{
      background: '#1a1f36',
      border: '1px solid rgba(148, 163, 184, 0.2)',
      borderRadius: '8px',
      padding: '12px 16px',
      fontSize: '0.85rem',
    }}>
      <div style={{ color: '#94a3b8', marginBottom: 4 }}>{formatDate(data.scraped_at)}</div>
      <div style={{ color: '#34d399', fontWeight: 700, fontSize: '1.1rem' }}>
        {formatPrice(data.price)}
      </div>
      {data.mrp && (
        <div style={{ color: '#64748b', textDecoration: 'line-through', fontSize: '0.8rem' }}>
          MRP: {formatPrice(data.mrp)}
        </div>
      )}
      <div style={{
        color: data.stock_status === 'IN_STOCK' ? '#34d399' : '#f87171',
        marginTop: 4,
        fontSize: '0.8rem',
      }}>
        {data.stock_status === 'IN_STOCK'
          ? `In Stock${data.stock_quantity != null ? ` (${data.stock_quantity} units)` : ''}`
          : 'Out of Stock'}
      </div>
    </div>
  );
}

export default function PriceChart({ history }) {
  if (!history || history.length === 0) {
    return (
      <div className="chart-container">
        <h3 className="chart-title">Price History</h3>
        <div className="empty-state">
          <p>No price history yet. Scrape the product to start tracking prices.</p>
        </div>
      </div>
    );
  }

  const chartData = [...history].reverse().map(h => ({
    ...h,
    price: Number(h.price),
    mrp: h.mrp ? Number(h.mrp) : null,
    label: formatDate(h.scraped_at),
  }));

  const minPrice = Math.min(...chartData.map(d => d.price)) * 0.95;
  const maxPrice = Math.max(...chartData.map(d => d.price)) * 1.05;

  return (
    <div className="chart-container">
      <h3 className="chart-title">Price History</h3>
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 20 }}>
          <defs>
            <linearGradient id="priceGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.08)" />
          <XAxis
            dataKey="label"
            tick={{ fill: '#64748b', fontSize: 11 }}
            axisLine={{ stroke: 'rgba(148, 163, 184, 0.1)' }}
            tickLine={false}
          />
          <YAxis
            domain={[minPrice, maxPrice]}
            tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`}
            tick={{ fill: '#64748b', fontSize: 11 }}
            axisLine={{ stroke: 'rgba(148, 163, 184, 0.1)' }}
            tickLine={false}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="price"
            stroke="#6366f1"
            strokeWidth={2}
            fill="url(#priceGrad)"
            dot={{ fill: '#6366f1', r: 4, strokeWidth: 0 }}
            activeDot={{ r: 6, fill: '#818cf8', strokeWidth: 0 }}
          />
        </AreaChart>
      </ResponsiveContainer>

      {/* Supporting table */}
      <div style={{ maxHeight: 300, overflow: 'auto', marginTop: 16 }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Time</th>
              <th>Price</th>
              <th>MRP</th>
              <th>Stock</th>
              <th>Quantity</th>
            </tr>
          </thead>
          <tbody>
            {history.map((h) => (
              <tr key={h.id}>
                <td>{formatDate(h.scraped_at)}</td>
                <td style={{ color: '#34d399', fontWeight: 600 }}>{formatPrice(h.price)}</td>
                <td style={{ color: '#64748b' }}>{h.mrp ? formatPrice(h.mrp) : '—'}</td>
                <td>
                  <span className={`stock-badge ${h.stock_status === 'IN_STOCK' ? 'stock-in' : 'stock-out'}`}>
                    {h.stock_status === 'IN_STOCK' ? 'In Stock' : 'Out of Stock'}
                  </span>
                </td>
                <td>{h.stock_quantity ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
