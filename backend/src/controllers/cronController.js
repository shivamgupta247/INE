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
    console.log('[CronController] Triggering scheduled scrape in background...');
    
    // We do NOT await this. Scraping 10 products takes 1-2 minutes.
    // Cron-job.org times out after 30 seconds. So we trigger it in the background
    // and respond immediately to keep the cron job "Green/Successful".
    scrapeAllActiveProducts().then(result => {
      console.log(`[CronController] Background scrape complete: ${result.succeeded}/${result.total} succeeded.`);
    }).catch(err => {
      console.error('[CronController] Background scrape error:', err.message);
    });
    
    res.json({
      message: 'Cron scrape triggered successfully in the background'
    });
  } catch (err) {
    const safeError = err.message ? err.message.substring(0, 200) : 'Unknown error';
    res.status(500).json({ error: 'Failed to trigger cron', message: safeError });
  }
}
