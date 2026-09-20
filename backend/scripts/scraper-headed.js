import dotenv from 'dotenv';
dotenv.config();

import { chromium } from 'playwright';
import { scrapeProduct } from '../src/scraper/priceScraper.js';
import { getActiveTrackedProducts } from '../src/services/trackedProducts.js';

/**
 * Main entry point for Headed Scraper Mode.
 * This script launches a visible browser to demonstrate the scraping process.
 */
async function main() {
  console.log('Starting Headed Scraper Mode...');

  // Step 1: Fetch all products that the user is tracking in the database
  const products = await getActiveTrackedProducts();
  if (products.length === 0) {
    console.log('No products found in database. Please track a product first.');
    return;
  }

  // Step 2: Launch Chromium browser in 'headed' mode so it's visible on screen
  const browser = await chromium.launch({
    headless: false, // Visible UI
    slowMo: 100,     // Slow down actions so the interviewer can see them clearly
  });

  // Step 3: Loop through each product and scrape its latest price
  for (const product of products) {
    console.log(`\nScraping: ${product.name}`);

    // Call the core scraping logic (handles hover, cookie banner, and retry)
    const result = await scrapeProduct(product, { browser, headless: false });

    // Step 4: Display the results in the terminal
    if (result.success) {
      console.log(`✅ Success! Found Price: ${result.data.currency} ${result.data.price}`);
    } else {
      console.log(`❌ Failed: ${result.error}`);
    }

    // Wait a few seconds between products so the demo looks smooth
    await new Promise(resolve => setTimeout(resolve, 3000));
  }

  console.log('\nDemo complete. Closing browser...');
  await browser.close();
}

main().catch(err => {
  console.error('Error running scraper:', err);
});
