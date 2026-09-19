/**
 * Price scraper using Playwright.
 * 
 * The INE mock store protects prices behind a multi-step challenge:
 * 1. Navigate to product page
 * 2. Handle cookie consent overlay (appears ~75% of time)
 * 3. Hover over price area (minimum 8 mouse moves, 600ms dwell)
 * 4. Click "Reveal price" button
 * 5. Wait for challenge-response flow to complete (canvas fingerprint, WASM, proof-of-work)
 * 6. Extract price, stock, and metadata from the rendered DOM
 * 
 * Built-in unreliability: ~35% random failure rate, retries up to 6 times internally.
 * Our scraper adds its own retry layer on top.
 */

import { chromium } from 'playwright';
import config from '../config/index.js';
import { validateScrapedData, parsePrice, determineStockStatus } from '../validation/index.js';
import { v4 as uuidv4 } from 'uuid';

const BASE_URL = config.scraper.baseUrl;

/**
 * Scrape price and stock for a single product.
 * @param {object} product - tracked product record
 * @param {object} options - { headless, browser (reuse) }
 * @returns {{ success: boolean, data?: object, logs: Array, error?: string }}
 */
export async function scrapeProduct(product, options = {}) {
  const headless = options.headless ?? config.scraper.headless;
  const scrapeRunId = options.scrapeRunId || uuidv4();
  const maxRetries = config.scraper.maxRetries;
  const logs = [];
  let browser = options.browser || null;
  let ownBrowser = false;

  try {
    if (!browser) {
      browser = await chromium.launch({
        headless,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });
      ownBrowser = true;
    }

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      const startTime = Date.now();
      let context = null;
      let page = null;

      try {
        context = await browser.newContext({
          viewport: { width: 1280, height: 800 },
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        });
        page = await context.newPage();
        page.setDefaultTimeout(config.scraper.timeoutMs);

        const productUrl = `${BASE_URL}/product/${product.store_product_id}`;
        console.log(`[Scraper] Attempt ${attempt}/${maxRetries} for ${product.name} (${productUrl})`);

        // Navigate to product page
        await page.goto(productUrl, { waitUntil: 'networkidle', timeout: 30000 });

        // Verify we're on the correct product page
        const pageTitle = await page.locator('h1').first().textContent({ timeout: 10000 }).catch(() => null);
        if (!pageTitle || !pageTitle.toLowerCase().includes(product.name.toLowerCase().split(' ')[0])) {
          const responseTime = Date.now() - startTime;
          logs.push(createLog(product.id, scrapeRunId, attempt, 'INVALID_DATA', 'WRONG_PRODUCT',
            `Page title "${pageTitle}" doesn't match expected "${product.name}"`, responseTime));
          if (attempt < maxRetries) {
            logs.push(createLog(product.id, scrapeRunId, attempt, 'RETRY', 'WRONG_PRODUCT',
              'Retrying due to wrong product page', responseTime));
            await delay(2000 * attempt);
            continue;
          }
          return { success: false, logs, error: 'Wrong product page loaded' };
        }

        // Handle cookie consent overlay
        await handleCookieConsent(page);

        // Hover over price area to satisfy minimum interaction requirements
        await simulateHoverInteraction(page);

        // Click "Reveal price" button
        const revealButton = page.locator('button:has-text("Reveal price")');
        const isRevealVisible = await revealButton.isVisible({ timeout: 5000 }).catch(() => false);
        
        if (isRevealVisible) {
          await revealButton.click({ timeout: 10000 });
        }

        // Wait for price to load (the page has its own internal retry mechanism)
        // We wait for either success state or error state
        const priceResult = await waitForPriceResult(page, config.scraper.timeoutMs);
        const responseTime = Date.now() - startTime;

        if (priceResult.error) {
          // The page itself failed after its internal retries
          logs.push(createLog(product.id, scrapeRunId, attempt,
            priceResult.timeout ? 'TIMEOUT' : 'FAILED',
            priceResult.errorType || 'PRICE_LOAD_FAILED',
            priceResult.error, responseTime));

          if (attempt < maxRetries) {
            logs.push(createLog(product.id, scrapeRunId, attempt, 'RETRY',
              'PRICE_LOAD_FAILED', `Retrying after failed price load`, responseTime));
            await delay(2000 * attempt);
            continue;
          }
          return { success: false, logs, error: priceResult.error };
        }

        // Extract price and stock data from the DOM
        const extractedData = await extractPriceAndStock(page);

        if (!extractedData) {
          logs.push(createLog(product.id, scrapeRunId, attempt, 'PARSE_ERROR',
            'EXTRACTION_FAILED', 'Could not extract price/stock from DOM', responseTime));
          if (attempt < maxRetries) {
            await delay(2000 * attempt);
            continue;
          }
          return { success: false, logs, error: 'Price extraction failed' };
        }

        // Validate extracted data
        const validation = validateScrapedData(extractedData, product.name);
        if (!validation.valid) {
          logs.push(createLog(product.id, scrapeRunId, attempt, 'INVALID_DATA',
            'VALIDATION_FAILED', validation.errors.join('; '), responseTime,
            extractedData.price, extractedData.stockQuantity));
          if (attempt < maxRetries) {
            await delay(2000 * attempt);
            continue;
          }
          return { success: false, logs, error: `Validation failed: ${validation.errors.join('; ')}` };
        }

        // Success!
        logs.push(createLog(product.id, scrapeRunId, attempt, 'SUCCESS', null, null,
          responseTime, extractedData.price, extractedData.stockQuantity));

        return {
          success: true,
          data: extractedData,
          logs,
        };

      } catch (err) {
        const responseTime = Date.now() - startTime;
        const isTimeout = err.name === 'TimeoutError' || err.message?.includes('timeout');
        const status = isTimeout ? 'TIMEOUT' : 'FAILED';

        logs.push(createLog(product.id, scrapeRunId, attempt, status,
          err.name || 'UNKNOWN', err.message, responseTime));

        if (attempt < maxRetries) {
          logs.push(createLog(product.id, scrapeRunId, attempt, 'RETRY',
            'EXCEPTION', `Retrying after: ${err.message}`, responseTime));
          await delay(2000 * attempt); // Exponential backoff
          continue;
        }
        return { success: false, logs, error: err.message };
      } finally {
        if (page) await page.close().catch(() => {});
        if (context) await context.close().catch(() => {});
      }
    }

    return { success: false, logs, error: 'Max retries exhausted' };
  } finally {
    if (ownBrowser && browser) {
      await browser.close().catch(() => {});
    }
  }
}

