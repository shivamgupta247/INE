# INE Price Tracker

A full-stack web application to track product prices and stock from the INE mock store over time.

## Tech Stack
- **Frontend**: React.js, Vite (Deployed on Vercel)
- **Backend**: Node.js, Express, Playwright (Deployed on Render via Docker)
- **Database**: PostgreSQL (Supabase)

## Setup Instructions (Local Development)

### Prerequisites
- Node.js (v18+)
- Supabase account & project

### Backend Setup
1. Navigate to backend: `cd backend`
2. Install dependencies: `npm install`
3. Create a `.env` file:
   ```env
   PORT=3001
   SUPABASE_URL=your_supabase_url
   SUPABASE_ANON_KEY=your_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   CRON_SECRET=your_secret_for_cron
   FRONTEND_URL=http://localhost:5173
   SCRAPE_TIMEOUT_MS=45000
   SCRAPE_MAX_RETRIES=3
   PLAYWRIGHT_HEADLESS=true
   ```
4. Start backend: `npm run dev`

### Frontend Setup
1. Navigate to frontend: `cd frontend`
2. Install dependencies: `npm install`
3. Create a `.env` file:
   ```env
   VITE_API_URL=http://localhost:3001
   ```
4. Start frontend: `npm run dev`

## Scraping Schedule
The scraping is scheduled to run every **2 hours** automatically via an external cron job (cron-job.org) that sends a POST request to `/api/cron/scrape` with the required `x-cron-secret` header.
