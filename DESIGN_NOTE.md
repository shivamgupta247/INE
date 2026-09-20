# Architecture & Design Decisions

This document outlines my thought process, the architectural choices I made, the alternatives I considered, and the real-world challenges I faced while building the INE Price Tracker. I wanted to build a system that wasn't just a basic script, but a reliable, production-ready application.

---

## 1. System Architecture

The application is built on a decoupled, asynchronous architecture designed to handle heavy scraping loads on limited cloud resources.

- **Frontend (React + Vite):** A lightweight Single Page Application (SPA) that provides a real-time dashboard. It uses Recharts for price visualization and fetches data via REST APIs.
- **Backend (Node.js + Express):** The core engine. It exposes secure endpoints for the frontend and a private cron endpoint for the scheduler.
- **Scraping Engine (Playwright):** A headless Chromium browser managed by the backend that navigates the mock store, bypasses anti-bot measures, and extracts data.
- **Database (Supabase / PostgreSQL):** A relational database storing `tracked_products`, `price_stock_history`, and granular `scrape_logs`.
- **Alerting (Resend):** An external service integrated into the backend to dispatch HTML emails upon detecting price drops.
- **Trigger Mechanism (Cron-job.org):** An external scheduling service that acts as a pulse, waking the server and triggering the scraping cycle.

---

## 2. Key Decisions & Alternatives Considered

When designing the system, I had to make several critical choices:

### Decision 1: How to Extract the Data?
* **Alternative:** I initially considered using `axios` and `cheerio` to fetch the HTML and parse it. It's incredibly fast and uses almost zero RAM.
* **Why I rejected it:** The mock store requires user interaction (clicking a "Reveal Price" button) and relies heavily on client-side React rendering. `cheerio` cannot execute JavaScript or click buttons. 
* **My Choice:** I chose **Playwright**. It allows me to launch a real browser, wait for the DOM to hydrate, bypass the cookie banner, and physically click the button to trigger the price fetch.

### Decision 2: How to Schedule the Scrapes?
* **Alternative:** I could have used `node-cron` directly inside my `server.js` file to run a timer.
* **Why I rejected it:** On Render's free tier, the server goes to sleep after 15 minutes of inactivity. If the server is asleep, internal Node timers stop working entirely. The scrapes would never happen.
* **My Choice:** I chose an external service (**cron-job.org**) to hit an exposed API endpoint (`/api/cron/scrape`). This guarantees the server is forcibly woken up from the outside, ensuring the scrape runs no matter what.

### Decision 3: Handling Heavy Cron Workloads
* **Alternative:** Wait for the scraping to finish and then return the response to `cron-job.org`.
* **Why I rejected it:** Scraping 10 products takes ~15 minutes due to the store's intentional delays. Most free cron schedulers timeout after 30 seconds. If I made the cron wait, it would throw a "Timeout Error" and potentially retry, causing a catastrophic loop.
* **My Choice:** **Background Promise Detachment**. When the cron hits my API, I immediately return a `200 OK` response to satisfy the scheduler, and I let the `scrapeAllActiveProducts()` promise run detached in the background.

---

## 3. The Trade-offs

Building for a free cloud tier (512MB RAM, 0.1 CPU) forced me to make a few painful but necessary trade-offs:

1. **Sequential over Parallel Execution:** 
   I would love to scrape all 10 products simultaneously to save time. However, launching 10 Playwright Chromium instances would instantly crash the Render container (Out-Of-Memory). **The Trade-off:** I process products sequentially in a single `for...of` loop. It takes 15 minutes to finish, but it guarantees 100% server stability.
2. **2-Hour Intervals instead of Real-Time:** 
   I wanted to track prices every 5 minutes. But because sequential scraping takes so long, overlapping cron jobs caused memory crashes. **The Trade-off:** I scaled the cron interval back to 2 hours. It sacrifices real-time alerts, but provides a much more robust and healthy backend.

---

## 4. Challenges & How I Fixed Them

The development process wasn't smooth. Here are the genuine challenges I ran into and how I solved them:

### Challenge 1: The "Invisible" Cookie Banner Intercepting Clicks
While testing, my scraper would randomly fail to click the "Reveal Price" button. Playwright threw an `element intercepted` error. I realized a dynamic Cookie Banner was sliding up and physically covering the button.
**The Fix:** I added robust logic to look for the banner button using a Regex text matcher (`page.getByRole('button', { name: /^ACCEPT$/i })`). If the banner appears, the scraper clicks "Accept" to dismiss it before attempting to click the price button.

### Challenge 2: The Silent "No Email" Bug
My dashboard was showing price drops, but I wasn't receiving any email alerts. I couldn't figure out why, because the test emails were working perfectly.
**The Fix:** I realized that during the bulk Cron scrape, the function fetching the active products (`getActiveTrackedProducts`) wasn't joining the `latest_price` from the history table. When the backend tried to check `if (newPrice < oldPrice)`, `oldPrice` was undefined, so it silently skipped the email. I fixed it by modifying the SQL query to enrich the product data with the latest price history before initiating the scrape.

### Challenge 3: Overlapping Cron Job Crashes (OOM)
When I set the cron job to 5 minutes for testing, the server started crashing wildly (`OOMKilled`). Because a batch of 10 products takes 15 minutes to scrape, the 5-minute cron triggers were piling up. Two or three heavy background scraping loops were trying to run at the same time.
**The Fix:** I implemented a simple **Concurrency Lock** (`let isCronScraping = false`). Now, when the endpoint is hit, it checks the lock. If a scrape is already running, it elegantly skips the new trigger and prints `[ScrapeService] A scrape is already running. Skipping this cron trigger to prevent memory crash.` This completely eliminated the server crashes!
