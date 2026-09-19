/**
 * Headed scraper mode — runs the scraper with a visible browser window.
 * Usage: npm run scraper:headed
 * 
 * This opens a real Chromium window and performs the actual scrape,
 * showing how the scraper handles the INE mock store's challenges:
 * - Cookie consent overlay
 * - Price reveal interaction
 * - Retry behavior on failures
 * - Slow/delayed responses
 */

import dotenv from 'dotenv';
dotenv.config();

import { chromium } from 'playwright';
import config from '../src/config/index.js';
import { scrapeProduct } from '../src/scraper/priceScraper.js';
import { getActiveTrackedProducts, saveScrapedPrice, saveScrapeLogs } from '../src/services/trackedProducts.js';

const BASE_URL = config.scraper.baseUrl;

async function main() {
  console.log('╔══════════════════════════════════════════╗');
  console.log('║   INE Price Tracker — Headed Scraper     ║');
  console.log('╚══════════════════════════════════════════╝');
  console.log('');

  // Get tracked products
  let products;
  try {
    products = await getActiveTrackedProducts();
  } catch (err) {
    console.log('Could not fetch tracked products from DB:', err.message);
    console.log('Running demo mode with a sample product...\n');
    products = [{
      id: 'demo',
      store_product_id: 687,
      name: 'Nordkraft Cable Kit S',
      sku: 'NOR-10687',
    }];
  }

  if (products.length === 0) {
    console.log('No tracked products found. Track a product first or running in demo mode.');
    products = [{
      id: 'demo',
      store_product_id: 5,
      name: 'Ironwood Microphone Pro',
      sku: 'IRO-10005',
    }];
  }

  console.log(`Found ${products.length} product(s) to scrape:\n`);
  products.forEach((p, i) => {
    console.log(`  ${i + 1}. ${p.name} (SKU: ${p.sku})`);
  });
  console.log('');

  // Launch browser in headed mode
  const browser = await chromium.launch({
    headless: false,
    slowMo: 100, // Slow down for visibility
    args: ['--window-size=1400,900'],
  });

  for (const product of products) {
    console.log(`\n${'─'.repeat(50)}`);
    console.log(`Scraping: ${product.name}`);
    console.log(`${'─'.repeat(50)}`);

    const result = await scrapeProduct(product, {
      browser,
      headless: false,
    });

    // Display results
    if (result.success) {
      console.log(`\n✅ SUCCESS`);
      console.log(`   Price:    ${result.data.currency} ${result.data.price}`);
      console.log(`   MRP:      ${result.data.currency} ${result.data.mrp || 'N/A'}`);
      console.log(`   Stock:    ${result.data.stockStatus} (${result.data.stockQuantity ?? 'unknown'} units)`);
    } else {
      console.log(`\n❌ FAILED: ${result.error}`);
    }

    // Show scrape logs
    console.log(`\n   Scrape log:`);
    for (const log of result.logs) {
      const icon = log.status === 'SUCCESS' ? '✓' :
                   log.status === 'RETRY' ? '↻' : '✗';
      console.log(`   ${icon} Attempt ${log.attempt_number}: ${log.status}` +
        (log.response_time_ms ? ` (${log.response_time_ms}ms)` : '') +
        (log.error_message ? ` — ${log.error_message}` : ''));
    }

    // Save to DB if not demo mode
    if (product.id !== 'demo') {
      try {
        if (result.logs.length > 0) await saveScrapeLogs(result.logs);
        if (result.success && result.data) await saveScrapedPrice(product.id, result.data);
        console.log('\n   💾 Results saved to database');
      } catch (err) {
        console.log(`\n   ⚠ Could not save to DB: ${err.message}`);
      }
    }

    // Pause between products for demo visibility
    if (products.length > 1) {
      console.log('\n   Waiting 3s before next product...');
      await new Promise(r => setTimeout(r, 3000));
    }
  }

  console.log(`\n${'═'.repeat(50)}`);
  console.log('Headed scrape session complete.');
  console.log('The browser will remain open for 10 seconds for inspection.');
  console.log(`${'═'.repeat(50)}`);

  await new Promise(r => setTimeout(r, 10000));
  await browser.close();
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
