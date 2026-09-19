/**
 * Tracked products controller.
 */

import {
  getTrackedProducts,
  getTrackedProductById,
  trackProduct,
  getProductHistory,
  getProductLogs,
  untrackProduct,
} from '../services/trackedProducts.js';
import { scrapeOneProduct } from '../services/scrapeService.js';

export async function listTrackedProducts(req, res) {
  try {
    const products = await getTrackedProducts();
    res.json({ count: products.length, products });
  } catch (err) {
    console.error('[TrackedController] List error:', err.message);
    res.status(500).json({ error: 'Failed to fetch tracked products', message: err.message });
  }
}

export async function getTrackedProduct(req, res) {
  try {
    const product = await getTrackedProductById(req.params.id);
    if (!product) {
      return res.status(404).json({ error: 'Tracked product not found' });
    }
    res.json({ product, ...product });
  } catch (err) {
    if (err.code === 'PGRST116') {
      return res.status(404).json({ error: 'Tracked product not found' });
    }
    console.error('[TrackedController] Get error:', err.message);
    res.status(500).json({ error: 'Failed to fetch tracked product', message: err.message });
  }
}

export async function trackNewProduct(req, res) {
  try {
    const { store_product_id, sku, name, slug, brand, category } = req.body;

    if (!store_product_id || !sku || !name) {
      return res.status(400).json({
        error: 'Missing required fields: store_product_id, sku, name',
      });
    }

    const result = await trackProduct({
      store_product_id,
      sku,
      name,
      slug,
      brand,
      category,
    });

    if (result.alreadyTracked) {
      return res.status(200).json({
        message: 'Product is already being tracked',
        product: result.product,
        alreadyTracked: true,
      });
    }

    res.status(201).json({
      message: 'Product is now being tracked',
      product: result.product,
      alreadyTracked: false,
    });
  } catch (err) {
    console.error('[TrackedController] Track error:', err.message);
    res.status(500).json({ error: 'Failed to track product', message: err.message });
  }
}

export async function getHistory(req, res) {
  try {
    const history = await getProductHistory(req.params.id);
    res.json({ count: history.length, history });
  } catch (err) {
    console.error('[TrackedController] History error:', err.message);
    res.status(500).json({ error: 'Failed to fetch history', message: err.message });
  }
}

export async function getLogs(req, res) {
  try {
    const logs = await getProductLogs(req.params.id);
    res.json({ count: logs.length, logs });
  } catch (err) {
    console.error('[TrackedController] Logs error:', err.message);
    res.status(500).json({ error: 'Failed to fetch logs', message: err.message });
  }
}

export async function manualScrape(req, res) {
  try {
    const result = await scrapeOneProduct(req.params.id);
    res.json(result);
  } catch (err) {
    if (err.message === 'Tracked product not found') {
      return res.status(404).json({ error: err.message });
    }
    console.error('[TrackedController] Scrape error:', err.message);
    res.status(500).json({ error: 'Scrape failed', message: err.message });
  }
}

export async function removeTrackedProduct(req, res) {
  try {
    const product = await untrackProduct(req.params.id);
    res.json({ message: 'Product untracked', product });
  } catch (err) {
    console.error('[TrackedController] Untrack error:', err.message);
    res.status(500).json({ error: 'Failed to untrack product', message: err.message });
  }
}
