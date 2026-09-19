/**
 * Product search service — uses the INE store's catalog API directly.
 * No scraping needed for product discovery; the store exposes a JSON API.
 */

import config from '../config/index.js';

const BASE_URL = config.scraper.baseUrl;

let catalogCache = null;
let lastCacheTime = 0;
const CACHE_TTL_MS = 1000 * 60 * 30; // 30 minutes

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CATALOG_FILE = path.join(__dirname, '../data/catalog.json');

/**
 * Fetch and cache all products from pre-indexed catalog file or API.
 */
async function getAllProducts() {
  if (catalogCache && catalogCache.length > 0) {
    return catalogCache;
  }

  // 1. Try loading from pre-indexed catalog.json (100% complete catalog)
  try {
    if (fs.existsSync(CATALOG_FILE)) {
      const raw = fs.readFileSync(CATALOG_FILE, 'utf8');
      catalogCache = JSON.parse(raw);
      console.log(`[ProductSearch] Loaded ${catalogCache.length} products from indexed catalog.json.`);
      return catalogCache;
    }
  } catch (err) {
    console.error('[ProductSearch] Failed reading catalog.json:', err.message);
  }

  return catalogCache || [];
}

/**
 * Search products from the INE mock store by name, brand, category, SKU.
 * Searches across ALL 1000 catalog products instantly using in-memory cache.
 * 
 * @param {string} query - search term
 * @param {number} maxResults - maximum results to return
 * @returns {Promise<Array>} matching products
 */
export async function searchProducts(query, maxResults = 30) {
  if (!query || query.trim().length === 0) {
    return [];
  }

  const terms = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  const products = await getAllProducts();

  const matched = products.filter(item => {
    const searchable = `${item.name} ${item.brand || ''} ${item.category || ''} ${item.sku || ''}`.toLowerCase();
    return terms.every(term => searchable.includes(term));
  });

  return matched.slice(0, maxResults);
}

/**
 * Fetch a single product by ID from the store API.
 */
export async function fetchProductById(productId) {
  const response = await fetch(`${BASE_URL}/api/product/${productId}`, {
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) {
    throw new Error(`Product fetch failed: ${response.status}`);
  }
  return response.json();
}

/**
 * Fetch a single catalog page.
 */
async function fetchCatalogPage(page, pageSize = 20) {
  const response = await fetch(
    `${BASE_URL}/api/catalog?page=${page}&pageSize=${pageSize}`,
    { signal: AbortSignal.timeout(10000) }
  );
  if (!response.ok) {
    throw new Error(`Catalog fetch failed: ${response.status}`);
  }
  return response.json();
}

/**
 * Filter items by query and push into results array.
 */
function filterAndPush(items, query, results, maxResults) {
  for (const item of items) {
    if (results.length >= maxResults) break;
    const searchFields = [
      item.name,
      item.brand,
      item.category,
      item.sku,
    ].filter(Boolean).map(s => s.toLowerCase());

    if (searchFields.some(field => field.includes(query))) {
      results.push({
        id: item.id,
        slug: item.slug,
        name: item.name,
        brand: item.brand,
        category: item.category,
        sku: item.sku,
        description: item.description,
        url: `${BASE_URL}/product/${item.id}`,
      });
    }
  }
}
