-- INE Price Tracker Database Schema
-- Run this in Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tracked Products
CREATE TABLE IF NOT EXISTS tracked_products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_product_id INTEGER NOT NULL UNIQUE,
  sku VARCHAR(50) NOT NULL,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255),
  brand VARCHAR(100),
  category VARCHAR(100),
  product_url VARCHAR(512),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Price & Stock History (only valid, successfully scraped results)
CREATE TABLE IF NOT EXISTS price_stock_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tracked_product_id UUID NOT NULL REFERENCES tracked_products(id) ON DELETE CASCADE,
  price DECIMAL(12, 2) NOT NULL,
  currency VARCHAR(10) DEFAULT 'INR',
  mrp DECIMAL(12, 2),
  stock_status VARCHAR(20) NOT NULL CHECK (stock_status IN ('IN_STOCK', 'OUT_OF_STOCK')),
  stock_quantity INTEGER,
  scraped_at TIMESTAMPTZ DEFAULT NOW()
);

-- Scrape Logs (every scrape attempt, success or failure)
CREATE TABLE IF NOT EXISTS scrape_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tracked_product_id UUID NOT NULL REFERENCES tracked_products(id) ON DELETE CASCADE,
  scrape_run_id UUID NOT NULL,
  attempt_number INTEGER NOT NULL DEFAULT 1,
  status VARCHAR(20) NOT NULL CHECK (status IN ('SUCCESS', 'RETRY', 'FAILED', 'TIMEOUT', 'PARSE_ERROR', 'INVALID_DATA')),
  error_type VARCHAR(100),
  error_message TEXT,
  response_time_ms INTEGER,
  extracted_price DECIMAL(12, 2),
  extracted_stock INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_price_history_product ON price_stock_history(tracked_product_id);
CREATE INDEX IF NOT EXISTS idx_price_history_scraped_at ON price_stock_history(scraped_at DESC);
CREATE INDEX IF NOT EXISTS idx_scrape_logs_product ON scrape_logs(tracked_product_id);
CREATE INDEX IF NOT EXISTS idx_scrape_logs_run ON scrape_logs(scrape_run_id);
CREATE INDEX IF NOT EXISTS idx_scrape_logs_created ON scrape_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tracked_products_store_id ON tracked_products(store_product_id);
CREATE INDEX IF NOT EXISTS idx_tracked_products_active ON tracked_products(is_active);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_tracked_products_updated_at ON tracked_products;
CREATE TRIGGER update_tracked_products_updated_at
  BEFORE UPDATE ON tracked_products
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
