const puppeteer = require('puppeteer');
const ObjectsToCsv = require('objects-to-csv');

(async () => {
  try {
    // Launch Puppeteer and open a new page
    const browser = await puppeteer.launch(
      { headless: false }
    );
    const page = await browser.newPage();
    page.setDefaultNavigationTimeout(60000 * 3); // Set timeout to 60 seconds (60000 ms)

    // Fetch the watched list
    console.log('Fetching watched list...');
    const watchedUrl = 'https://mustapp.com/@subhransu/watched';
    await page.goto(watchedUrl, { timeout: 180000, waitUntil: 'networkidle2' });
    await autoScroll(page);
    const watchedHtml = await page.content();
    const watchedTitles = extractTitles(watchedHtml);
    console.log('Watched list fetched successfully.');
    // Save watched titles to a file
    console.log('Saving titles to files...');
    await saveTitlesToFile(watchedTitles, 'watched_titles.csv');

    // Fetch the wants list
    console.log('Fetching wants list...');
    const wantsUrl = 'https://mustapp.com/@subhransu/wants';
    await page.goto(wantsUrl, { timeout: 180000, waitUntil: 'networkidle2' });
    await autoScroll(page);
    const wantsHtml = await page.content();
    const wantsTitles = extractTitles(wantsHtml);
    console.log('Wants list fetched successfully.');
    // Save wants titles to a file
    console.log('Saving titles to files...');
    await saveTitlesToFile(wantsTitles, 'wants_titles.csv');

    // Fetch the wants list
    console.log('Fetching shows list...');
    const showsUrl = 'https://mustapp.com/@subhransu/shows';
    await page.goto(showsUrl, { timeout: 180000, waitUntil: 'networkidle2' });
    await autoScroll(page);
    const showsHtml = await page.content();
    const showsTitles = extractTitles(showsHtml);
    console.log('Shows list fetched successfully.');

    console.log('Saving titles to files...');
    // Save wants titles to a file
    await saveTitlesToFile(showsTitles, 'shows_titles.csv');




    console.log('Titles saved successfully.');

    // Close the browser
    await browser.close();
  } catch (error) {
    console.error('Error:', error);
  }
})();

// Function to extract the titles from the HTML
function extractTitles(html) {
  const cheerio = require('cheerio');
  const $ = cheerio.load(html);
  const titles = [];

  $('.poster').each((index, element) => {
    const title = $(element).find('.poster__title').text().trim();
    const rateStars = $(element).find('.poster__rate_stars').text().trim();

    titles.push({
      title,
      rateStars
    });
  });

  return titles;
}

// Function to save titles and ratings to a file
async function saveTitlesToFile(titlesAndRatings, filename) {
  // Map data to have title as first column and ratingStars as second column
  const data = titlesAndRatings.map(({ title, ratingStars }) => ({
    title,
    ratingStars: ratingStars || 'N/A' // Ensure 'N/A' if ratingStars is not available
  }));

  // Convert data to CSV
  const csv = new ObjectsToCsv(data);
  await csv.toDisk(filename, { allColumns: true });
}


// Function to scroll to the bottom of the page
async function autoScroll(page) {
  await page.evaluate(async () => {
    await new Promise((resolve) => {
      let totalHeight = 0;
      const distance = 100;
      const timer = setInterval(() => {
        const scrollHeight = document.body.scrollHeight;
        window.scrollBy(0, distance);
        totalHeight += distance;

        if (totalHeight >= scrollHeight) {
          clearInterval(timer);
          resolve();
        }
      }, 100);
    });
  });
}
