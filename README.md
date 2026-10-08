# 📍 Google Maps Scraper Pro

An advanced Google Maps scraper built with **Node.js, Express, Playwright, React, and Vite**. Extract high-value business leads by keywords and export complete datasets directly to RFC 4180 CSV (with UTF-8 BOM for Microsoft Excel) or JSON.

---

## 🌟 Key Features

- **Keyword Search Extraction**: Search for any business type in any location (e.g., `"Dentists in Austin, TX"`, `"Coffee Shops in Seattle"`).
- **Rich Business Data Extracted**:
  - Business Name / Title
  - Category & Industry
  - Average Rating & Review Count
  - Phone Number
  - Website URL
  - Complete Address
  - Status / Operating Hours
  - Latitude & Longitude Coordinates
  - Plus Code & Google Maps URL
- **UTF-8 BOM CSV Export**: Standard RFC 4180 CSV with UTF-8 byte order mark to ensure special characters and non-English scripts open cleanly in Excel.
- **Custom Field Selection**: Choose exactly which columns to export.
- **Real-Time Live Monitor**: Live SSE progress bar, place updates, and terminal log stream.
- **CLI & Web UI Dual Support**: Run through a slick web dashboard or via headless terminal commands.

---

## 🚀 Quick Start Guide

### 1. Launch Web Dashboard (Recommended)

Start the Express backend and Vite development server:

```bash
# Terminal 1: Start Backend API (Port 3001)
npm run server

# Terminal 2: Start Web Dashboard (Port 3000)
npm run dev
```

Open your browser and navigate to `http://localhost:3000`.

---

### 2. GitHub Pages

The GitHub Actions workflow builds and deploys the dashboard to GitHub Pages when changes are pushed to `main`.
In the repository settings, set **Pages → Build and deployment → Source** to **GitHub Actions**.

GitHub Pages hosts only the static dashboard; it cannot run the Express/Playwright scraper. To deploy the API on
Render:

1. Create a Render Blueprint from this repository. Render reads `render.yaml` and builds the scraper API container.
2. Copy the HTTPS URL assigned to the `scrapper-api` web service.
3. In GitHub, open **Settings → Secrets and variables → Actions → Variables** and create
   `VITE_API_BASE_URL` with that API URL (origin only, with no trailing slash).
4. Run the **Deploy to GitHub Pages** workflow from the Actions tab to rebuild the dashboard with the API URL.

The Render service restricts browser API access to this repository's GitHub Pages origin. Update `CORS_ORIGINS` in
Render if you use the UI from another origin. The service stores results in memory, so results are cleared when
Render restarts it; free services may also take time to wake after inactivity.

---

### 3. Command Line Interface (CLI)

You can also run scrapes directly from your command prompt or terminal:

```bash
# Scrape single keyword
node src/cli/index.js --keywords "Dentists in Austin, TX" --limit 15 --output dentists.csv

# Scrape multiple keywords in batch
node src/cli/index.js --keywords "Plumbers in Miami, Gyms in Chicago" --limit 20 --output leads.csv
```

#### CLI Command Options:
| Flag | Short | Description | Default |
|------|-------|-------------|---------|
| `--keywords` | `-k` | Comma-separated search keywords | *Required* |
| `--limit` | `-l` | Max listings to extract per keyword | `20` |
| `--output` | `-o` | Output CSV file path | `gmaps_results.csv` |
| `--delay` | `-d` | Scroll step delay in ms | `1200` |
| `--headed` | | Run browser with UI window visible | `headless` |

---

## 📁 Project Architecture

```
d:\Code\Scrapper\
├── src/
│   ├── scraper/
│   │   ├── gmapsScraper.js    # Playwright Google Maps extraction engine
│   │   └── csvExporter.js     # RFC 4180 CSV formatter with UTF-8 BOM
│   ├── server/
│   │   └── index.js           # Express API server & SSE real-time stream
│   ├── cli/
│   │   └── index.js           # Command Line Interface
│   └── (web components)       # React + Vite Glassmorphism Dashboard
├── package.json
└── vite.config.js
```

---

## 📄 License
MIT License.
