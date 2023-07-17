const fs = require('fs');
const puppeteer = require('puppeteer');
const cheerio = require('cheerio');
const ObjectsToCsv = require('objects-to-csv');

(async () => {
  try {
    // Launch Puppeteer and open a new page
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    // Navigate to the web page
    await page.goto('https://mustapp.com/@subhransu/want');

    // Scroll to the bottom of the page
    await autoScroll(page);

    // Get the HTML content of the whole page
    const html = await page.content();

    // Close the browser
    await browser.close();

    // Load the HTML into Cheerio
    const $ = cheerio.load(html);

    // Extract the poster__title values
    const titles = [];
    $('.poster__title').each((index, element) => {
      titles.push($(element).text());
    });

    // Prepare the data as an array of objects
    const data = titles.map((title) => ({ title }));

    // Convert the data to CSV
    const csv = new ObjectsToCsv(data);

    // Save the CSV file
    await csv.toDisk('titles.csv', { allColumns: true });
    console.log('CSV file saved successfully.');
  } catch (error) {
    console.error('Error:', error);
  }
})();

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
