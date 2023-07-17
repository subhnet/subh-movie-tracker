const puppeteer = require('puppeteer');
const ObjectsToCsv = require('objects-to-csv');

(async () => {
  try {
    // Launch Puppeteer and open a new page
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    // Fetch the watched list
    const watchedUrl = 'https://mustapp.com/@subhransu/watched';
    await page.goto(watchedUrl);
    await autoScroll(page);
    const watchedHtml = await page.content();
    const watchedTitles = extractTitles(watchedHtml);

    // Fetch the wants list
    const wantsUrl = 'https://mustapp.com/@subhransu/wants';
    await page.goto(wantsUrl);
    await autoScroll(page);
    const wantsHtml = await page.content();
    const wantsTitles = extractTitles(wantsHtml);

    // Save watched titles to a file
    await saveTitlesToFile(watchedTitles, 'watched_titles.csv');

    // Save wants titles to a file
    await saveTitlesToFile(wantsTitles, 'wants_titles.csv');

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
  $('.poster__title').each((index, element) => {
    titles.push($(element).text());
  });
  return titles;
}

// Function to save titles to a file
async function saveTitlesToFile(titles, filename) {
  const data = titles.map((title) => ({ title }));
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