/**
 * API service for communicating with the backend.
 */

const API_BASE = import.meta.env.VITE_API_URL || '';

async function request(url, options = {}) {
  const response = await fetch(`${API_BASE}${url}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || data.message || `Request failed: ${response.status}`);
  }

  return data;
}

// Product search
export function searchProducts(query) {
  return request(`/api/products/search?q=${encodeURIComponent(query)}`);
}

// Track a product
export function trackProduct(product) {
  return request('/api/products/track', {
    method: 'POST',
    body: JSON.stringify({
      store_product_id: product.id,
      sku: product.sku,
      name: product.name,
      slug: product.slug,
      brand: product.brand,
      category: product.category,
    }),
  });
}

// Get all tracked products
export function getTrackedProducts() {
  return request('/api/tracked-products');
}

// Get a single tracked product
export function getTrackedProduct(id) {
  return request(`/api/tracked-products/${id}`);
}

// Get price/stock history
export function getProductHistory(id) {
  return request(`/api/tracked-products/${id}/history`);
}

// Get scrape logs
export function getProductLogs(id) {
  return request(`/api/tracked-products/${id}/logs`);
}

// Trigger manual scrape
export function scrapeProduct(id) {
  return request(`/api/tracked-products/${id}/scrape`, {
    method: 'POST',
  });
}

// Delete tracked product
export function deleteTrackedProduct(id) {
  return request(`/api/tracked-products/${id}`, {
    method: 'DELETE',
  });
}
