function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

const statusConfig = {
  SUCCESS: { label: 'Success', icon: '✓', className: 'status-success' },
  RETRY: { label: 'Retry', icon: '↻', className: 'status-retry' },
  FAILED: { label: 'Failed', icon: '✗', className: 'status-failed' },
  TIMEOUT: { label: 'Timeout', icon: '⏱', className: 'status-timeout' },
  PARSE_ERROR: { label: 'Parse Error', icon: '⚠', className: 'status-parse_error' },
  INVALID_DATA: { label: 'Invalid Data', icon: '⚠', className: 'status-invalid_data' },
};

export default function ScrapeLogTable({ logs }) {
  if (!logs || logs.length === 0) {
    return (
      <div className="card">
        <h3 className="chart-title">Scrape Log</h3>
        <div className="empty-state">
          <p>No scrape attempts yet.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card" style={{ overflow: 'auto' }}>
      <h3 className="chart-title">Scrape Log</h3>
      <table className="data-table">
        <thead>
          <tr>
            <th>Timestamp</th>
            <th>Attempt</th>
            <th>Status</th>
            <th>Response Time</th>
            <th>Error / Message</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((log) => {
            const cfg = statusConfig[log.status] || statusConfig.FAILED;
            return (
              <tr key={log.id}>
                <td style={{ whiteSpace: 'nowrap' }}>{formatDate(log.created_at)}</td>
                <td>#{log.attempt_number}</td>
                <td>
                  <span className={`status-badge ${cfg.className}`}>
                    {cfg.icon} {cfg.label}
                  </span>
                </td>
                <td>
                  {log.response_time_ms != null
                    ? `${(log.response_time_ms / 1000).toFixed(1)}s`
                    : '—'}
                </td>
                <td style={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {log.error_message || (log.status === 'SUCCESS' ? 'Price scraped successfully' : '—')}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
