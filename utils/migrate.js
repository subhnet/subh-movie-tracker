/**
 * Migration utility to update existing CSV files to the new schema
 * This adds missing columns while preserving existing data
 */

const csv = require('csvtojson');
const ObjectsToCsv = require('objects-to-csv');
const fs = require('fs').promises;

async function migrateCSV(filename) {
  try {
    console.log(`\n📄 Migrating ${filename}...`);
    
    // Read existing data
    const data = await csv().fromFile(filename);
    
    if (!data || data.length === 0) {
      console.log(`   ⚠️  File is empty, skipping...`);
      return;
    }

    // Check if already migrated
    const firstRow = data[0];
    if (firstRow.hasOwnProperty('scrapedDate') && 
        firstRow.hasOwnProperty('watchedDate') && 
        firstRow.hasOwnProperty('notes') &&
        firstRow.hasOwnProperty('tags') &&
        firstRow.hasOwnProperty('rewatched')) {
      console.log(`   ✅ Already migrated, skipping...`);
      return;
    }

    const today = new Date().toISOString().split('T')[0];
    const listType = filename.includes('watched') ? 'watched' : 
                     filename.includes('wants') ? 'wants' : 'shows';

    // Migrate data to new schema
    const migratedData = data.map(row => {
      // Handle both 'rating' and 'rateStars' column names
      const rating = row.rating || row.rateStars || 'N/A';
      
      return {
        title: row.title || '',
        rating: rating,
        watchedDate: row.watchedDate || (listType === 'watched' ? today : ''),
        scrapedDate: row.scrapedDate || today,
        notes: row.notes || '',
        tags: row.tags || '',
        rewatched: row.rewatched || 'false'
      };
    });

    // Backup original file
    const backupFilename = filename.replace('.csv', '_backup_pre_migration.csv');
    await fs.copyFile(filename, backupFilename);
    console.log(`   💾 Backup created: ${backupFilename}`);

    // Write migrated data
    const csvWriter = new ObjectsToCsv(migratedData);
    await csvWriter.toDisk(filename, { allColumns: true });
    
    console.log(`   ✅ Successfully migrated ${migratedData.length} rows`);
    console.log(`   📊 New columns: watchedDate, scrapedDate, notes, tags, rewatched`);
    
  } catch (error) {
    console.error(`   ❌ Error migrating ${filename}:`, error.message);
    throw error;
  }
}

async function migrateAll() {
  console.log('🔄 Starting CSV migration...\n');
  console.log('This will add the following columns to your CSV files:');
  console.log('  - watchedDate: When you watched the item');
  console.log('  - scrapedDate: When the data was scraped');
  console.log('  - notes: Personal notes about the item');
  console.log('  - tags: Custom tags (semicolon-separated)');
  console.log('  - rewatched: Whether you\'ve rewatched it\n');
  
  const files = [
    'watched_titles.csv',
    'wants_titles.csv',
    'shows_titles.csv'
  ];

  for (const file of files) {
    try {
      await migrateCSV(file);
    } catch (error) {
      console.error(`Failed to migrate ${file}, continuing with others...`);
    }
  }

  console.log('\n✅ Migration complete!\n');
  console.log('You can now:');
  console.log('  - Add personal notes to any movie/show');
  console.log('  - Tag items with custom categories');
  console.log('  - Track when you watched items');
  console.log('  - Mark items as rewatched\n');
}

// Run migration if called directly
if (require.main === module) {
  migrateAll().catch(error => {
    console.error('Migration failed:', error);
    process.exit(1);
  });
}

module.exports = {
  migrateCSV,
  migrateAll
};

