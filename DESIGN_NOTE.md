# Design Note & Architecture Decisions

This document explains the technical choices I made while building the INE Price Tracker, how I ensured reliability against the mock store, and how I overcame critical development challenges.

## 1. Making the Scraper Reliable
The INE mock store was designed to be intentionally difficult to scrape (dynamic elements, slow load times, anti-bot mechanisms). To make my scraper rock-solid, I implemented the following strategies:

* **Exponential Backoff:** If the mock store fails to load or drops a connection, the scraper doesn't just crash. It catches the error and retries the scrape automatically, waiting progressively longer between attempts (2 seconds, 4 seconds, 6 seconds). This ensures temporary network hiccups don't ruin the data collection.
* **Human-like Interaction (Anti-Bot Bypass):** The store requires mouse movements and hover events to reveal the price. I programmed Playwright to simulate organic mouse movements (randomized X/Y offsets) and wait for a specific "dwell time" over the price container before attempting to click the button.
* **Handling Overlays:** The biggest hidden issue was a random cookie consent banner that sometimes intercepted the "Reveal Price" click. I solved this by explicitly querying for `.cookie-banner button` and, as a fallback, using Playwright's `force: true` on the reveal click to bypass invisible overlays.

## 2. Infrastructure Trade-offs
I deployed the backend to Render's free tier, which imposes severe constraints (only 512MB of RAM and 0.1 CPU). Playwright is notoriously resource-heavy because it runs a full Chromium browser. 

**The Trade-off:** 
To prevent the server from running out of memory (OOM crashes), I had to heavily optimize the browser launch arguments (`--disable-dev-shm-usage`, `--disable-gpu`, `--no-sandbox`). More importantly, I couldn't run the cron job every 1 minute as initially desired. A 1-minute cron caused overlapping browser sessions, immediately crashing the server. I chose to schedule the cron job for **every 2 hours**. This trade-off sacrifices real-time latency for stability, which is essential for a reliable tracker on free hosting.

## 3. Key Development Challenges & Fixes

During development, I faced several tricky edge cases while interacting with the mock store and extracting data:

1. **Extracting Stale Data due to Reactivity:** 
   * **The Problem:** Initially, my scraper was extracting the price string immediately after the page loaded. However, because the mock store uses a React-like framework, the DOM was rendering a "loading" placeholder (`--`) for a split second before injecting the actual price. My scraper was returning `null` or crashing because it couldn't parse the placeholder as a number.
   * **My Fix:** I abandoned static DOM extraction and implemented a robust `Promise.race` inside a `waitForPriceResult` function. The scraper now waits explicitly for the CSS classes `.price-success` or `.price-error` to appear in the DOM before attempting to read any text.

2. **The Hidden Cookie Banner Interception:**
   * **The Problem:** I wrote a standard `await page.click('.reveal-price-btn')`. While testing locally, it worked fine. But randomly, the clicks started failing with an "element intercepted" error.
   * **The Fix:** I realized a dynamic Cookie Consent banner was occasionally sliding up and covering the button. To fix this, I added logic to check if the banner is present and click "Accept" first. As a failsafe, I also added `{ force: true }` to the price button click, ensuring Playwright bypasses non-blocking pointer events.

3. **Handling Flaky Network Responses:**
   * **The Problem:** The mock store randomly simulates HTTP 500 errors or extreme latency (taking up to 10 seconds to respond). My standard HTTP requests were timing out, causing the entire cron job to fail.
   * **The Fix:** I implemented a custom error-handling layer that intercepts these specific Timeout errors, categorizes them as "Store Server Delay", and triggers the Exponential Backoff retry system rather than abandoning the scrape entirely.
