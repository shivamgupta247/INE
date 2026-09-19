/**
 * Cron routes — protected by secret.
 */

import { Router } from 'express';
import { cronScrape } from '../controllers/cronController.js';

const router = Router();

// POST /api/cron/scrape
router.post('/scrape', cronScrape);

export default router;
