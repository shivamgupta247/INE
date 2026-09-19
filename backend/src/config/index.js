import dotenv from 'dotenv';
dotenv.config();

const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',

  supabase: {
    url: process.env.SUPABASE_URL,
    anonKey: process.env.SUPABASE_ANON_KEY,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  },

  cronSecret: process.env.CRON_SECRET || 'dev-cron-secret',

  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',

  scraper: {
    timeoutMs: parseInt(process.env.SCRAPE_TIMEOUT_MS || '45000', 10),
    maxRetries: parseInt(process.env.SCRAPE_MAX_RETRIES || '3', 10),
    headless: process.env.PLAYWRIGHT_HEADLESS !== 'false',
    baseUrl: 'https://demo.inelabteamdev.com',
  },

  resend: {
    apiKey: process.env.RESEND_API_KEY,
    fromEmail: process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev',
    alertEmail: process.env.ALERT_EMAIL || 'sstephen@ine.com', 
  },
};

export default config;
