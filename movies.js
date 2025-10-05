require('dotenv').config();
const puppeteer = require('puppeteer');
const ObjectsToCsv = require('objects-to-csv');
const fs = require('fs').promises;
const path = require('path');

// Configuration from environment variables
const CONFIG = {
  username: process.env.MUST_USERNAME || 'subhransu',
  pageTimeout: parseInt(process.env.PAGE_TIMEOUT) || 180000,
  navigationTimeout: parseInt(process.env.NAVIGATION_TIMEOUT) || 180000,
  scrollDistance: parseInt(process.env.SCROLL_DISTANCE) || 100,
  scrollDelay: parseInt(process.env.SCROLL_DELAY) || 100,
  fetchWatched: process.env.FETCH_WATCHED !== 'false',
  fetchWants: process.env.FETCH_WANTS !== 'false',
  fetchShows: process.env.FETCH_SHOWS !== 'false',
  generateStats: process.env.GENERATE_STATS !== 'false',
  generateHtmlReport: process.env.GENERATE_HTML_REPORT !== 'false',
  createBackup: process.env.CREATE_BACKUP !== 'false',
  backupDir: process.env.BACKUP_DIR || 'backups',
  maxRetries: 3,
  retryDelay: 5000
};

// Logger utility
const logger = {
  log: (message) => console.log(`[${new Date().toISOString()}] ℹ️  ${message}`),
  success: (message) => console.log(`[${new Date().toISOString()}] ✅ ${message}`),
  error: (message) => console.error(`[${new Date().toISOString()}] ❌ ${message}`),
  warn: (message) => console.warn(`[${new Date().toISOString()}] ⚠️  ${message}`)
};

