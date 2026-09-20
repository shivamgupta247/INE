import { useState, useEffect } from 'react';
import { scrapeProduct } from '../services/api';

export default function ScrapeButton({ productId, onComplete }) {
  const [status, setStatus] = useState('idle'); // idle, scraping, success, failed
  const [result, setResult] = useState(null);
  const [fakeLogs, setFakeLogs] = useState([]);

  useEffect(() => {
    if (status !== 'scraping') {
      setFakeLogs([]);
      return;
    }

    setFakeLogs([{ id: 1, text: 'Attempt 1: Bypassing anti-bot challenge...', state: 'running' }]);
    const timers = [];
    
    timers.push(setTimeout(() => {
      setFakeLogs(prev => [
        { ...prev[0], state: 'failed', text: 'Attempt 1 failed (Timeout)' },
        { id: 2, text: 'Attempt 2: Reloading page and solving challenge...', state: 'running' }
      ]);
    }, 22000));
    
    timers.push(setTimeout(() => {
      setFakeLogs(prev => [
        prev[0],
        { ...prev[1], state: 'failed', text: 'Attempt 2 failed (Store Error)' },
        { id: 3, text: 'Attempt 3: Extracting price from DOM...', state: 'running' }
      ]);
    }, 45000));

    return () => timers.forEach(clearTimeout);
  }, [status]);

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
    setTimeout(() => setStatus('idle'), 10000);
  }

  return (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 12 }}>
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

      {/* Live Fake Logs Popover */}
      {status === 'scraping' && fakeLogs.length > 0 && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 10px)',
          right: 0,
          background: 'var(--bg-card)',
          border: '1px solid var(--border-medium)',
          borderRadius: 'var(--radius-md)',
          padding: '12px',
          boxShadow: 'var(--shadow-lg)',
          width: '320px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          zIndex: 50
        }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '4px', fontWeight: 600, textTransform: 'uppercase' }}>
            Live Scrape Progress
          </div>
          {fakeLogs.map(log => (
            <div key={log.id} style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              fontSize: '0.85rem',
              color: log.state === 'running' ? 'var(--accent-info)' : 'var(--accent-danger)',
              background: log.state === 'running' ? 'rgba(14, 165, 233, 0.1)' : 'rgba(239, 68, 68, 0.1)',
              padding: '8px 12px',
              borderRadius: '6px',
              border: log.state === 'running' ? '1px solid rgba(14, 165, 233, 0.2)' : '1px solid rgba(239, 68, 68, 0.2)'
            }}>
              {log.state === 'running' ? <span className="spinner" style={{ width: 12, height: 12, borderWidth: 2 }} /> : '✗'}
              <span>{log.text}</span>
            </div>
          ))}
        </div>
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
