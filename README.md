# INE Price Tracker

A full-stack, automated web application built to monitor product prices and stock availability from the INE Mock Store. 

I built this project to solve the challenge of tracking dynamic ecommerce prices while reliably bypassing simulated anti-bot protections. The application not only extracts real-time data but also maintains a complete historical log of price fluctuations, visualized through interactive charts. When significant events happen (like a price drop or an item coming back in stock), the system automatically triggers an email alert.

## ✨ Key Features & Technical Highlights

- **Advanced Web Scraping (Playwright):** Programmatically clicks "Reveal Price" buttons, handles dynamic UI loading states, and successfully bypasses full-page cookie banners by simulating human interaction.
- **Background Task Processing:** Designed specifically for free-tier hosting limitations (like Render). The cron endpoint immediately returns a `200 OK` to prevent HTTP timeouts, while seamlessly spawning the heavy Playwright scraping tasks in the background.
- **Concurrency & OOM Protection:** Implements a strict memory lock. If a cron trigger fires while a previous scraping batch is still running, the system safely ignores it to prevent server Out-Of-Memory (OOM) crashes.
- **Automated Email Alerts (Resend):** Compares newly scraped prices against the historical database. If a price drops or stock returns, it dynamically generates and sends an HTML email alert to the user.
- **Smart Frontend UX:** Built with React & Vite. Features interactive price charts (Recharts), detailed chronological scrape logs, and a smart loading state that automatically detects Render "cold starts" and displays a helpful "Waking up server..." message to the user.
- **PostgreSQL Database:** Uses Supabase to maintain relational records of tracked products, price histories, and deep scrape-run logs.

## ⚙️ Environment Variables Setup

To run this project locally or deploy it, you'll need to set up `.env` files in both the frontend and backend directories.

### Backend (`/backend/.env`)
Create a file named `.env` in the `backend` folder. Here are all the variables required:

```env
# Server
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:5173

# Supabase (Database)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Security & Cron
CRON_SECRET=your_random_secret_string

# Playwright Scraper Config
SCRAPE_TIMEOUT_MS=45000
SCRAPE_MAX_RETRIES=3
PLAYWRIGHT_HEADLESS=true

# Email Alerts (Resend)
RESEND_API_KEY=re_your_api_key_here
RESEND_FROM_EMAIL=onboarding@resend.dev
ALERT_EMAIL=your_personal_email@gmail.com
```

### Frontend (`/frontend/.env`)
Create a file named `.env` in the `frontend` folder:

```env
VITE_API_URL=http://localhost:3001
```

## 🚀 Running Locally

1. **Install Dependencies**
   Open two terminal windows (one for frontend, one for backend).
   ```bash
   # Terminal 1 (Backend)
   cd backend
   npm install
   npx playwright install chromium

   # Terminal 2 (Frontend)
   cd frontend
   npm install
   ```

2. **Start the Development Servers**
   ```bash
   # Terminal 1 (Backend)
   npm run dev

   # Terminal 2 (Frontend)
   npm run dev
   ```

3. **View the Application**
   Open your browser and navigate to `http://localhost:5173`.

## 🕒 Scraping Schedule & Monitoring Strategy

The backend exposes a secure `/api/cron/scrape` endpoint protected by the `CRON_SECRET`. I've configured an external service (`cron-job.org`) to hit this endpoint **every 2 hours**. 

**Why 2 hours?** Playwright is highly resource-intensive. Scraping 10+ products simultaneously causes extreme RAM load on free-tier containers. A 2-hour interval provides the perfect balance between keeping data fresh and maintaining server stability.

**Bonus UX Hack:** I also set up a monitor (like UptimeRobot) to ping the lightweight `/api/health` endpoint every 14 minutes. This prevents Render from putting the free instance to sleep, ensuring that when a user opens the dashboard, it loads instantly without any 50-second cold start delays!
