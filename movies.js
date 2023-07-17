const fs = require('fs');
const cheerio = require('cheerio');
const ObjectsToCsv = require('objects-to-csv');


const list_type = 'wants'

// Read the HTML file
fs.readFile('input/movies_wants.html', 'utf8', (err, html) => {
  if (err) {
    console.error(err);
    return;
  }

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
  csv.toDisk(`${list_type}.csv`, { allColumns: true }).then(() => {
    console.log('CSV file saved successfully.');
  }).catch((error) => {
    console.error('Error saving CSV file:', error);
  });
});

