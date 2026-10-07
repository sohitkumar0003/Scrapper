const { chromium } = require('playwright');

/**
 * Scrapes Google Maps search results for a given keyword.
 * 
 * @param {Object} options
 * @param {string} options.keyword - Search keyword (e.g. "Coffee shops in Seattle")
 * @param {number} [options.maxResults=20] - Maximum number of listings to collect
 * @param {number} [options.scrollDelay=1200] - Delay in ms between scroll steps
 * @param {boolean} [options.headless=true] - Run browser in headless mode
 * @param {Function} [options.onProgress] - Callback for real-time events
 * @param {Function} [options.shouldStop] - Check if user requested stop
 * @returns {Promise<Array<Object>>} Array of scraped place objects
 */
async function scrapeGoogleMaps(options = {}) {
  const {
    keyword,
    maxResults = 20,
    scrollDelay = 1200,
    headless = true,
    onProgress = () => {},
    shouldStop = () => false
  } = options;

  if (!keyword || typeof keyword !== 'string') {
    throw new Error('Search keyword is required');
  }

  const log = (msg, level = 'info') => {
    onProgress({ type: 'log', message: msg, level, keyword });
  };

  log(`Starting Google Maps scraper for keyword: "${keyword}"`);

  let browser;
  const scrapedPlaces = [];
  const seenUrls = new Set();

  try {
    browser = await chromium.launch({
      headless: headless,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-notifications',
        '--lang=en-US,en'
      ]
    });

    const context = await browser.newContext({
      locale: 'en-US',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      viewport: { width: 1280, height: 900 }
    });

    const page = await context.newPage();

    // Navigate to Google Maps search URL with English language parameter
    const searchUrl = `https://www.google.com/maps/search/${encodeURIComponent(keyword)}?hl=en`;
    log(`Navigating to Google Maps...`);
    await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });

    // Handle cookie consent dialog if present
    try {
      const consentBtn = await page.$('button[aria-label*="Accept all"], button[aria-label*="Agree"], form[action*="consent"] button');
      if (consentBtn) {
        log(`Dismissing cookie consent modal...`);
        await consentBtn.click();
        await page.waitForTimeout(1000);
      }
    } catch (e) {
      // Ignore consent modal errors if not present
    }

    // Wait for the feed container or map
    log(`Waiting for results to load...`);
    try {
      await page.waitForSelector('div[role="feed"], div.m6QEfe, a[href*="/maps/place/"]', { timeout: 15000 });
    } catch (err) {
      log(`No direct feed container found. Checking single place redirect...`, 'warn');
    }

    // Check if Google Maps redirected straight to a single place page
    const currentUrl = page.url();
    if (currentUrl.includes('/maps/place/')) {
      log(`Direct single place match found.`);
      const singlePlace = await extractSinglePlaceDetails(page, keyword);
      if (singlePlace) {
        scrapedPlaces.push(singlePlace);
        onProgress({
          type: 'place',
          keyword,
          place: singlePlace,
          scrapedCount: 1,
          maxResults
        });
      }
      await browser.close();
      return scrapedPlaces;
    }

    // Locate feed container selector
    const feedSelector = 'div[role="feed"]';
    let hasFeed = await page.$(feedSelector);
    
    let endOfListReached = false;
    let scrollAttempts = 0;
    const maxScrollAttempts = Math.ceil(maxResults / 2) + 15;

    while (scrapedPlaces.length < maxResults && !endOfListReached && scrollAttempts < maxScrollAttempts) {
      if (shouldStop()) {
        log(`Scraping manually stopped by user.`, 'warn');
        break;
      }

      scrollAttempts++;

      // Extract all current place items in feed
      const placeCards = await page.$$('a[href*="/maps/place/"], div.Nv251d, div.qBF1Pd');
      
      // Also query parent card containers
      const cardsData = await page.evaluate(() => {
        const results = [];
        // Find all place items in the feed
        const links = Array.from(document.querySelectorAll('a[href*="/maps/place/"]'));
        
        for (const link of links) {
          const href = link.href;
          // Find the card container
          let container = link.closest('div.Nv251d') || link.closest('div.m6QEfe') || link.parentElement;
          while (container && !container.classList.contains('Nv251d') && container.parentElement && container.parentElement.getAttribute('role') !== 'feed') {
            container = container.parentElement;
          }

          const cardText = container ? container.innerText : '';
          
          // Title extraction
          let title = '';
          const titleEl = link.querySelector('div.fontHeadlineSmall, span.OSrAFb, div.qBF1Pd') || 
                          container?.querySelector('div.fontHeadlineSmall, div.qBF1Pd');
          if (titleEl) {
            title = titleEl.innerText.trim();
          } else {
            title = link.getAttribute('aria-label') || link.innerText.trim();
          }

          if (!title || title.length < 2) continue;

          // Rating extraction
          let rating = null;
          let reviewCount = null;
          const ratingEl = container?.querySelector('span.MW4etd, span[aria-label*="stars"], span[aria-label*="rating"]');
          if (ratingEl) {
            const ariaLabel = ratingEl.getAttribute('aria-label') || ratingEl.innerText;
            const match = ariaLabel.match(/([0-9]\.[0-9])/);
            if (match) rating = parseFloat(match[1]);
          }

          const reviewEl = container?.querySelector('span.UY7F9, span[aria-label*="reviews"]');
          if (reviewEl) {
            const revText = reviewEl.innerText || reviewEl.getAttribute('aria-label') || '';
            const match = revText.replace(/,/g, '').match(/\(?([0-9]+)\)?/);
            if (match) reviewCount = parseInt(match[1], 10);
          }

          // Category & Address lines
          let category = '';
          let address = '';
          let phone = '';
          let email = '';
          let website = '';
          let status = '';

          const textLines = cardText.split('\n').map(l => l.trim()).filter(Boolean);
          // Parse fields from card text lines
          for (let i = 0; i < textLines.length; i++) {
            const line = textLines[i];
            if (line.includes('·')) {
              const parts = line.split('·').map(p => p.trim());
              if (parts.length >= 1 && !category) category = parts[0];
              if (parts.length >= 2 && !address) address = parts[1];
            } else if (line.match(/^((\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4})/)) {
              phone = line;
            } else if (line.includes('@') && line.includes('.')) {
              email = line;
            } else if (line.includes('Open') || line.includes('Closed') || line.includes('24 hours')) {
              status = line;
            }
          }

          // Coordinates from URL if present
          let latitude = null;
          let longitude = null;
          const coordMatch = href.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/) || href.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
          if (coordMatch) {
            latitude = parseFloat(coordMatch[1]);
            longitude = parseFloat(coordMatch[2]);
          }

          results.push({
            title,
            rating,
            reviewCount,
            category,
            address,
            phone,
            email,
            website,
            status,
            googleMapsUrl: href,
            latitude,
            longitude
          });
        }
        return results;
      });

      // Filter new listings
      for (const card of cardsData) {
        if (scrapedPlaces.length >= maxResults) break;
        if (!card.googleMapsUrl || seenUrls.has(card.googleMapsUrl)) continue;

        seenUrls.add(card.googleMapsUrl);
        
        const placeItem = {
          title: card.title,
          category: card.category || '',
          rating: card.rating,
          reviewCount: card.reviewCount,
          address: card.address || '',
          phone: card.phone || '',
          email: card.email || '',
          website: card.website || '',
          status: card.status || '',
          latitude: card.latitude,
          longitude: card.longitude,
          keyword: keyword,
          googleMapsUrl: card.googleMapsUrl,
          plusCode: ''
        };

        scrapedPlaces.push(placeItem);

        log(`[${scrapedPlaces.length}/${maxResults}] Found: ${placeItem.title}`);
        onProgress({
          type: 'place',
          keyword,
          place: placeItem,
          scrapedCount: scrapedPlaces.length,
          maxResults
        });
      }

      // Check if "You've reached the end of the list" is shown
      const endText = await page.evaluate(() => {
        const bodyText = document.body.innerText;
        return bodyText.includes("You've reached the end of the list") || 
               bodyText.includes("No more results");
      });

      if (endText) {
        log(`Reached the end of Google Maps results list.`);
        endOfListReached = true;
        break;
      }

      // Scroll down feed container
      if (hasFeed) {
        await page.evaluate((sel) => {
          const feed = document.querySelector(sel);
          if (feed) {
            feed.scrollTop = feed.scrollHeight;
          } else {
            window.scrollBy(0, 1000);
          }
        }, feedSelector);
      } else {
        await page.evaluate(() => window.scrollBy(0, 1000));
      }

      await page.waitForTimeout(scrollDelay);
    }

    log(`Scraping completed. Extracted ${scrapedPlaces.length} total places for "${keyword}".`);

    // Optional detail enrichment: If items are missing phone/website/address, click on top items to get full panel data
    log(`Enriching detailed place metadata...`);
    for (let i = 0; i < Math.min(scrapedPlaces.length, maxResults); i++) {
      if (shouldStop()) break;
      const place = scrapedPlaces[i];
      if ((!place.phone || !place.website || !place.address) && place.googleMapsUrl) {
        try {
          await page.goto(place.googleMapsUrl, { waitUntil: 'domcontentloaded', timeout: 10000 });
          await page.waitForTimeout(1200);

          const details = await extractSinglePlaceDetails(page, keyword);
          if (details) {
            if (details.phone) place.phone = details.phone;
            if (details.website) place.website = details.website;
            if (details.address) place.address = details.address;
            if (details.plusCode) place.plusCode = details.plusCode;
            if (details.status) place.status = details.status;
            if (details.category && !place.category) place.category = details.category;
            if (details.latitude) place.latitude = details.latitude;
            if (details.longitude) place.longitude = details.longitude;

            onProgress({
              type: 'update',
              keyword,
              place: place,
              scrapedCount: scrapedPlaces.length,
              maxResults
            });
          }
        } catch (err) {
          // Ignore detail enrichment timeout for individual items
        }
      }
    }

  } catch (error) {
    log(`Scraper error: ${error.message}`, 'error');
    throw error;
  } finally {
    if (browser) {
      await browser.close();
    }
  }

  return scrapedPlaces;
}

