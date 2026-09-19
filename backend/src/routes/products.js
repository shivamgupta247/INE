/**
 * Product search routes.
 */

import { Router } from 'express';
import { searchProductsHandler } from '../controllers/searchController.js';

const router = Router();

// GET /api/products/search?q=query
router.get('/search', searchProductsHandler);

export default router;