/**
 * Scrape all active tracked products.
 */
export async function scrapeAllProducts(products, options = {}) {
  const headless = options.headless ?? config.scraper.headless;
  const results = [];
  let browser = null;

  try {
    browser = await chromium.launch({
      headless,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    const scrapeRunId = uuidv4();

    for (const product of products) {
      try {
        const result = await scrapeProduct(product, {
          browser,
          headless,
          scrapeRunId,
        });
        results.push({ productId: product.id, ...result });
      } catch (err) {
        console.error(`[Scraper] Fatal error for ${product.name}:`, err.message);
        results.push({
          productId: product.id,
          success: false,
          logs: [createLog(product.id, scrapeRunId, 1, 'FAILED', 'FATAL', err.message, 0)],
          error: err.message,
        });
      }
    }
  } finally {
    if (browser) await browser.close().catch(() => {});
  }

  return results;
}

/**
 * Handle cookie consent overlay if present.
 */
async function handleCookieConsent(page) {
  try {
    // Wait briefly for cookie overlay to appear (it shows up with 1500-5000ms delay)
    const acceptBtn = page.locator('.cookie-banner button:has-text("Accept")');
    const isVisible = await acceptBtn.isVisible({ timeout: 3000 }).catch(() => false);
    if (isVisible) {
      await acceptBtn.click();
      console.log('[Scraper] Dismissed cookie consent');
      await delay(300);
    }
  } catch {
    // No cookie banner — that's fine
  }
}

/**
 * Simulate hover interaction on the price area.
 * The store requires minimum 8 mouse moves and 600ms dwell time.
 */
async function simulateHoverInteraction(page) {
  try {
    const priceBlock = page.locator('.price-block').first();
    const isVisible = await priceBlock.isVisible({ timeout: 5000 }).catch(() => false);
    
    if (!isVisible) {
      // Price block might not be visible yet, try the idle state
      const idleBlock = page.locator('.price-idle').first();
      await idleBlock.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
    }

    // Get the bounding box of the price area
    const box = await priceBlock.boundingBox().catch(() => null);
    if (!box) return;

    // Generate natural-looking mouse movements (minimum 8 moves, 600ms dwell)
    const centerX = box.x + box.width / 2;
    const centerY = box.y + box.height / 2;

    // Move to the area first (triggers mouseenter)
    await page.mouse.move(centerX - 50, centerY - 20);
    await delay(80);

    // Generate 10+ mouse movements within the price area
    for (let i = 0; i < 12; i++) {
      const offsetX = (Math.random() - 0.5) * box.width * 0.6;
      const offsetY = (Math.random() - 0.5) * box.height * 0.6;
      await page.mouse.move(centerX + offsetX, centerY + offsetY);
      await delay(50 + Math.random() * 50);
    }

    // Dwell for sufficient time
    await delay(700);
  } catch (err) {
    console.log('[Scraper] Hover interaction issue:', err.message);
  }
}

/**
 * Wait for the price reveal result.
 * The page has three possible states after clicking reveal:
 * - .price-success — price loaded
 * - .price-error — all retries failed
 * - Still loading/retrying
 */
async function waitForPriceResult(page, timeout) {
  try {
    // Wait for either success or error state
    const result = await Promise.race([
      page.locator('.price-success').waitFor({ state: 'visible', timeout })
        .then(() => ({ success: true })).catch(e => ({ error: e.message, timeout: e.name === 'TimeoutError' })),
      page.locator('.price-error').waitFor({ state: 'visible', timeout })
        .then(() => ({ success: false })).catch(e => ({ error: e.message, timeout: e.name === 'TimeoutError' })),
      delay(timeout).then(() => ({ timeout: true })),
    ]);

    if (result.timeout) {
      return { error: 'Timed out waiting for price', timeout: true };
    }

    if (!result.success) {
      const errorMsg = await page.locator('.price-error .price-substatus')
        .textContent({ timeout: 3000 }).catch(() => 'Unknown error');
      return { error: `Store price load failed: ${errorMsg}`, errorType: 'STORE_RETRY_EXHAUSTED' };
    }

    return { success: true };
  } catch (err) {
    return { error: err.message, timeout: err.name === 'TimeoutError' };
  }
}

/**
 * Extract price and stock data from the DOM after successful reveal.
 */
async function extractPriceAndStock(page) {
  try {
    // The price is in .price-main .price-value span elements
    // The actual price is in a dynamically-classed span with style font-size 2.4rem
    // MRP is in a span with text-decoration: line-through
    // Stock is in .stock-badge

    // Extract the main displayed price
    const priceMainEl = page.locator('.price-main');
    
    // Get the price value - it's the large styled element
    // The price text is split into individual spans or displayed as text
    const priceSpan = priceMainEl.locator('div[data-price="true"], span[data-price="true"]').first();
    let priceText = null;

    // Try to get the actual price from the visible price element
    // The store renders price with class like v${random} and specific font-size
    const allTexts = await priceMainEl.textContent({ timeout: 5000 });
    
    // Parse price components from the DOM
    // Look for the MRP (strikethrough) and the shown price
    const mrpEl = priceMainEl.locator('span[style*="line-through"]').first();
    const mrpText = await mrpEl.textContent({ timeout: 3000 }).catch(() => null);
    const mrp = parsePrice(mrpText);

    // Get the main price - it's in the element with font-size 2.4rem
    // This is the element right after the MRP
    const priceEl = priceMainEl.locator('[style*="font-size"]').first();
    priceText = await priceEl.textContent({ timeout: 3000 }).catch(() => null);
    
    if (!priceText) {
      // Fallback: try to find price by looking at all text and extracting numbers
      const allMainText = await priceMainEl.textContent({ timeout: 3000 });
      // The format is typically: ₹MRP ₹Price XX% off
      const priceMatches = allMainText.match(/[₹$]\s*[\d,.\s]+/g);
      if (priceMatches && priceMatches.length >= 2) {
        priceText = priceMatches[1]; // Second match is usually the selling price
      }
    }

    const price = parsePrice(priceText);
    if (price === null) {
      console.log('[Scraper] Failed to parse price from:', priceText);
      return null;
    }

    // Extract stock information
    const stockBadge = page.locator('.stock-badge').first();
    const stockText = await stockBadge.textContent({ timeout: 5000 }).catch(() => null);

    let stockStatus = null;
    let stockQuantity = null;

    if (stockText) {
      const cleanStock = stockText.replace(/[\u200B-\u200D\uFEFF\u00A0]/g, ' ');
      if (cleanStock.toLowerCase().includes('out of stock')) {
        stockStatus = 'OUT_OF_STOCK';
        stockQuantity = 0;
      } else {
        stockStatus = 'IN_STOCK';
        // Extract quantity from text like "In stock · 14 left", "Only 5 left", "14 in stock"
        const qtyMatch = cleanStock.match(/(\d+)/);
        if (qtyMatch) {
          stockQuantity = parseInt(qtyMatch[1], 10);
        }
      }
    }

    if (!stockStatus) {
      // If we couldn't get stock from badge, check if there's an in-stock class
      const hasInStock = await page.locator('.in-stock').isVisible({ timeout: 1000 }).catch(() => false);
      const hasOutStock = await page.locator('.out-stock').isVisible({ timeout: 1000 }).catch(() => false);
      stockStatus = hasOutStock ? 'OUT_OF_STOCK' : (hasInStock ? 'IN_STOCK' : null);
    }

    // Extract currency
    let currency = 'INR';
    if (priceText) {
      if (priceText.includes('$')) currency = 'USD';
      else if (priceText.includes('€')) currency = 'EUR';
      else if (priceText.includes('£')) currency = 'GBP';
    }

    return {
      price,
      mrp,
      currency,
      stockStatus,
      stockQuantity,
    };
  } catch (err) {
    console.error('[Scraper] Extraction error:', err.message);
    return null;
  }
}

/**
 * Create a scrape log entry.
 */
function createLog(productId, scrapeRunId, attempt, status, errorType, errorMessage, responseTime, price, stock) {
  return {
    tracked_product_id: productId,
    scrape_run_id: scrapeRunId,
    attempt_number: attempt,
    status,
    error_type: errorType || null,
    error_message: errorMessage || null,
    response_time_ms: responseTime || null,
    extracted_price: price || null,
    extracted_stock: stock !== undefined ? stock : null,
  };
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