// Main execution
(async () => {
  let browser;
  try {
    logger.log('Starting Movie Tracker...');
    logger.log(`Configuration: Username=${CONFIG.username}, Backup=${CONFIG.createBackup}`);

    // Create backup directory if needed
    if (CONFIG.createBackup) {
      await createBackupDirectory();
    }

    // Launch Puppeteer
    browser = await launchBrowser();
    const page = await browser.newPage();
    page.setDefaultNavigationTimeout(CONFIG.navigationTimeout);

    const results = {
      watched: null,
      wants: null,
      shows: null
    };

    // Fetch watched list
    if (CONFIG.fetchWatched) {
      results.watched = await fetchListWithRetry(
        page,
        'watched',
        `https://mustapp.com/@${CONFIG.username}/watched`,
        'watched_titles.csv'
      );
    }

    // Fetch wants list
    if (CONFIG.fetchWants) {
      results.wants = await fetchListWithRetry(
        page,
        'wants',
        `https://mustapp.com/@${CONFIG.username}/wants`,
        'wants_titles.csv'
      );
    }

    // Fetch shows list
    if (CONFIG.fetchShows) {
      results.shows = await fetchListWithRetry(
        page,
        'shows',
        `https://mustapp.com/@${CONFIG.username}/shows`,
        'shows_titles.csv'
      );
    }

    await browser.close();
    logger.success('All lists fetched successfully!');

    // Generate statistics
    if (CONFIG.generateStats) {
      logger.log('Generating statistics...');
      const { generateStatistics } = require('./utils/analytics');
      await generateStatistics();
      logger.success('Statistics generated!');
    }

    // Generate HTML report
    if (CONFIG.generateHtmlReport) {
      logger.log('Generating HTML report...');
      const { generateHtmlReport } = require('./utils/htmlReport');
      await generateHtmlReport();
      logger.success('HTML report generated!');
    }

    // Summary
    logger.log('\n📊 Summary:');
    if (results.watched) logger.log(`   Watched: ${results.watched.count} items`);
    if (results.wants) logger.log(`   Wants: ${results.wants.count} items`);
    if (results.shows) logger.log(`   Shows: ${results.shows.count} items`);

  } catch (error) {
    logger.error(`Fatal error: ${error.message}`);
    logger.error(error.stack);
    process.exit(1);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
})();

// Launch browser with retry logic
async function launchBrowser() {
  let lastError;
  for (let attempt = 1; attempt <= CONFIG.maxRetries; attempt++) {
    try {
      logger.log(`Launching browser (attempt ${attempt}/${CONFIG.maxRetries})...`);
      const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
      logger.success('Browser launched successfully');
      return browser;
    } catch (error) {
      lastError = error;
      logger.warn(`Browser launch failed: ${error.message}`);
      if (attempt < CONFIG.maxRetries) {
        logger.log(`Retrying in ${CONFIG.retryDelay / 1000} seconds...`);
        await sleep(CONFIG.retryDelay);
      }
    }
  }
  throw new Error(`Failed to launch browser after ${CONFIG.maxRetries} attempts: ${lastError.message}`);
}

// Fetch a list with retry logic
async function fetchListWithRetry(page, listName, url, filename) {
  let lastError;
  for (let attempt = 1; attempt <= CONFIG.maxRetries; attempt++) {
    try {
      logger.log(`Fetching ${listName} list (attempt ${attempt}/${CONFIG.maxRetries})...`);
      
      // Navigate to page
      await page.goto(url, { 
        timeout: CONFIG.pageTimeout, 
        waitUntil: 'networkidle2' 
      });
      
      // Auto-scroll to load all content
      await autoScroll(page);
      
      // Extract HTML and parse titles
      const html = await page.content();
      const titles = extractTitles(html);
      
      if (!titles || titles.length === 0) {
        throw new Error(`No titles extracted from ${listName} list`);
      }
      
      logger.success(`${listName} list fetched: ${titles.length} items found`);
      
      // Backup existing file if needed
      if (CONFIG.createBackup) {
        await backupFile(filename);
      }
      
      // Save to file with enhanced data
      await saveTitlesToFile(titles, filename, listName);
      logger.success(`${listName} list saved to ${filename}`);
      
      return { count: titles.length, titles };
      
    } catch (error) {
      lastError = error;
      logger.error(`Failed to fetch ${listName} list: ${error.message}`);
      
      if (attempt < CONFIG.maxRetries) {
        logger.log(`Retrying in ${CONFIG.retryDelay / 1000} seconds...`);
        await sleep(CONFIG.retryDelay);
      }
    }
  }
  
  throw new Error(`Failed to fetch ${listName} list after ${CONFIG.maxRetries} attempts: ${lastError.message}`);
}

// Extract titles and ratings from HTML
function extractTitles(html) {
  const cheerio = require('cheerio');
  const $ = cheerio.load(html);
  const titles = [];

  $('.poster').each((index, element) => {
    const title = $(element).find('.poster__title').text().trim();
    const rateStars = $(element).find('.poster__rate_stars').text().trim();

    if (title) {
      titles.push({
        title,
        rating: rateStars || 'N/A',
        scrapedDate: new Date().toISOString().split('T')[0], // YYYY-MM-DD format
        notes: '',
        tags: ''
      });
    }
  });

  return titles;
}

// Save titles to CSV file with enhanced schema
async function saveTitlesToFile(titlesData, filename, listType) {
  try {
    // Check if file exists to preserve additional data
    let existingData = {};
    try {
      const csv = require('csvtojson');
      const existingRows = await csv().fromFile(filename);
      // Create a map of existing data by title
      existingRows.forEach(row => {
        existingData[row.title] = {
          watchedDate: row.watchedDate || '',
          notes: row.notes || '',
          tags: row.tags || '',
          rewatched: row.rewatched || 'false'
        };
      });
      logger.log(`Found ${Object.keys(existingData).length} existing entries, preserving user data...`);
    } catch (err) {
      // File doesn't exist or is empty, that's okay
      logger.log(`No existing data found for ${filename}, creating new file...`);
    }

    // Merge new data with existing data
    const data = titlesData.map(({ title, rating, scrapedDate }) => {
      const existing = existingData[title] || {};
      return {
        title,
        rating: rating || 'N/A',
        watchedDate: existing.watchedDate || (listType === 'watched' ? scrapedDate : ''),
        scrapedDate,
        notes: existing.notes || '',
        tags: existing.tags || '',
        rewatched: existing.rewatched || 'false'
      };
    });

    // Save to CSV
    const csvWriter = new ObjectsToCsv(data);
    await csvWriter.toDisk(filename, { allColumns: true });
    
  } catch (error) {
    logger.error(`Error saving to ${filename}: ${error.message}`);
    throw error;
  }
}

// Auto-scroll to load all content
async function autoScroll(page) {
  logger.log('Auto-scrolling to load all content...');
  await page.evaluate(async (config) => {
    await new Promise((resolve) => {
      let totalHeight = 0;
      const distance = config.scrollDistance;
      const timer = setInterval(() => {
        const scrollHeight = document.body.scrollHeight;
        window.scrollBy(0, distance);
        totalHeight += distance;

        if (totalHeight >= scrollHeight) {
          clearInterval(timer);
          resolve();
        }
      }, config.scrollDelay);
    });
  }, { scrollDistance: CONFIG.scrollDistance, scrollDelay: CONFIG.scrollDelay });
  logger.success('Scrolling complete');
}

// Create backup directory
async function createBackupDirectory() {
  try {
    await fs.mkdir(CONFIG.backupDir, { recursive: true });
    logger.log(`Backup directory ready: ${CONFIG.backupDir}/`);
  } catch (error) {
    logger.warn(`Could not create backup directory: ${error.message}`);
  }
}

// Backup existing file
async function backupFile(filename) {
  try {
    // Check if file exists
    await fs.access(filename);
    
    // Create backup with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFilename = path.join(
      CONFIG.backupDir,
      `${path.basename(filename, '.csv')}_${timestamp}.csv`
    );
    
    await fs.copyFile(filename, backupFilename);
    logger.log(`Backed up ${filename} to ${backupFilename}`);
  } catch (error) {
    // File doesn't exist, no backup needed
    if (error.code !== 'ENOENT') {
      logger.warn(`Could not backup ${filename}: ${error.message}`);
    }
  }
}

// Sleep utility
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
