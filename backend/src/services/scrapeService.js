/**
 * Scrape orchestration service.
 * Coordinates the scraping process: fetch products, scrape, validate, save.
 */

import { scrapeProduct, scrapeAllProducts } from '../scraper/priceScraper.js';
import {
  getActiveTrackedProducts,
  getTrackedProductById,
  saveScrapedPrice,
  saveScrapeLogs,
} from './trackedProducts.js';
import { sendPriceDropAlert, sendBackInStockAlert } from './emailService.js';

/**
 * Scrape a single product by tracked product ID.
 */
export async function scrapeOneProduct(trackedProductId, options = {}) {
  const product = await getTrackedProductById(trackedProductId);
  if (!product) {
    throw new Error('Tracked product not found');
  }

  console.log(`[ScrapeService] Starting scrape for: ${product.name}`);
  const result = await scrapeProduct(product, options);

  // Save logs regardless of outcome
  if (result.logs && result.logs.length > 0) {
    await saveScrapeLogs(result.logs).catch(err => {
      console.error('[ScrapeService] Failed to save logs:', err.message);
    });
  }

  // Only save price/stock data on success
  if (result.success && result.data) {
    await saveScrapedPrice(product.id, result.data);
    console.log(`[ScrapeService] Saved price for ${product.name}: ${result.data.price} ${result.data.currency}`);

    // Check for alerts
    const oldPrice = product.latest_price;
    const newPrice = result.data.price;
    const oldStock = product.latest_stock_status;
    const newStock = result.data.stockStatus;
    const currency = result.data.currency || 'INR';

    if (oldPrice && newPrice && newPrice < oldPrice) {
      await sendPriceDropAlert(product, oldPrice, newPrice, currency);
    }
    
    if (oldStock === 'OUT_OF_STOCK' && newStock === 'IN_STOCK') {
      await sendBackInStockAlert(product, newPrice, currency);
    }
  } else {
    console.log(`[ScrapeService] Scrape failed for ${product.name}: ${result.error}`);
  }

  return {
    productId: product.id,
    productName: product.name,
    success: result.success,
    data: result.data || null,
    error: result.error || null,
    attempts: result.logs?.filter(l => l.status !== 'RETRY').length || 0,
  };
}

let isCronScraping = false;

/**
 * Scrape all active tracked products (for cron jobs).
 */
export async function scrapeAllActiveProducts() {
  if (isCronScraping) {
    console.log('[ScrapeService] A scrape is already running in the background. Skipping this cron trigger to prevent memory crash.');
    return { total: 0, succeeded: 0, failed: 0, results: [], message: 'Already running' };
  }

  const products = await getActiveTrackedProducts();
  if (products.length === 0) {
    console.log('[ScrapeService] No active tracked products to scrape');
    return { total: 0, succeeded: 0, failed: 0, results: [] };
  }

  isCronScraping = true;
  try {
    console.log(`[ScrapeService] Starting cron scrape for ${products.length} products`);
    const results = await scrapeAllProducts(products);

  // Save results to database
  const summary = {
    total: products.length,
    succeeded: 0,
    failed: 0,
    results: [],
  };

  for (const result of results) {
    // Save logs
    if (result.logs && result.logs.length > 0) {
      await saveScrapeLogs(result.logs).catch(err => {
        console.error('[ScrapeService] Failed to save logs:', err.message);
      });
    }

    // Save price data only on success
    if (result.success && result.data) {
      await saveScrapedPrice(result.productId, result.data).catch(err => {
        console.error('[ScrapeService] Failed to save price:', err.message);
      });
      
      // Check for alerts
      const product = products.find(p => p.id === result.productId);
      if (product) {
        const oldPrice = product.latest_price;
        const newPrice = result.data.price;
        const oldStock = product.latest_stock_status;
        const newStock = result.data.stockStatus;
        const currency = result.data.currency || 'INR';

        if (oldPrice && newPrice && newPrice < oldPrice) {
          await sendPriceDropAlert(product, oldPrice, newPrice, currency);
        }
        
        if (oldStock === 'OUT_OF_STOCK' && newStock === 'IN_STOCK') {
          await sendBackInStockAlert(product, newPrice, currency);
        }
      }

      summary.succeeded++;
    } else {
      summary.failed++;
    }

    summary.results.push({
      productId: result.productId,
      success: result.success,
      error: result.error || null,
    });
  }

  console.log(`[ScrapeService] Cron scrape complete: ${summary.succeeded}/${summary.total} succeeded`);
  return summary;
  } finally {
    isCronScraping = false;
  }
}
