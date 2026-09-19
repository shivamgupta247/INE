/**
 * Product search controller.
 */

import { searchProducts } from '../services/productSearch.js';

export async function searchProductsHandler(req, res) {
  try {
    const query = req.query.q;
    if (!query || query.trim().length === 0) {
      return res.status(400).json({ error: 'Query parameter "q" is required' });
    }

    if (query.trim().length < 2) {
      return res.status(400).json({ error: 'Query must be at least 2 characters' });
    }

    const results = await searchProducts(query.trim(), 20);
    res.json({ query: query.trim(), count: results.length, results });
  } catch (err) {
    console.error('[SearchController] Error:', err.message);
    res.status(500).json({ error: 'Failed to search products', message: err.message });
  }
}
