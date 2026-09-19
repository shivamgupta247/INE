/**
 * INE Price Tracker — Backend API Server
 */

import express from 'express';
import cors from 'cors';
import config from './config/index.js';
import productRoutes from './routes/products.js';
import trackedRoutes from './routes/tracked.js';
import cronRoutes from './routes/cron.js';

const app = express();

// Middleware
app.use(cors({
  origin: config.frontendUrl,
  credentials: true,
}));
app.use(express.json());

// Request logging
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`);
  });
  next();
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: config.nodeEnv,
  });
});

// Routes
app.use('/api/products', productRoutes);
app.use('/api/tracked-products', trackedRoutes);
app.use('/api/cron', cronRoutes);

// Also mount track under products for convenience
app.post('/api/products/track', (req, res, next) => {
  // Delegate to the tracked controller's track handler
  import('./controllers/trackedController.js').then(m => m.trackNewProduct(req, res, next));
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('[Server] Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error', message: err.message });
});

// Start server
app.listen(config.port, () => {
  console.log(`[Server] INE Price Tracker API running on port ${config.port}`);
  console.log(`[Server] Environment: ${config.nodeEnv}`);
  console.log(`[Server] CORS origin: ${config.frontendUrl}`);
});

export default app;
