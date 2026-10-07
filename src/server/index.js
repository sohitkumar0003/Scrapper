const express = require('express');
const cors = require('cors');
const path = require('path');
const { scrapeGoogleMaps } = require('../scraper/gmapsScraper');
const { convertToCSV } = require('../scraper/csvExporter');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Global state for active scraping job and stored results
let scrapedResults = [];
let isScraping = false;
let stopRequested = false;
let sseClients = [];

/**
 * Broadcast event to all SSE clients
 */
function broadcastSSE(eventData) {
  sseClients.forEach(client => {
    client.res.write(`data: ${JSON.stringify(eventData)}\n\n`);
  });
}

// SSE Endpoint for live progress, logs, and new scraped places
app.get('/api/scrape/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.flushHeaders();

  const clientId = Date.now();
  const newClient = { id: clientId, res };
  sseClients.push(newClient);

  // Send current status immediately
  res.write(`data: ${JSON.stringify({ type: 'status', isScraping, totalItems: scrapedResults.length })}\n\n`);

  req.on('close', () => {
    sseClients = sseClients.filter(c => c.id !== clientId);
  });
});

// Start Scraping API
app.post('/api/scrape', async (req, res) => {
  if (isScraping) {
    return res.status(400).json({ error: 'A scraping job is already in progress.' });
  }

  const {
    keywords = [],
    maxResults = 20,
    scrollDelay = 1200,
    headless = true,
    clearExisting = true
  } = req.body;

  let keywordList = [];
  if (Array.isArray(keywords)) {
    keywordList = keywords.map(k => String(k).trim()).filter(Boolean);
  } else if (typeof keywords === 'string') {
    keywordList = keywords.split(/[\n,]/).map(k => k.trim()).filter(Boolean);
  }

  if (keywordList.length === 0) {
    return res.status(400).json({ error: 'Please provide at least one non-empty search keyword.' });
  }

  if (clearExisting) {
    scrapedResults = [];
  }

  isScraping = true;
  stopRequested = false;

  res.json({ message: 'Scraping started', keywords: keywordList, maxResults });

  // Run scraping in background
  (async () => {
    broadcastSSE({ type: 'job_started', keywords: keywordList, totalKeywords: keywordList.length });

    for (let i = 0; i < keywordList.length; i++) {
      if (stopRequested) {
        broadcastSSE({ type: 'log', message: 'Job stopped by user.', level: 'warn' });
        break;
      }

      const kw = keywordList[i];
      broadcastSSE({ 
        type: 'keyword_start', 
        keyword: kw, 
        keywordIndex: i + 1, 
        totalKeywords: keywordList.length 
      });

      try {
        const places = await scrapeGoogleMaps({
          keyword: kw,
          maxResults: parseInt(maxResults, 10) || 20,
          scrollDelay: parseInt(scrollDelay, 10) || 1200,
          headless: Boolean(headless),
          shouldStop: () => stopRequested,
          onProgress: (evt) => {
            if (evt.type === 'place') {
              scrapedResults.push(evt.place);
            } else if (evt.type === 'update') {
              // Update existing item in results if found
              const index = scrapedResults.findIndex(p => p.googleMapsUrl === evt.place.googleMapsUrl);
              if (index !== -1) {
                scrapedResults[index] = evt.place;
              }
            }
            broadcastSSE({ ...evt, totalResultsCount: scrapedResults.length });
          }
        });
      } catch (err) {
        broadcastSSE({ 
          type: 'log', 
          message: `Error scraping "${kw}": ${err.message}`, 
          level: 'error' 
        });
      }
    }

    isScraping = false;
    broadcastSSE({ 
      type: 'job_completed', 
      totalItems: scrapedResults.length,
      stopRequested 
    });
  })();
});

// Stop Scraping API
app.post('/api/stop', (req, res) => {
  stopRequested = true;
  res.json({ message: 'Stop signal sent to scraper.' });
});

// Get Scraped Results API
app.get('/api/results', (req, res) => {
  res.json({
    isScraping,
    total: scrapedResults.length,
    data: scrapedResults
  });
});

// Clear Results API
app.post('/api/clear', (req, res) => {
  if (isScraping) {
    return res.status(400).json({ error: 'Cannot clear while scraping is active.' });
  }
  scrapedResults = [];
  broadcastSSE({ type: 'cleared' });
  res.json({ message: 'Results cleared successfully.' });
});

// CSV Export Endpoint
app.get('/api/export/csv', (req, res) => {
  const { fields, keyword } = req.query;
  let itemsToExport = scrapedResults;

  if (keyword) {
    itemsToExport = itemsToExport.filter(item => 
      item.keyword && item.keyword.toLowerCase() === keyword.toLowerCase()
    );
  }

  const selectedFields = fields ? fields.split(',') : null;
  const csvContent = convertToCSV(itemsToExport, selectedFields);

  const filename = `google_maps_scrape_${Date.now()}.csv`;

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(csvContent);
});

// JSON Export Endpoint
app.get('/api/export/json', (req, res) => {
  const filename = `google_maps_scrape_${Date.now()}.json`;

  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(JSON.stringify(scrapedResults, null, 2));
});

// Serve frontend in production build if present
const webDistPath = path.join(__dirname, '../../dist');
app.use(express.static(webDistPath));

app.get('*', (req, res) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: 'API route not found' });
  }
  res.sendFile(path.join(webDistPath, 'index.html'), (err) => {
    if (err) {
      res.status(200).send('Google Maps Scraper Backend API is running.');
    }
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Google Maps Scraper server listening on http://localhost:${PORT}`);
});
