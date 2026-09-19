# Design Note: Scraping Reliability & Trade-offs

## How Scraping Reliability Was Achieved
The INE mock store is intentionally difficult to scrape (dynamic content, cookie consent overlays, random errors, and required hover interactions). To ensure the scraper runs reliably unattended:
1. **Headless Browser**: I used Playwright to handle the dynamic DOM rendering, the cookie banner, and the required mouse hover interactions.
2. **Retry Mechanism**: The scraping function wraps browser execution in a retry loop (up to 3 times) with exponential backoff. If the page loads incorrectly or the mock store fails to reveal the price on the first try, the scraper aborts, logs a `RETRY` status, and attempts a fresh load.
3. **Data Validation**: Extracted prices and stock text are strictly parsed and validated. If parsing fails, it refuses to save incorrect data and triggers a retry instead.

## Trade-offs Made
- **Playwright over Lightweight HTTP**: I traded performance and server resources (requiring Docker deployment for Playwright) for the ability to reliably interact with the dynamic challenges of the store (like mouse movements to reveal prices).
- **External Cron**: Instead of an always-on internal loop which would sleep on a free Render tier, I exposed a protected endpoint (`/api/cron/scrape`) and offloaded the scheduling to cron-job.org.

## AI Tool Mistakes & Corrections
During development, the AI assistant (Antigravity) successfully set up the scraper logic but made a subtle mistake with Promise handling. 
- **The Mistake**: In the `waitForPriceResult` function, the AI used `Promise.race` to handle a timeout against Playwright's `waitFor()` locators. However, if the timeout triggered first, the pending `waitFor()` promises were left hanging. When the browser page was subsequently closed, these orphaned promises rejected with a "Target closed" error. Because these rejections weren't explicitly caught, they resulted in Unhandled Promise Rejections which crashed the Node.js server randomly (causing `ECONNRESET` errors on the frontend).
- **The Correction**: I debugged the `ECONNRESET` issue and added `.catch()` handlers directly to the promises passed into `Promise.race()`. This ensured that if the page closed before they settled, their rejection would be safely caught, preventing the entire server from crashing.