/**
 * Extracts metadata from a single place panel in Google Maps
 */
async function extractSinglePlaceDetails(page, keyword) {
  try {
    return await page.evaluate((kw) => {
      const getTxt = (sel) => {
        const el = document.querySelector(sel);
        return el ? el.innerText.trim() : '';
      };

      const title = getTxt('h1.DUwfxb') || getTxt('h1') || getTxt('div.fontHeadlineLarge');
      const category = getTxt('button.DkScL') || getTxt('span.W4Efsd');

      // Rating
      let rating = null;
      const ratingEl = document.querySelector('div.F72Y0d span.MW4etd') || document.querySelector('span[aria-label*="stars"]');
      if (ratingEl) {
        const m = (ratingEl.getAttribute('aria-label') || ratingEl.innerText).match(/([0-9]\.[0-9])/);
        if (m) rating = parseFloat(m[1]);
      }

      // Review count
      let reviewCount = null;
      const revEl = document.querySelector('button[jsaction*="review"]') || document.querySelector('span.UY7F9');
      if (revEl) {
        const m = revEl.innerText.replace(/,/g, '').match(/\(?([0-9]+)\)?/);
        if (m) reviewCount = parseInt(m[1], 10);
      }

      // Address
      const addressBtn = document.querySelector('button[data-item-id="address"] div.Io6YTe') || 
                         document.querySelector('button[aria-label*="Address:"]');
      const address = addressBtn ? addressBtn.innerText.trim() : '';

      // Phone
      const phoneBtn = document.querySelector('button[data-item-id^="phone:"] div.Io6YTe') || 
                       document.querySelector('button[aria-label*="Phone:"]');
      const phone = phoneBtn ? phoneBtn.innerText.trim() : '';

      // Email
      const emailLink = document.querySelector('a[href^="mailto:"]');
      const email = emailLink ? emailLink.getAttribute('href').replace(/^mailto:/i, '').trim() : '';

      // Website
      const webBtn = document.querySelector('a[aria-label*="Website:"]') || 
                     document.querySelector('a[data-item-id="authority"]');
      const website = webBtn ? webBtn.href : '';

      // Plus Code
      const plusBtn = document.querySelector('button[data-item-id="oloc"] div.Io6YTe');
      const plusCode = plusBtn ? plusBtn.innerText.trim() : '';

      // Hours / Status
      const hoursEl = document.querySelector('div[aria-label*="Hours"]') || document.querySelector('span.ZDu9vd');
      const status = hoursEl ? hoursEl.innerText.trim().replace(/\n/g, ' ') : '';

      // Lat & Lng from page URL
      let latitude = null;
      let longitude = null;
      const url = window.location.href;
      const coordMatch = url.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/) || url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
      if (coordMatch) {
        latitude = parseFloat(coordMatch[1]);
        longitude = parseFloat(coordMatch[2]);
      }

      return {
        title,
        category,
        rating,
        reviewCount,
        address,
        phone,
        email,
        website,
        status,
        latitude,
        longitude,
        keyword: kw,
        googleMapsUrl: url,
        plusCode
      };
    }, keyword);
  } catch (e) {
    return null;
  }
}

module.exports = {
  scrapeGoogleMaps
};
