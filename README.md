# INE Price Tracker

A full-stack web application built to monitor product prices and stock availability from the INE Mock Store. It bypasses simulated anti-bot challenges, logs historical price data to help users track price drops over time, and sends automated email alerts.

## Key Features
- **Live Tracking & Anti-Bot Bypass:** Uses Playwright to simulate human interactions and bypass store protections.
- **Unified Dashboard:** Track multiple products, see real-time stock counts, and filter items by highest discount.
- **Automated Email Alerts:** Integrated with Resend to automatically send an HTML email when a price drop or a back-in-stock event occurs.
- **Price History Graph:** Visualize pricing trends over time.

## Environment Variables

To run this project locally, you'll need to set up `.env` files in both the frontend and backend directories.

### Backend (`/backend/.env`)
Create a file named `.env` in the `backend` folder:
```
PORT=5000
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
STORE_BASE_URL=https://demo.inelabteamdev.com
CRON_SECRET=my_super_secret_cron_key

# Email Alerts
RESEND_API_KEY=your_resend_api_key_here
RESEND_FROM_EMAIL=onboarding@resend.dev
ALERT_EMAIL=your_verified_email@gmail.com
```

### Frontend (`/frontend/.env`)
Create a file named `.env` in the `frontend` folder:
```
VITE_API_URL=http://localhost:5000
```

## Setup & Running Locally

1. **Install Dependencies**
   Open two terminals, one for the frontend and one for the backend.
   ```bash
   # Terminal 1 (Backend)
   cd backend
   npm install

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

3. **View the Dashboard**
   Open your browser and navigate to `http://localhost:5173`.

## Scraping Schedule
The backend exposes a secure `/api/cron/scrape` endpoint. I've configured an external service (`cron-job.org`) to hit this endpoint **every 2 hours**. 
This frequency was chosen because Playwright is highly resource-intensive, and scraping too frequently (like every 1 minute) causes extreme server load and RAM crashes on free hosting tiers (like Render). Every 2 hours provides a perfect balance between staying updated and keeping the server healthy.
