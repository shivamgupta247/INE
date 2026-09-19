/**
 * Tracked products routes.
 */

import { Router } from 'express';
import {
  listTrackedProducts,
  getTrackedProduct,
  trackNewProduct,
  getHistory,
  getLogs,
  manualScrape,
  removeTrackedProduct,
} from '../controllers/trackedController.js';

const router = Router();

// GET /api/tracked-products
router.get('/', listTrackedProducts);

// POST /api/products/track
router.post('/track', trackNewProduct);

// GET /api/tracked-products/:id
router.get('/:id', getTrackedProduct);

// GET /api/tracked-products/:id/history
router.get('/:id/history', getHistory);

// GET /api/tracked-products/:id/logs
router.get('/:id/logs', getLogs);

// POST /api/tracked-products/:id/scrape
router.post('/:id/scrape', manualScrape);

// DELETE /api/tracked-products/:id
router.delete('/:id', removeTrackedProduct);

export default router;
