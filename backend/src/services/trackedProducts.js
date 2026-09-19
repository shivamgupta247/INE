/**
 * Tracked products service — database operations.
 */

import { getSupabase } from '../db/supabase.js';

/**
 * Get all tracked products with their latest price info.
 */
export async function getTrackedProducts() {
  const supabase = getSupabase();

  const { data: products, error } = await supabase
    .from('tracked_products')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;

  // Get latest price for each product
  const enriched = await Promise.all(
    products.map(async (product) => {
      const { data: latestHistory } = await supabase
        .from('price_stock_history')
        .select('*')
        .eq('tracked_product_id', product.id)
        .order('scraped_at', { ascending: false })
        .limit(1);

      const { data: lastLog } = await supabase
        .from('scrape_logs')
        .select('*')
        .eq('tracked_product_id', product.id)
        .eq('status', 'SUCCESS')
        .order('created_at', { ascending: false })
        .limit(1);

      return {
        ...product,
        latest_price: latestHistory?.[0]?.price || null,
        latest_currency: latestHistory?.[0]?.currency || null,
        latest_mrp: latestHistory?.[0]?.mrp || null,
        latest_stock_status: latestHistory?.[0]?.stock_status || null,
        latest_stock_quantity: latestHistory?.[0]?.stock_quantity ?? null,
        last_scraped_at: lastLog?.[0]?.created_at || null,
      };
    })
  );

  return enriched;
}

/**
 * Get a single tracked product by ID.
 */
export async function getTrackedProductById(id) {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from('tracked_products')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;

  // Get latest price
  const { data: latestHistory } = await supabase
    .from('price_stock_history')
    .select('*')
    .eq('tracked_product_id', id)
    .order('scraped_at', { ascending: false })
    .limit(1);

  return {
    ...data,
    latest_price: latestHistory?.[0]?.price || null,
    latest_currency: latestHistory?.[0]?.currency || null,
    latest_mrp: latestHistory?.[0]?.mrp || null,
    latest_stock_status: latestHistory?.[0]?.stock_status || null,
    latest_stock_quantity: latestHistory?.[0]?.stock_quantity ?? null,
  };
}

/**
 * Track a new product. Prevents duplicates by store_product_id.
 */
export async function trackProduct(productData) {
  const supabase = getSupabase();

  // Check for existing tracked product
  const { data: existing } = await supabase
    .from('tracked_products')
    .select('id')
    .eq('store_product_id', productData.store_product_id)
    .single();

  if (existing) {
    // Already tracked — reactivate if inactive
    const { data, error } = await supabase
      .from('tracked_products')
      .update({ is_active: true })
      .eq('id', existing.id)
      .select()
      .single();

    if (error) throw error;
    return { product: data, alreadyTracked: true };
  }

  // Create new tracked product
  const { data, error } = await supabase
    .from('tracked_products')
    .insert({
      store_product_id: productData.store_product_id,
      sku: productData.sku,
      name: productData.name,
      slug: productData.slug || null,
      brand: productData.brand || null,
      category: productData.category || null,
      product_url: productData.product_url || `https://demo.inelabteamdev.com/product/${productData.store_product_id}`,
      is_active: true,
    })
    .select()
    .single();

  if (error) throw error;
  return { product: data, alreadyTracked: false };
}

/**
 * Get price/stock history for a tracked product.
 */
export async function getProductHistory(productId, limit = 100) {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from('price_stock_history')
    .select('*')
    .eq('tracked_product_id', productId)
    .order('scraped_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data;
}

/**
 * Get scrape logs for a tracked product.
 */
export async function getProductLogs(productId, limit = 100) {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from('scrape_logs')
    .select('*')
    .eq('tracked_product_id', productId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data;
}

/**
 * Save a successful scrape result to price/stock history.
 */
export async function saveScrapedPrice(productId, scrapedData) {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from('price_stock_history')
    .insert({
      tracked_product_id: productId,
      price: scrapedData.price,
      currency: scrapedData.currency || 'INR',
      mrp: scrapedData.mrp || null,
      stock_status: scrapedData.stockStatus,
      stock_quantity: scrapedData.stockQuantity ?? null,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Save scrape log entries.
 */
export async function saveScrapeLogs(logs) {
  if (!logs || logs.length === 0) return;
  const supabase = getSupabase();

  const { error } = await supabase
    .from('scrape_logs')
    .insert(logs);

  if (error) throw error;
}

/**
 * Get all active tracked products.
 */
export async function getActiveTrackedProducts() {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from('tracked_products')
    .select('*')
    .eq('is_active', true);

  if (error) throw error;
  return data;
}

/**
 * Untrack (deactivate) a product.
 */
export async function untrackProduct(id) {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from('tracked_products')
    .update({ is_active: false })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}
