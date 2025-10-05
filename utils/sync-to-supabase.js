/**
 * Sync CSV data to Supabase database
 * - Reads CSV files
 * - Upserts to Supabase (no duplicates)
 * - Run by GitHub Action after fetching new titles
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs').promises;
const path = require('path');
const csv = require('csvtojson');

// Supabase configuration from environment variables
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY; // Service role key for admin access
const targetUsername = process.env.MUST_USERNAME || 'subhransu';

if (!supabaseUrl || !supabaseServiceKey) {
  console.log('⚠️  Supabase not configured. Skipping database sync.');
  console.log('   To enable: Add SUPABASE_URL and SUPABASE_SERVICE_KEY to GitHub Secrets');
  process.exit(0);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function readCSV(filename) {
  try {
    const filePath = path.join(process.cwd(), filename);
    const fileContent = await fs.readFile(filePath, 'utf-8');
    return await csv().fromString(fileContent);
  } catch (error) {
    console.error(`Error reading ${filename}:`, error.message);
    return [];
  }
}

async function getOrCreateUser(username) {
  // Check if user exists
  const { data: existingUsers, error: fetchError } = await supabase
    .from('users')
    .select('id, username')
    .eq('username', username)
    .limit(1);

  if (fetchError) {
    throw new Error(`Failed to fetch user: ${fetchError.message}`);
  }

  if (existingUsers && existingUsers.length > 0) {
    console.log(`✓ Found existing user: ${username} (${existingUsers[0].id})`);
    return existingUsers[0].id;
  }

  // Create user if doesn't exist (with a placeholder password)
  const bcrypt = require('bcryptjs');
  const placeholderPassword = await bcrypt.hash('change-me-' + Date.now(), 10);

  const { data: newUser, error: createError } = await supabase
    .from('users')
    .insert([
      {
        username,
        password_hash: placeholderPassword
      }
    ])
    .select()
    .single();

  if (createError) {
    throw new Error(`Failed to create user: ${createError.message}`);
  }

  console.log(`✓ Created new user: ${username} (${newUser.id})`);
  return newUser.id;
}

async function syncMovies(userId, movies, type) {
  if (movies.length === 0) {
    console.log(`  No ${type} movies to sync`);
    return { added: 0, updated: 0, skipped: 0 };
  }

  let added = 0;
  let updated = 0;
  let skipped = 0;

  for (const movie of movies) {
    try {
      const movieData = {
        user_id: userId,
        title: movie.Title || movie.title,
        rating: movie.Rating || movie.rating || '',
        tags: movie.Tags || movie.tags || '',
        type: type
      };

      // Check if movie already exists for this user
      const { data: existingMovies, error: fetchError } = await supabase
        .from('movies')
        .select('id, rating, tags')
        .eq('user_id', userId)
        .eq('title', movieData.title)
        .eq('type', type)
        .limit(1);

      if (fetchError) {
        console.error(`  ✗ Error checking ${movieData.title}:`, fetchError.message);
        continue;
      }

      if (existingMovies && existingMovies.length > 0) {
        // Movie exists - update if rating or tags changed
        const existing = existingMovies[0];
        if (existing.rating !== movieData.rating || existing.tags !== movieData.tags) {
          const { error: updateError } = await supabase
            .from('movies')
            .update({
              rating: movieData.rating,
              tags: movieData.tags
            })
            .eq('id', existing.id);

          if (updateError) {
            console.error(`  ✗ Error updating ${movieData.title}:`, updateError.message);
          } else {
            updated++;
          }
        } else {
          skipped++;
        }
      } else {
        // New movie - insert
        const { error: insertError } = await supabase
          .from('movies')
          .insert([movieData]);

        if (insertError) {
          console.error(`  ✗ Error inserting ${movieData.title}:`, insertError.message);
        } else {
          added++;
        }
      }
    } catch (error) {
      console.error(`  ✗ Error processing movie:`, error.message);
    }
  }

  return { added, updated, skipped };
}

async function main() {
  console.log('🔄 Starting CSV to Supabase sync...\n');
  console.log(`Target user: ${targetUsername}`);
  console.log(`Supabase URL: ${supabaseUrl}\n`);

  try {
    // Get or create user
    const userId = await getOrCreateUser(targetUsername);
    console.log('');

    // Read CSV files
    console.log('📂 Reading CSV files...');
    const [watched, wants, shows] = await Promise.all([
      readCSV('watched_titles.csv'),
      readCSV('wants_titles.csv'),
      readCSV('shows_titles.csv')
    ]);

    console.log(`  ✓ Watched: ${watched.length} movies`);
    console.log(`  ✓ Wants: ${wants.length} movies`);
    console.log(`  ✓ Shows: ${shows.length} shows\n`);

    // Sync each type
    console.log('💾 Syncing to database...');
    
    console.log('  Watched movies...');
    const watchedStats = await syncMovies(userId, watched, 'watched');
    console.log(`    Added: ${watchedStats.added}, Updated: ${watchedStats.updated}, Skipped: ${watchedStats.skipped}`);

    console.log('  Want to watch...');
    const wantsStats = await syncMovies(userId, wants, 'want');
    console.log(`    Added: ${wantsStats.added}, Updated: ${wantsStats.updated}, Skipped: ${wantsStats.skipped}`);

    console.log('  TV Shows...');
    const showsStats = await syncMovies(userId, shows, 'show');
    console.log(`    Added: ${showsStats.added}, Updated: ${showsStats.updated}, Skipped: ${showsStats.skipped}`);

    // Summary
    const totalAdded = watchedStats.added + wantsStats.added + showsStats.added;
    const totalUpdated = watchedStats.updated + wantsStats.updated + showsStats.updated;
    const totalSkipped = watchedStats.skipped + wantsStats.skipped + showsStats.skipped;

    console.log('\n✅ Sync complete!');
    console.log(`   Added: ${totalAdded} new movies`);
    console.log(`   Updated: ${totalUpdated} existing movies`);
    console.log(`   Skipped: ${totalSkipped} unchanged movies`);
    console.log(`   Total in database: ${totalAdded + totalUpdated + totalSkipped} movies\n`);

  } catch (error) {
    console.error('\n❌ Sync failed:', error.message);
    process.exit(1);
  }
}

// Run the sync
main();

