/**
 * Validation module for scraped price/stock data.
 * Ensures only valid, sensible data is persisted.
 */

/**
 * Validate scraped price data before persistence.
 * @param {object} data - { price, mrp, currency, stockQuantity, stockStatus, productName }
 * @param {string} expectedProductName - name of the product we intended to scrape
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateScrapedData(data, expectedProductName) {
  const errors = [];

  // Price must exist and be a number
  if (data.price === null || data.price === undefined) {
    errors.push('Price is missing');
  } else if (typeof data.price !== 'number' || isNaN(data.price)) {
    errors.push(`Price is not a valid number: ${data.price}`);
  } else if (data.price <= 0) {
    errors.push(`Price is not positive: ${data.price}`);
  } else if (data.price > 10_000_000) {
    errors.push(`Price seems unreasonably high: ${data.price}`);
  }

  // MRP validation (optional but if present must be valid)
  if (data.mrp !== null && data.mrp !== undefined) {
    if (typeof data.mrp !== 'number' || isNaN(data.mrp)) {
      errors.push(`MRP is not a valid number: ${data.mrp}`);
    } else if (data.mrp <= 0) {
      errors.push(`MRP is not positive: ${data.mrp}`);
    }
  }

  // Stock status must be valid
  if (!data.stockStatus) {
    errors.push('Stock status is missing');
  } else if (!['IN_STOCK', 'OUT_OF_STOCK'].includes(data.stockStatus)) {
    errors.push(`Invalid stock status: ${data.stockStatus}`);
  }

  // Stock quantity validation
  if (data.stockQuantity !== null && data.stockQuantity !== undefined) {
    if (typeof data.stockQuantity !== 'number' || isNaN(data.stockQuantity)) {
      errors.push(`Stock quantity is not a valid number: ${data.stockQuantity}`);
    } else if (data.stockQuantity < 0) {
      errors.push(`Stock quantity is negative: ${data.stockQuantity}`);
    }
  }

  // Currency must be present
  if (!data.currency || typeof data.currency !== 'string') {
    errors.push('Currency is missing or invalid');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Parse a price string into a number.
 * Handles formats like "₹4,999", "Rs. 4,999.00", "$99.99"
 */
export function parsePrice(priceStr) {
  if (typeof priceStr === 'number') return isNaN(priceStr) ? null : priceStr;
  if (!priceStr || typeof priceStr !== 'string') return null;

  // Remove invisible Unicode characters (zero-width spaces \u200B-\u200D, \uFEFF, non-breaking spaces \u00A0)
  const sanitized = priceStr
    .replace(/[\u200B-\u200D\uFEFF\u00A0]/g, '')
    .replace(/[₹$€£¥]/g, '')
    .replace(/Rs\.?/gi, '')
    .replace(/,/g, '')
    .replace(/\s+/g, '')
    .replace(/\/-.*$/, '') // Remove "/- (incl. of all taxes)" suffix
    .trim();

  // Extract the first valid numeric value (integer or decimal)
  const match = sanitized.match(/(\d+(?:\.\d+)?)/);
  if (!match) return null;

  const num = parseFloat(match[1]);
  return isNaN(num) ? null : num;
}

/**
 * Determine stock status from stock quantity.
 */
export function determineStockStatus(stockQuantity) {
  if (stockQuantity === null || stockQuantity === undefined) return null;
  return stockQuantity > 0 ? 'IN_STOCK' : 'OUT_OF_STOCK';
}
