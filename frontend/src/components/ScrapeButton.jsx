import { useState } from 'react';
import { scrapeProduct } from '../services/api';

export default function ScrapeButton({ productId, onComplete }) {
  const [status, setStatus] = useState('idle'); // idle, scraping, success, failed
  const [result, setResult] = useState(null);

  async function handleScrape() {
    setStatus('scraping');
    setResult(null);

    try {
      const data = await scrapeProduct(productId);
      if (data.success) {
        setStatus('success');
        setResult(data);
      } else {
        setStatus('failed');
        setResult(data);
      }
      onComplete?.();
    } catch (err) {
      setStatus('failed');
      setResult({ error: err.message });
    }

    // Reset status after delay
    setTimeout(() => setStatus('idle'), 8000);
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <button
        className="btn btn-primary"
        onClick={handleScrape}
        disabled={status === 'scraping'}
        id="scrape-now-button"
      >
        {status === 'scraping' ? (
          <><span className="spinner" /> Scraping...</>
        ) : (
          '⟳ Scrape Now'
        )}
      </button>

      {status === 'scraping' && (
        <span className="scrape-status scraping">
          <span className="spinner" /> Fetching current price from INE store...
        </span>
      )}

      {status === 'success' && (
        <span className="scrape-status success">
          ✓ Scraped successfully
          {result?.data && ` — ₹${result.data.price}`}
          {result?.attempts && ` (${result.attempts} attempt${result.attempts > 1 ? 's' : ''})`}
        </span>
      )}

      {status === 'failed' && (
        <span className="scrape-status failed">
          ✗ Scrape failed
          {result?.error && ` — ${result.error}`}
        </span>
      )}
    </div>
  );
}
