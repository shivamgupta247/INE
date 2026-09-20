/**
 * Cron controller — handles scheduled scraping.
 */

import config from '../config/index.js';
import { scrapeAllActiveProducts } from '../services/scrapeService.js';

export async function cronScrape(req, res) {
  // Verify cron secret
  const secret = req.headers['x-cron-secret'] || req.query.secret;
  if (secret !== config.cronSecret) {
    console.warn('[CronController] Unauthorized cron attempt');
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    console.log('[CronController] Starting scheduled scrape...');
    const result = await scrapeAllActiveProducts();
    
    res.json({
      message: 'Cron scrape completed',
      total: result.total,
      succeeded: result.succeeded,
      failed: result.failed,
    });
  } catch (err) {
    console.error('[CronController] Cron scrape error:', err.message);
    res.status(500).json({ error: 'Cron scrape failed', message: err.message });
  }
}
