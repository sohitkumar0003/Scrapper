const fs = require('fs');
const path = require('path');
const { scrapeGoogleMaps } = require('../scraper/gmapsScraper');
const { convertToCSV } = require('../scraper/csvExporter');

function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    keywords: [],
    limit: 20,
    output: 'gmaps_results.csv',
    headless: true,
    delay: 1200
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--keywords' || arg === '-k') {
      options.keywords = args[i + 1] ? args[i + 1].split(',').map(s => s.trim()) : [];
      i++;
    } else if (arg === '--limit' || arg === '-l') {
      options.limit = parseInt(args[i + 1], 10) || 20;
      i++;
    } else if (arg === '--output' || arg === '-o') {
      options.output = args[i + 1] || 'gmaps_results.csv';
      i++;
    } else if (arg === '--headed') {
      options.headless = false;
    } else if (arg === '--delay' || arg === '-d') {
      options.delay = parseInt(args[i + 1], 10) || 1200;
      i++;
    } else if (arg === '--help' || arg === '-h') {
      console.log(`
Google Maps Scraper CLI

Options:
  -k, --keywords  Comma-separated search keywords (e.g. "Coffee in NYC,Dentists in LA")
  -l, --limit     Max results per keyword (default: 20)
  -o, --output    Output CSV file path (default: gmaps_results.csv)
  -d, --delay     Delay in ms between scroll steps (default: 1200)
      --headed    Run browser with visible UI window (default: headless)
  -h, --help      Display this help menu
      `);
      process.exit(0);
    }
  }

  return options;
}

async function runCLI() {
  const options = parseArgs();

  if (!options.keywords || options.keywords.length === 0) {
    console.log('\n❌ Please provide search keywords using --keywords "keyword1, keyword2"');
    console.log('Example: node src/cli/index.js --keywords "Dentists in Chicago" --limit 15 --output dentists.csv\n');
    process.exit(1);
  }

  console.log(`\n==============================================`);
  console.log(`📍 Google Maps CLI Scraper`);
  console.log(`Keywords: ${options.keywords.join(', ')}`);
  console.log(`Limit: ${options.limit} items/keyword`);
  console.log(`Output File: ${options.output}`);
  console.log(`==============================================\n`);

  const allResults = [];

  for (const keyword of options.keywords) {
    console.log(`\n▶ Scraping: "${keyword}"`);
    try {
      const places = await scrapeGoogleMaps({
        keyword,
        maxResults: options.limit,
        scrollDelay: options.delay,
        headless: options.headless,
        onProgress: (evt) => {
          if (evt.type === 'log') {
            console.log(`  [LOG] ${evt.message}`);
          } else if (evt.type === 'place') {
            console.log(`  ✓ (${evt.scrapedCount}/${evt.maxResults}) ${evt.place.title} | ${evt.place.rating ? evt.place.rating + '★' : 'No rating'} | ${evt.place.phone || 'No phone'}`);
          }
        }
      });
      allResults.push(...places);
    } catch (err) {
      console.error(`❌ Failed to scrape "${keyword}": ${err.message}`);
    }
  }

  console.log(`\n----------------------------------------------`);
  console.log(`🎉 Total places scraped: ${allResults.length}`);

  if (allResults.length > 0) {
    const csvData = convertToCSV(allResults);
    const outputPath = path.resolve(process.cwd(), options.output);
    fs.writeFileSync(outputPath, csvData, 'utf-8');
    console.log(`💾 Results saved to CSV: ${outputPath}`);
  } else {
    console.log(`⚠️ No results found to export.`);
  }

  console.log(`==============================================\n`);
}

if (require.main === module) {
  runCLI().catch(err => {
    console.error('Fatal CLI Error:', err);
    process.exit(1);
  });
}
